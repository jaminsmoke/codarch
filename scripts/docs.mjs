import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Abre la guía (docs/guideline/index.html) en el navegador del sistema.
// Es una página estática: no hace falta servidor ni red.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUIDE = path.join(ROOT, "docs", "guideline", "index.html");

if (!fs.existsSync(GUIDE)) {
  console.error(`no está la guía: ${path.relative(ROOT, GUIDE)}`);
  process.exit(1);
}

const url = `file:///${GUIDE.split(path.sep).join("/")}`;

const [command, args] =
  process.platform === "win32"
    ? ["cmd", ["/c", "start", "", url]]
    : process.platform === "darwin"
      ? ["open", [url]]
      : ["xdg-open", [url]];

try {
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.unref();
} catch {
  // Si el navegador no se puede abrir, al menos se dice dónde está.
}

console.log(`ok · guía abierta en ${url}`);
console.log(`   (si no se abrió: ábrela a mano desde ${path.relative(ROOT, GUIDE)})`);
