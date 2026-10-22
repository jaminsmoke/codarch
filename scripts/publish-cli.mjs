import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Publica el CLI en npm con la etiqueta que le toca.
//
// Mientras el producto sea alpha ✓, la versión lleva prerelease ✓ y va a la
// etiqueta `next` ✓: `latest` se queda con la última versión normal ✓, para
// que nadie se instale un alpha sin querer ✓. Cuando haya versión estable ✓,
// la etiqueta vuelve a ser `latest` ✓ sin tocar nada ✓.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "apps", "cli", "dist");

const version = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
).version;

if (!fs.existsSync(path.join(DIST, "package.json"))) {
  console.error("no está el CLI empaquetado: npm run build:cli");
  process.exit(1);
}

const tag = version.includes("-") ? "next" : "latest";
console.log(`publicando codarch@${version} en la etiqueta ${tag}`);

const child = spawn(
  "npm",
  ["publish", "apps/cli/dist", "--access", "public", "--tag", tag],
  { cwd: ROOT, stdio: "inherit" }
);

child.on("exit", (code) => process.exit(code ?? 1));
