import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Actualiza el pin de la acción al CLI que se acaba de publicar (ADR 0041).
 *
 * La acción instala una versión **publicada** de npm. El pin se mueve después
 * de publicar, nunca antes: si npm falla, la acción no puede apuntar a una
 * versión que no existe.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ACTION = path.join(ROOT, "apps", "github-action", "action.yml");
const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("uso: node scripts/pin-action.mjs <versión>");
  process.exit(1);
}

const text = fs.readFileSync(ACTION, "utf8");
const pattern =
  /(\n  version:\n(?:[ \t]+.*\n)*?[ \t]+default: ")[^"]+(")/;
if (!pattern.test(text)) {
  console.error("no encontré el input version en action.yml");
  process.exit(1);
}

const updated = text.replace(pattern, `$1${version}$2`);
if (updated === text) {
  console.log(`ok · la acción ya instala codarch@${version}`);
} else {
  fs.writeFileSync(ACTION, updated, "utf8");
  console.log(`ok · la acción instala codarch@${version}`);
}
