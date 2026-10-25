import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  impactedComponents,
  nextVersion,
  type ComponentName,
  type WorkspaceInfo
} from "../packages/versions/src/index.ts";

/**
 * El coordinador de la release automática (ADR 0065).
 *
 * Se lanza cuando CI termina en verde en `main`. Calcula qué componentes toca
 * el diff desde la última release, sube su parche en **un** commit y lanza los
 * workflows de cada canal.
 *
 * Un push con el `GITHUB_TOKEN` no dispara otros workflows: por eso los canales
 * se lanzan aquí, después del push.
 */

const ROOT = path.resolve(import.meta.dirname, "..");
const DRY = process.argv.includes("--dry-run");
const CHANNELS: Partial<Record<ComponentName, string>> = {
  cli: "publish-cli.yml",
  desktop: "desktop.yml",
  docker: "docker.yml"
};

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function readVersions(): Record<string, string> {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, "versions.json"), "utf8")
  ) as Record<string, string>;
}

/** Los workspaces de primer nivel, con sus dependencias internas. */
function loadWorkspaces(): WorkspaceInfo[] {
  const workspaces: WorkspaceInfo[] = [];
  for (const folder of ["packages", "apps"]) {
    const base = path.join(ROOT, folder);
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = path.join(base, entry.name, "package.json");
      if (!fs.existsSync(file)) continue;
      const pkg = JSON.parse(fs.readFileSync(file, "utf8")) as {
        name: string;
        dependencies?: Record<string, string>;
      };
      workspaces.push({
        name: pkg.name,
        directory: `${folder}/${entry.name}`,
        dependencies: Object.keys(pkg.dependencies ?? {}).filter((name) =>
          name.startsWith("@codarch/")
        )
      });
    }
  }
  return workspaces;
}

/** El último commit de release, o el primero del repo si no hay ninguno. */
function releaseBase(): string {
  const log = git(["log", "--format=%H%x00%s", "--max-count=200"]).split("\n");
  for (const line of log) {
    const [hash = "", subject = ""] = line.split("\0");
    if (/^chore: release |^chore\(release\):/.test(subject)) return hash;
  }
  return git(["rev-list", "--max-parents=0", "HEAD"]).split("\n").at(-1) ?? "";
}

function dispatch(workflow: string): void {
  if (DRY) {
    console.log(`  lanzaría ${workflow}`);
    return;
  }
  execFileSync(
    "gh",
    ["workflow", "run", workflow, "--ref", "main"],
    { cwd: ROOT, stdio: "inherit", env: process.env }
  );
}

function release(components: ComponentName[]): void {
  const versions = readVersions();
  const args: string[] = [];
  const summary: string[] = [];
  for (const component of components) {
    const next = nextVersion(versions[component] ?? "0.0.0", "patch");
    args.push(`--${component}`, next);
    summary.push(`${component} ${next}`);
  }

  if (DRY) {
    console.log(`  subiría ${summary.join(", ")}`);
  } else {
    execFileSync(
      process.execPath,
      [path.join(ROOT, "scripts", "version.mjs"), ...args],
      { cwd: ROOT, stdio: "inherit" }
    );
    git([
      "config",
      "user.name",
      process.env.GIT_AUTHOR_NAME ?? "github-actions[bot]"
    ]);
    git([
      "config",
      "user.email",
      process.env.GIT_AUTHOR_EMAIL ??
        "41898282+github-actions[bot]@users.noreply.github.com"
    ]);
    execFileSync(
      "git",
      [
        "add",
        "versions.json",
        "package.json",
        "package-lock.json",
        "packages/versions/src/manifest.ts",
        "apps/cli/package.json",
        "apps/desktop/package.json",
        "apps/web/package.json",
        "apps/mcp/package.json"
      ],
      { cwd: ROOT, stdio: "inherit" }
    );
    execFileSync(
      "git",
      ["commit", "-m", `chore(release): ${summary.join(", ")}`],
      { cwd: ROOT, stdio: "inherit" }
    );
    execFileSync("git", ["push", "origin", "HEAD:main"], {
      cwd: ROOT,
      stdio: "inherit"
    });
  }

  for (const component of components) {
    const workflow = CHANNELS[component];
    if (workflow) dispatch(workflow);
  }
}

function main(): void {
  const subject = git(["log", "-1", "--format=%s"]);

  // Un release manual ya lo empujó una persona: los workflows normales ya se
  // han disparado; solo falta el CLI, que no escucha pushes.
  if (/^chore: release /.test(subject)) {
    if (/\bcli \d/.test(subject)) dispatch("publish-cli.yml");
    console.log("ok · release manual; canales ya disparados");
    return;
  }
  // El commit automático no vuelve a pasar por CI: si llegara aquí, no hay
  // nada que hacer.
  if (/^chore\(release\):/.test(subject)) {
    console.log("ok · commit de release automático; sin cambios");
    return;
  }

  const base = releaseBase();
  const head = git(["rev-parse", "HEAD"]);
  if (!base || base === head) {
    console.log("ok · no hay cambios desde la última release");
    return;
  }

  const changed = git(["diff", "--name-only", `${base}..${head}`])
    .split("\n")
    .filter(Boolean);
  const impact = impactedComponents(changed, loadWorkspaces());
  if (impact.components.length === 0) {
    console.log(`ok · ${impact.relevant.length} ficheros, ningún componente afectado`);
    return;
  }

  console.log(
    `  ${impact.relevant.length} ficheros · ${impact.components.join(", ")}`
  );
  release(impact.components);
}

try {
  main();
} catch (error) {
  console.error(
    `codarch auto-release: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
}
