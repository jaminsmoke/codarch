import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Una versión por componente y una por formato (ADR 0065).
//
// `versions.json` es la fuente. De ahí salen el manifiesto que importa el
// código (`@codarch/versions`) y las versiones de los package.json. Sin
// argumentos, comprueba que todo cuadre; con argumentos, actualiza.
//
//   npm run version -- --cli 0.4.0        # solo el CLI
//   npm run version -- --desktop minor    # no: aquí van versiones exactas
//   npm run version -- 0.4.0              # todos los componentes
//   npm run version -- --schema 2.1       # el formato cc.json
//   npm run version -- --report 1.4       # el reporte
//   npm run version -- --config 2         # .codarch.yml
//   npm run version -- --history 2        # el índice del historial
//   npm run version -- --chains 3         # el libro mayor de cadenas

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSIONS_FILE = "versions.json";
const MANIFEST_FILE = "packages/versions/src/manifest.ts";
const LOCK_FILE = "package-lock.json";

/** Los componentes que se publican o se enseñan, cada uno con su versión. */
const COMPONENTS = {
  engine: {
    option: "--engine",
    label: "el motor",
    file: "package.json",
    lock: ""
  },
  cli: {
    option: "--cli",
    label: "el CLI",
    file: "apps/cli/package.json",
    lock: "apps/cli"
  },
  desktop: {
    option: "--desktop",
    label: "el escritorio",
    file: "apps/desktop/package.json",
    lock: "apps/desktop"
  },
  web: {
    option: "--web",
    label: "la web",
    file: "apps/web/package.json",
    lock: "apps/web"
  },
  mcp: {
    option: "--mcp",
    label: "el MCP",
    file: "apps/mcp/package.json",
    lock: "apps/mcp"
  },
  docker: {
    option: "--docker",
    label: "Docker",
    file: null,
    lock: null
  }
};

// Las carpetas con paquetes del repo. Los que no se publican no llevan versión
// propia: se quedan en `0.0.0` y la versión la pone su componente (ADR 0065).
const WORKSPACES = ["apps", "packages", "plugins"];

function paquetesSinVersionPropia() {
  const propios = new Set(
    Object.values(COMPONENTS)
      .map((component) => component.file)
      .filter((file) => file !== null)
  );
  const files = [];
  for (const folder of WORKSPACES) {
    let entries;
    try {
      entries = fs.readdirSync(path.join(ROOT, folder), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === "node_modules") continue;
      const file = `${folder}/${entry.name}/package.json`;
      if (!propios.has(file) && fs.existsSync(path.join(ROOT, file))) {
        files.push(file);
      }
    }
  }
  return files;
}

// Los mismos sitios dentro del lock: npm los exige, aunque sean derivados.
const LOCK_PACKAGES = ["", "apps/cli", "apps/desktop", "apps/mcp", "apps/web"];

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
  const lines = [
    "/**",
    " * Generado por `scripts/version.mjs` desde `versions.json`.",
    " * No editar a mano: `npm run version` lo reescribe.",
    " */",
    ""
  ];
  for (const key of Object.keys(COMPONENTS)) {
    lines.push(
      `export const ${key.toUpperCase()}_VERSION = ${JSON.stringify(versiones[key])} as const;`
    );
  }
  lines.push(
    `export const CC_JSON_VERSION = ${JSON.stringify(versiones.ccJson)} as const;`,
    `export const REPORT_SCHEMA_VERSION = ${JSON.stringify(versiones.report)} as const;`,
    `export const CONFIG_VERSION = ${JSON.stringify(versiones.config)} as const;`,
    `export const HISTORY_VERSION = ${JSON.stringify(versiones.history)} as const;`,
    `export const CHAIN_LEDGER_VERSION = ${JSON.stringify(versiones.chainLedger)} as const;`
  );
  return `${lines.join("\n")}\n`;
}

function validar(versiones) {
  for (const [key, component] of Object.entries(COMPONENTS)) {
    if (!PRODUCT.test(versiones[key])) {
      throw new Error(
        `${component.label} no es una versión semver: ${versiones[key]}`
      );
    }
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

  for (const [key, component] of Object.entries(COMPONENTS)) {
    if (!component.file) continue;
    const version = leer(component.file).version;
    if (version !== versiones[key]) {
      throw new Error(
        `${component.label} está en ${version ?? "(sin versión)"}, pero su versión es ${versiones[key]}`
      );
    }
  }

  for (const file of paquetesSinVersionPropia()) {
    const version = leer(file).version;
    if (version !== "0.0.0") {
      throw new Error(
        `${file} está en ${version ?? "(sin versión)"}; los paquetes que no se publican llevan 0.0.0`
      );
    }
  }

  const lock = leer(LOCK_FILE);
  if (lock.version !== versiones.engine) {
    throw new Error(
      `${LOCK_FILE} está en ${lock.version}, pero el motor está en ${versiones.engine}`
    );
  }
  for (const key of LOCK_PACKAGES) {
    const component =
      key === ""
        ? COMPONENTS.engine
        : Object.values(COMPONENTS).find((entry) => entry.lock === key);
    if (!component) continue;
    const version = lock.packages?.[key]?.version;
    if (version !== versiones[componentKey(component)]) {
      throw new Error(
        `${LOCK_FILE} (${key || "raíz"}) está en ${version ?? "(sin versión)"}, y le toca ${versiones[componentKey(component)]}`
      );
    }
  }

  for (const [key, component] of Object.entries(COMPONENTS)) {
    console.log(`  ${component.label.padEnd(16)} ${versiones[key]}`);
  }
  console.log(`  ${"cc.json".padEnd(16)} ${versiones.ccJson}`);
  console.log(`  ${"el reporte".padEnd(16)} ${versiones.report}`);
  console.log(`  ${".codarch.yml".padEnd(16)} ${versiones.config}`);
  console.log(`  ${"el historial".padEnd(16)} ${versiones.history}`);
  console.log(`  ${"las cadenas".padEnd(16)} ${versiones.chainLedger}`);
  console.log("ok · las versiones cuadran");
}

function componentKey(component) {
  return Object.keys(COMPONENTS).find(
    (key) => COMPONENTS[key] === component
  );
}

function leerArgumentos(args) {
  const cambios = {};
  let all = null;

  const siguiente = (indice, opcion) => {
    const valor = args[indice + 1];
    if (!valor || valor.startsWith("--")) {
      throw new Error(`${opcion} necesita un valor`);
    }
    return valor;
  };

  for (let indice = 0; indice < args.length; indice++) {
    const arg = args[indice];

    const componente = Object.entries(COMPONENTS).find(
      ([, regla]) => regla.option === arg
    );
    if (componente) {
      const [clave, regla] = componente;
      if (clave in cambios) {
        throw new Error(`${regla.label} está repetido`);
      }
      cambios[clave] = siguiente(indice, arg);
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
    if (all !== null) {
      throw new Error(`sobra un argumento: ${arg}`);
    }
    all = arg;
  }

  if (all !== null) {
    for (const key of Object.keys(COMPONENTS)) cambios[key] = all;
  }

  return cambios;
}

function actualizar(cambios) {
  const versiones = leer(VERSIONS_FILE);
  validar(versiones);

  if (Object.keys(cambios).length === 0) {
    throw new Error("no hay nada que actualizar");
  }

  for (const [campo, valor] of Object.entries(cambios)) {
    versiones[campo] = valor;
  }

  validar(versiones);
  escribir(VERSIONS_FILE, versiones);
  escribirTexto(MANIFEST_FILE, manifiesto(versiones));

  for (const [key, component] of Object.entries(COMPONENTS)) {
    if (!component.file || !(key in cambios)) continue;
    const datos = leer(component.file);
    datos.version = versiones[key];
    escribir(component.file, datos);
  }

  const lock = leer(LOCK_FILE);
  lock.version = versiones.engine;
  for (const key of LOCK_PACKAGES) {
    const component =
      key === ""
        ? COMPONENTS.engine
        : Object.values(COMPONENTS).find((entry) => entry.lock === key);
    if (!component || !lock.packages?.[key]) continue;
    lock.packages[key].version = versiones[componentKey(component)];
  }
  escribir(LOCK_FILE, lock);

  comprobar();
  console.log("ok · versiones actualizadas");
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
