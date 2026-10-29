import fs from "node:fs";
import path from "node:path";
import { ADDON_NAME } from "@codarch/metrics";
import {
  childDirectories,
  declareIn,
  declaredIn,
  findConfig,
  undeclareIn,
  type InstalledOptions
} from "./installed";
import { readManifest, type PluginManifest } from "../pluginManifest";

/**
 * Los plugins de un repo (ADR 0028 y ADR 0030).
 *
 * Un plugin es **código del repo**: vive en `plugins/<nombre>/`, se declara en
 * `.codarch.yml` (`plugins:`) y se compila en el build. Instalarlo es copiar la
 * carpeta y declararlo; quitarlo es borrar la carpeta hija y quitar el nombre,
 * nunca la carpeta contenedora. Activarlo es otra cosa y es de la máquina: lo
 * deciden los ajustes.
 *
 * El listado se lee en tres pasos: `readPlugins` recorre `plugins/` una vez, y
 * las dos salidas —JSON y texto— cuentan lo mismo sin volver a tocar el disco.
 */

export const PLUGINS_DIR = "plugins";

export type { PluginManifest } from "../pluginManifest";

/**
 * Un plugin de `plugins/`: el manifiesto ya leído, o el motivo por el que no
 * entra en el build. Se guardan en el orden de las carpetas, porque el listado
 * y el JSON enseñan ese mismo orden.
 */
type PluginEntry =
  | { name: string; declared: boolean; manifest: PluginManifest }
  | { name: string; declared: boolean; error: string };

/** Lo que hay en `plugins/` y lo que declara el repo. */
interface PluginListing {
  configFile: string | null;
  declared: string[];
  entries: PluginEntry[];
  missing: string[];
}

export function runPlugins(options: InstalledOptions): number {
  const root = path.resolve(options.root);

  if (options.action === "list") return listPlugins(root, options.json);

  if (!options.target) return missingTarget(options.action);

  return options.action === "add"
    ? addPlugin(root, options.target)
    : removePlugin(root, options.target);
}

/** El aviso de que falta el destino, con el ejemplo de cómo se escribe. */
function missingTarget(action: InstalledOptions["action"]): number {
  console.error(
    action === "add"
      ? "falta la ruta del plugin\n\n  codarch plugins add <ruta>"
      : "falta el nombre del plugin\n\n  codarch plugins remove <nombre>"
  );
  return 1;
}

/** Un plugin de la carpeta, ya leído y con lo que dice el `.codarch.yml`. */
function readEntry(
  dir: string,
  name: string,
  declared: readonly string[]
): PluginEntry {
  const isDeclared = declared.includes(name);
  const loaded = readManifest(dir, name);

  if (!loaded.ok) return { name, declared: isDeclared, error: loaded.message };
  if (loaded.manifest.name !== name) {
    return {
      name,
      declared: isDeclared,
      error: `la carpeta se llama ${name} y plugin.json dice ${loaded.manifest.name}: no entra en el build`
    };
  }
  return { name, declared: isDeclared, manifest: loaded.manifest };
}

/** Recorre `plugins/` y el `.codarch.yml`: lo leído y lo que falta. */
function readPlugins(root: string): PluginListing {
  const dir = path.join(root, PLUGINS_DIR);
  const declared = declaredIn(root, "plugins");
  const entries = childDirectories(dir).map((name) =>
    readEntry(path.join(dir, name), name, declared)
  );

  return {
    configFile: findConfig(root),
    declared,
    entries,
    missing: declared.filter(
      (name) => !entries.some((entry) => entry.name === name)
    )
  };
}

/** El código del listado: 1 si algo no entró en el build o si falta una carpeta. */
function listingCode(listing: PluginListing): number {
  const broken = listing.entries.some((entry) => "error" in entry);
  return broken || listing.missing.length > 0 ? 1 : 0;
}

function listPlugins(root: string, json: boolean): number {
  const listing = readPlugins(root);
  return json ? printPluginsJson(listing, root) : printPluginsText(listing);
}

/** Un plugin tal y como entra en el JSON, con sus claves en el orden de siempre. */
function entryJson(entry: PluginEntry): Record<string, unknown> {
  if ("error" in entry) {
    return { name: entry.name, error: entry.error, declared: entry.declared };
  }
  const { manifest } = entry;
  return {
    name: manifest.name,
    title: manifest.title,
    version: manifest.version,
    description: manifest.description ?? null,
    views: manifest.contributes.views,
    declared: entry.declared
  };
}

function printPluginsJson(listing: PluginListing, root: string): number {
  console.log(
    JSON.stringify(
      {
        dir: PLUGINS_DIR,
        config: listing.configFile
          ? path.relative(root, listing.configFile)
          : null,
        declared: listing.declared,
        plugins: listing.entries.map(entryJson),
        missing: listing.missing
      },
      null,
      2
    )
  );
  return listingCode(listing);
}

/** El listado en texto: cabecera, plugins, lo que falta y la nota del ADR. */
function printPluginsText(listing: PluginListing): number {
  console.log("");
  console.log("  CodArch · plugins");
  console.log("");

  if (listing.entries.length === 0 && listing.missing.length === 0) {
    console.log(`  No hay plugins en ${PLUGINS_DIR}/.`);
    console.log("");
    console.log("  Para instalar uno:");
    console.log("");
    console.log("    codarch plugins add <ruta>");
    console.log("");
    return 0;
  }

  for (const entry of listing.entries) printEntry(entry);
  for (const name of listing.missing) printMissing(name);

  console.log("  Los plugins son fuente del build de CodArch: no viajan con el");
  console.log("  proyecto que analizas (ADR 0030).");
  console.log("");

  return listingCode(listing);
}

/** Un plugin del listado, o el aviso de que no se pudo leer. */
function printEntry(entry: PluginEntry): void {
  if ("error" in entry) {
    console.log(`  ${entry.name} · no se pudo cargar`);
    console.log(`    ${entry.error}`);
    console.log("");
    return;
  }

  const { manifest } = entry;
  const mark = entry.declared ? "instalado" : "sin declarar";
  console.log(`  ${manifest.name} ${manifest.version} · ${manifest.title} — ${mark}`);
  if (manifest.description) console.log(`    ${manifest.description}`);
  for (const view of manifest.contributes.views) {
    console.log(`    vista ${view}`);
  }
  if (!entry.declared) {
    console.log("    no entra en el build; para instalarlo, decláralo en .codarch.yml:");
    console.log(`      plugins: [${manifest.name}]`);
  }
  console.log("");
}

function printMissing(name: string): void {
  console.log(`  ${name} · declarado pero falta la carpeta`);
  console.log("    no entra en el build: quítalo de .codarch.yml o vuelve a copiarlo.");
  console.log("");
}

function addPlugin(root: string, target: string): number {
  const source = path.resolve(root, target);
  const refused = checkSource(root, source);
  if (refused !== null) return refused;

  const loaded = readManifest(source, path.basename(source));
  if (!loaded.ok) {
    console.error(`plugin inválido: ${loaded.message}`);
    return 1;
  }

  const { manifest } = loaded;
  const dest = path.join(root, PLUGINS_DIR, manifest.name);
  if (fs.existsSync(dest)) {
    console.error(
      `${PLUGINS_DIR}/${manifest.name} ya existe. Quítalo antes con: codarch plugins remove ${manifest.name}`
    );
    return 1;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(source, dest, { recursive: true });

  const declared = declareIn(root, "plugins", manifest.name);
  if (!declared.ok) {
    console.error(declared.message);
    return 1;
  }

  printInstalled(manifest);
  return 0;
}

/** Lo que se puede copiar tiene que ser una carpeta; si no, el código del error. */
function checkSource(root: string, source: string): number | null {
  if (fs.existsSync(source) && fs.statSync(source).isDirectory()) return null;
  console.error(`no es una carpeta: ${displayPath(root, source)}`);
  return 1;
}

/** Lo que se acaba de instalar y el recordatorio de compilarlo y activarlo. */
function printInstalled(manifest: PluginManifest): void {
  console.log("");
  console.log(`  ${manifest.name} ${manifest.version} · ${manifest.title}`);
  for (const view of manifest.contributes.views) {
    console.log(`    vista ${view}`);
  }
  console.log("");
  console.log(
    `  Instalado en ${PLUGINS_DIR}/${manifest.name} y declarado en .codarch.yml.`
  );
  console.log(
    "  Es fuente del build de CodArch: compílalo para verlo y actívalo en los ajustes."
  );
  console.log("");
}

function removePlugin(root: string, name: string): number {
  if (!ADDON_NAME.test(name)) {
    console.error(`no es un nombre de plugin: ${name}`);
    return 1;
  }

  const dir = path.join(root, PLUGINS_DIR, name);
  if (!fs.existsSync(dir)) {
    console.error(`no existe ${PLUGINS_DIR}/${name}`);
    return 1;
  }

  fs.rmSync(dir, { recursive: true, force: true });

  const undeclared = undeclareIn(root, "plugins", name);
  if (!undeclared.ok) {
    console.error(undeclared.message);
    return 1;
  }

  console.log("");
  console.log(`  ${name} quitado de ${PLUGINS_DIR}/ y de .codarch.yml.`);
  console.log("  El próximo build de CodArch ya no lo incluye.");
  console.log("");
  return 0;
}

function displayPath(root: string, target: string): string {
  const relative = path.relative(root, target);
  return relative.startsWith("..") ? target : relative;
}
