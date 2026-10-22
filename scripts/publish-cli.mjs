import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Publica el CLI en npm con la etiqueta que le toca.
//
// Mientras el producto sea alpha ✓, la versión lleva prerelease ✓ y va a la
// etiqueta `next` ✓: `latest` se queda con la última versión normal ✓, para
// que nadie se instale un alpha sin querer ✓. Cuando haya versión estable ✓,
// la etiqueta vuelve a ser `latest` ✓ sin tocar nada más ✓.
//
// Con `--dry-run` ✓ no sube nada ✓: hace lo mismo ✓ pero sin publicar ✓.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "apps", "cli", "dist");
const SECO = process.argv.includes("--dry-run");

const version = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
).version;

if (!fs.existsSync(path.join(DIST, "package.json"))) {
  console.error("no está el CLI empaquetado: npm run build:cli");
  process.exit(1);
}

const tag = version.includes("-") ? "next" : "latest";
const argumentos = [
  "publish",
  "apps/cli/dist",
  "--access",
  "public",
  "--tag",
  tag,
  ...(SECO ? ["--dry-run"] : [])
];

// En Windows `npm` es `npm.cmd` ✓: si se llama con `spawn` sin shell ✗ no se
// encuentra ✗. Cuando se ejecuta desde un script de npm ✓, `npm_execpath` ✓
// apunta al CLI de node ✓ y se usa ese ✓.
const npmCli = process.env.npm_execpath;
const comando = npmCli
  ? process.execPath
  : process.platform === "win32"
    ? "npm.cmd"
    : "npm";
const args = npmCli ? [npmCli, ...argumentos] : argumentos;

console.log(
  `publicando codarch@${version} en la etiqueta ${tag}${SECO ? " (ensayo: no se sube nada)" : ""}`
);

const hijo = spawn(comando, args, { cwd: ROOT, stdio: "inherit" });

hijo.on("error", (error) => {
  console.error(`no se pudo lanzar npm: ${error.message}`);
  process.exit(1);
});

hijo.on("exit", (code) => process.exit(code ?? 1));
