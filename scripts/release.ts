import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  nextVersion,
  type ReleaseKind
} from "../packages/versions/src/index.ts";

/**
 * Sube la versión de uno o varios componentes (ADR 0065).
 *
 *   npm run release                          # todos, parche
 *   npm run release -- --cli                 # solo el CLI, parche
 *   npm run release -- --cli minor           # solo el CLI, menor
 *   npm run release -- --desktop major       # solo el escritorio, mayor
 *   npm run release -- --web 0.4.0           # una versión exacta
 *   npm run release -- --dry-run             # dice qué haría y no toca nada
 *
 * El push lo ve CI; después, el coordinador publica solo los canales
 * afectados. El CLI ya no se publica desde aquí.
 */
const ROOT = path.resolve(import.meta.dirname, "..");
const EXACT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const KINDS: ReleaseKind[] = ["patch", "minor", "major"];
const COMPONENTS = ["engine", "cli", "desktop", "web", "mcp", "docker"] as const;
type Component = (typeof COMPONENTS)[number];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const noPush = args.includes("--no-push");
const requested: string[] = [];
const selected = new Set<Component>();

for (const arg of args) {
  if (arg.startsWith("--")) {
    if (arg === "--dry-run" || arg === "--no-push") continue;
    const name = arg.slice(2);
    if (!COMPONENTS.includes(name as Component)) {
      fail(`no entiendo ${arg}: usa ${COMPONENTS.map((item) => `--${item}`).join(", ")}`);
    }
    selected.add(name as Component);
    continue;
  }
  requested.push(arg);
}

if (requested.length > 1) {
  fail(`sobra un argumento: ${requested.slice(1).join(" ")}`);
}
if (selected.size === 0) {
  for (const component of COMPONENTS) selected.add(component);
}

// La app web viaja dentro del paquete del CLI: subir la web sin el CLI
// dejaría la versión nueva sin publicar (ADR 0065).
if (selected.has("web")) selected.add("cli");

const wanted = requested[0] ?? "patch";
const exact = EXACT.test(wanted);
if (!exact && !KINDS.includes(wanted as ReleaseKind)) {
  fail(`no entiendo «${wanted}»: usa patch, minor, major o una versión 1.2.3`);
}

const versions = leer("versions.json") as Record<string, string | number>;
const plan: Array<{ component: Component; from: string; to: string }> = [];
for (const component of selected) {
  const current = String(versions[component]);
  const next = exact
    ? wanted
    : nextVersion(current, wanted as ReleaseKind);
  plan.push({ component, from: current, to: next });
}

if (dryRun) {
  for (const entry of plan) {
    console.log(`  ${entry.component.padEnd(8)} ${entry.from} → ${entry.to}`);
  }
  console.log("ok · plan calculado (sin tocar nada)");
  process.exit(0);
}

if (git(["rev-parse", "--abbrev-ref", "HEAD"]).trim() !== "main") {
  fail("las releases salen de main: cambia de rama antes de subir la versión");
}
if (git(["status", "--porcelain"]).trim() !== "") {
  fail("hay cambios sin commitear; hazlos entrar antes de subir la versión");
}

const versionArgs = plan.flatMap((entry) => [`--${entry.component}`, entry.to]);
execFileSync(process.execPath, [path.join(ROOT, "scripts", "version.mjs"), ...versionArgs], {
  cwd: ROOT,
  stdio: "inherit"
});

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

const summary = plan
  .map((entry) => `${entry.component} ${entry.to}`)
  .join(", ");
execFileSync("git", ["commit", "-m", `chore: release ${summary}`], {
  cwd: ROOT,
  stdio: "inherit"
});
if (!noPush) {
  execFileSync("git", ["push"], { cwd: ROOT, stdio: "inherit" });
}

console.log(
  `ok · ${summary} ${noPush ? "commiteada; haz push para publicarla" : "publicada (el coordinador decide los canales)"}`
);

function leer(relativo: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativo), "utf8"));
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function fail(message: string): never {
  console.error(`codarch release: ${message}`);
  process.exit(1);
}
