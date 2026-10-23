import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Una versión por componente, declarada una vez (ADR 0041).
//
// `versions.json` es la fuente. De ahí salen el manifiesto que importa el
// código (`@codarch/versions`) y las versiones de los package.json. Sin
// argumentos, comprueba que todo cuadre; con argumentos, actualiza.
//
//   npm run version -- 0.4.0-alpha.1      # la versión del producto
//   npm run version -- --schema 2.1       # el formato cc.json
//   npm run version -- --report 1.4       # el reporte
//   npm run version -- --config 2         # .codarch.yml
//   npm run version -- --history 2        # el índice del historial
//   npm run version -- --chains 3         # el libro mayor de cadenas

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSIONS_FILE = "versions.json";
const MANIFEST_FILE = "packages/versions/src/manifest.ts";
const LOCK_FILE = "package-lock.json";

const PACKAGES = [
  { file: "package.json", label: "el producto" },
  { file: "apps/cli/package.json", label: "el CLI" },
  { file: "apps/desktop/package.json", label: "el escritorio" },
  { file: "apps/mcp/package.json", label: "el MCP" }
];

// Los mismos sitios dentro del lock: npm los exige, aunque sean derivados.
const LOCK_PACKAGES = ["", "apps/cli", "apps/desktop", "apps/mcp"];

const PRODUCT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const FORMAT = /^\d+\.\d+$/;
const INTEGER = /^[1-9]\d*$/;

const FIELDS = {
  ccJson: { option: "--schema", label: "el formato cc.json", pattern: FORMAT },
  report: { option: "--report", label: "el reporte", pattern: FORMAT },
  config: { option: "--config", label: ".codarch.yml", pattern: INTEGER },
  history: { option: "--history", label: "el historial", pattern: INTEGER },
  chainLedger: { option: "--chains", label: "el libro de cadenas", pattern: INTEGER }
};

const leer = (relativo) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relativo), "utf8"));

const escribir = (relativo, datos) => {
  fs.writeFileSync(
    path.join(ROOT, relativo),
    `${JSON.stringify(datos, null, 2)}\n`,
    "utf8"
  );
};

const leerTexto = (relativo) =>
  fs.readFileSync(path.join(ROOT, relativo), "utf8");

const escribirTexto = (relativo, texto) => {
  fs.writeFileSync(path.join(ROOT, relativo), texto, "utf8");
};

/** El manifiesto que importa el código: mismas claves, nombres técnicos. */
function manifiesto(versiones) {
  return [
    "/**",
    " * Generado por `scripts/version.mjs` desde `versions.json`.",
    " * No editar a mano: `npm run version` lo reescribe.",
    " */",
    "",
    `export const PRODUCT_VERSION = ${JSON.stringify(versiones.product)} as const;`,
    `export const CC_JSON_VERSION = ${JSON.stringify(versiones.ccJson)} as const;`,
    `export const REPORT_SCHEMA_VERSION = ${JSON.stringify(versiones.report)} as const;`,
    `export const CONFIG_VERSION = ${JSON.stringify(versiones.config)} as const;`,
    `export const HISTORY_VERSION = ${JSON.stringify(versiones.history)} as const;`,
    `export const CHAIN_LEDGER_VERSION = ${JSON.stringify(versiones.chainLedger)} as const;`,
    ""
  ].join("\n");
}

function validar(versiones) {
  if (!PRODUCT.test(versiones.product)) {
    throw new Error(`la versión del producto no es semver: ${versiones.product}`);
  }
  for (const [campo, regla] of Object.entries(FIELDS)) {
    const valor = versiones[campo];
    const texto = String(valor);
    if (!regla.pattern.test(texto)) {
      throw new Error(`${regla.label} no es válido: ${texto}`);
    }
  }
}

function comprobar() {
  const versiones = leer(VERSIONS_FILE);
  validar(versiones);

  const esperado = manifiesto(versiones);
  if (leerTexto(MANIFEST_FILE) !== esperado) {
    throw new Error(
      `${MANIFEST_FILE} no coincide con ${VERSIONS_FILE}: ejecuta npm run version`
    );
  }

  for (const target of PACKAGES) {
    const version = leer(target.file).version;
    if (version !== versiones.product) {
      throw new Error(
        `${target.label} está en ${version ?? "(sin versión)"}, pero el producto está en ${versiones.product}`
      );
    }
  }

  const lock = leer(LOCK_FILE);
  if (lock.version !== versiones.product) {
    throw new Error(
      `${LOCK_FILE} está en ${lock.version}, pero el producto está en ${versiones.product}`
    );
  }
  for (const key of LOCK_PACKAGES) {
    const version = lock.packages?.[key]?.version;
    if (version !== versiones.product) {
      throw new Error(
        `${LOCK_FILE} (${key || "raíz"}) está en ${version ?? "(sin versión)"}, pero el producto está en ${versiones.product}`
      );
    }
  }

  console.log(`  ${"el producto".padEnd(16)} ${versiones.product}`);
  console.log(`  ${"cc.json".padEnd(16)} ${versiones.ccJson}`);
  console.log(`  ${"el reporte".padEnd(16)} ${versiones.report}`);
  console.log(`  ${".codarch.yml".padEnd(16)} ${versiones.config}`);
  console.log(`  ${"el historial".padEnd(16)} ${versiones.history}`);
  console.log(`  ${"las cadenas".padEnd(16)} ${versiones.chainLedger}`);
  console.log("ok · las versiones cuadran");
}

function leerArgumentos(args) {
  let product = null;
  const cambios = {};

  const siguiente = (indice, opcion) => {
    const valor = args[indice + 1];
    if (!valor || valor.startsWith("--")) {
      throw new Error(`${opcion} necesita un valor`);
    }
    return valor;
  };

  for (let indice = 0; indice < args.length; indice++) {
    const arg = args[indice];

    if (arg === "--product") {
      if (product !== null) throw new Error("la versión del producto está repetida");
      product = siguiente(indice, arg);
      indice++;
      continue;
    }

    const campo = Object.entries(FIELDS).find(
      ([, regla]) => regla.option === arg
    );
    if (campo) {
      const [clave, regla] = campo;
      if (clave in cambios) {
        throw new Error(`${regla.label} está repetido`);
      }
      const valor = siguiente(indice, arg);
      cambios[clave] = regla.pattern === INTEGER ? Number(valor) : valor;
      indice++;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`opción desconocida: ${arg}`);
    }
    if (product !== null) {
      throw new Error(`sobra un argumento: ${arg}`);
    }
    product = arg;
  }

  return { product, cambios };
}

function actualizar({ product, cambios }) {
  const versiones = leer(VERSIONS_FILE);
  validar(versiones);

  if (product === null && Object.keys(cambios).length === 0) {
    throw new Error("no hay nada que actualizar");
  }

  if (product !== null) {
    if (!PRODUCT.test(product)) {
      throw new Error(`no es una versión: ${product} (debe ser 1.2.3)`);
    }
    versiones.product = product;
  }

  for (const [campo, valor] of Object.entries(cambios)) {
    versiones[campo] = valor;
  }

  validar(versiones);
  escribir(VERSIONS_FILE, versiones);
  escribirTexto(MANIFEST_FILE, manifiesto(versiones));

  if (product !== null) {
    for (const target of PACKAGES) {
      const datos = leer(target.file);
      datos.version = product;
      escribir(target.file, datos);
    }

    const lock = leer(LOCK_FILE);
    lock.version = product;
    for (const key of LOCK_PACKAGES) {
      if (lock.packages?.[key]) lock.packages[key].version = product;
    }
    escribir(LOCK_FILE, lock);
  }

  comprobar();
  console.log(`ok · versiones actualizadas`);
}

try {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    comprobar();
  } else {
    actualizar(leerArgumentos(args));
  }
} catch (error) {
  console.error(
    `codarch version: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
}
