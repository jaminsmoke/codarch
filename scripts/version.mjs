import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Una versión para el producto (ADR 0032).
//
// La versión vive en el package.json de la raíz y de ahí sale para el CLI y
// para la app de escritorio. Sin argumentos, comprueba que cuadren; con uno,
// las escribe en los tres sitios.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TARGETS = [
  { file: "package.json", label: "el producto" },
  { file: "apps/cli/package.json", label: "el CLI" },
  { file: "apps/desktop/package.json", label: "el escritorio" }
];

const leer = (relativo) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relativo), "utf8"));

const escribir = (relativo, datos) => {
  fs.writeFileSync(
    path.join(ROOT, relativo),
    `${JSON.stringify(datos, null, 2)}\n`,
    "utf8"
  );
};

const nuevo = process.argv[2];

if (!nuevo) {
  const versiones = TARGETS.map((target) => ({
    ...target,
    version: leer(target.file).version ?? "(sin versión)"
  }));

  for (const version of versiones) {
    console.log(`  ${version.label.padEnd(14)} ${version.version}`);
  }

  const distintas = new Set(versiones.map((version) => version.version));
  if (distintas.size > 1) {
    console.error(
      "las versiones no cuadran: manda la del producto (npm run version -- <x>)"
    );
    process.exit(1);
  }

  console.log("ok · las versiones cuadran");
} else {
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(nuevo)) {
    console.error(`no es una versión: ${nuevo} (debe ser 1.2.3)`);
    process.exit(1);
  }

  for (const target of TARGETS) {
    const datos = leer(target.file);
    datos.version = nuevo;
    escribir(target.file, datos);
  }

  console.log(`ok · versión ${nuevo} en el producto, el CLI y el escritorio`);
}
