import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

/**
 * Deja el binario de Electron descargado.
 *
 * Electron 45 ya no trae script de instalación: su binario se baja la primera
 * vez que se usa el CLI. Eso deja al usuario con un paso extra justo cuando
 * quiere abrir la app, así que el postinstall del workspace lo adelanta.
 *
 * El download está en la caché de Electron, así que repetirlo no cuesta nada.
 */

const require = createRequire(import.meta.url);

let manifest;
try {
  manifest = require.resolve("electron/package.json");
} catch {
  console.log("aviso · electron no está instalado; se omite");
  process.exit(0);
}

const directory = path.dirname(manifest);
if (existsSync(path.join(directory, "path.txt"))) {
  console.log("ok · el binario de electron ya está descargado");
  process.exit(0);
}

console.log("… descargando el binario de electron");
execFileSync(process.execPath, [path.join(directory, "install.js")], {
  stdio: "inherit"
});
console.log("ok · binario de electron listo");
