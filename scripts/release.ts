import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  nextProductVersion,
  type ReleaseKind
} from "../packages/versions/src/release.ts";

/**
 * Sube la versión del producto y prepara la release.
 *
 *   npm run release                 # parche: 0.3.2 → 0.3.3
 *   npm run release -- minor        # menor:  0.3.2 → 0.4.0
 *   npm run release -- major        # mayor:  0.3.2 → 1.0.0
 *   npm run release -- 0.4.0-beta.1 # una versión exacta
 *   npm run release -- --dry-run    # dice la siguiente sin tocar nada
 *
 * El push lo ve el workflow del escritorio, que publica la release. El CLI se
 * publica aparte con `npm run publish:cli` (necesita OTP). Los formatos
 * (`cc.json`, reporte, config, historial, cadenas) no se suben solos: son
 * contratos y los decide una persona (ADR 0051).
 */
const ROOT = path.resolve(import.meta.dirname, "..");
const EXACT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const KINDS: ReleaseKind[] = ["patch", "minor", "major"];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const noPush = args.includes("--no-push");
const requested = args.filter((arg) => !arg.startsWith("--"));

if (requested.length > 1) {
  fail(`sobra un argumento: ${requested.slice(1).join(" ")}`);
}

const wanted = requested[0] ?? "patch";
const exact = EXACT.test(wanted);
if (!exact && !KINDS.includes(wanted as ReleaseKind)) {
  fail(`no entiendo «${wanted}»: usa patch, minor, major o una versión 1.2.3`);
}

const versions = leer("versions.json");
const current = versions.product as string;
const next = exact
  ? wanted
  : nextProductVersion(current, wanted as ReleaseKind);

if (next === current) {
  fail(`la versión ya es ${current}; no hay nada que subir`);
}

if (dryRun) {
  console.log(`  ${current} → ${next} (sin tocar nada)`);
  console.log("ok · versión calculada");
  process.exit(0);
}

if (git(["rev-parse", "--abbrev-ref", "HEAD"]).trim() !== "main") {
  fail("las releases salen de main: cambia de rama antes de subir la versión");
}
if (git(["status", "--porcelain"]).trim() !== "") {
  fail("hay cambios sin commitear; hazlos entrar antes de subir la versión");
}

// `scripts/version.mjs` propaga la versión a los paquetes y al lock.
execFileSync(process.execPath, [path.join(ROOT, "scripts", "version.mjs"), next], {
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
    "apps/mcp/package.json",
    "apps/web/package.json"
  ],
  { cwd: ROOT, stdio: "inherit" }
);
execFileSync("git", ["commit", "-m", `chore: release ${next}`], {
  cwd: ROOT,
  stdio: "inherit"
});
if (!noPush) {
  execFileSync("git", ["push"], { cwd: ROOT, stdio: "inherit" });
}

console.log(`ok · ${next} ${noPush ? "commiteada; haz push para publicarla" : "publicada (el workflow del escritorio la coge de aquí)"}`);
console.log(
  "   el CLI sigue aparte: npm run publish:cli (necesita OTP); los formatos se suben a mano"
);

function leer(relativo: string): Record<string, unknown> {
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
