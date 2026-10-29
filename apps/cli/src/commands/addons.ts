import fs from "node:fs";
import path from "node:path";
import { ADDON_NAME } from "@codarch/metrics";
import {
  AddonError,
  addonLayers,
  ruleConfigAddon,
  type Addon
} from "@codarch/addons";
import { ADDONS_DIR, loadAddon, loadAddons } from "@codarch/addons/node";
import {
  declareIn,
  declaredIn,
  findConfig,
  undeclareIn,
  type InstalledOptions
} from "./installed";

/**
 * Los addons de un repo (ADR 0029 y ADR 0030).
 *
 * Un addon es conocimiento declarativo — perfiles, reglas y vistas guardadas —
 * que vive en `addons/<nombre>/` y que el `.codarch.yml` declara. Instalarlo
 * es copiar una carpeta: no hay registro ni código que ejecutar. Quitarlo es
 * borrar la carpeta hija y quitar el nombre, nunca la carpeta contenedora.
 *
 * El listado se lee en tres pasos: `readAddons` junta lo que hay en disco, y
 * las dos salidas —JSON y texto— lo cuentan cada una a su manera sin volver a
 * tocar el disco.
 */

/** Lo que el listado sabe de un addon que cargó. Es también su forma en JSON. */
interface AddonSummary {
  name: string;
  title: string;
  version: string;
  description: string | null;
  declared: boolean;
  profiles: string[];
  layers: string[];
  rules: number;
  views: Array<{ id: string; title: string }>;
}

/** Un addon que no se pudo cargar; se enseña, no se calla. */
interface BrokenAddon {
  name: string;
  error: string;
}

/** Todo lo que hay en `addons/` y lo que declara el repo. */
interface AddonListing {
  configFile: string | null;
  declared: string[];
  loaded: AddonSummary[];
  broken: BrokenAddon[];
  missing: string[];
}

export function runAddons(options: InstalledOptions): number {
  const root = path.resolve(options.root);

  if (options.action === "list") return listAddons(root, options.json);

  if (!options.target) return missingTarget(options.action);

  return options.action === "add"
    ? addAddon(root, options.target)
    : removeAddon(root, options.target);
}

/** El aviso de que falta el destino, con el ejemplo de cómo se escribe. */
function missingTarget(action: InstalledOptions["action"]): number {
  console.error(
    action === "add"
      ? "falta la ruta del addon\n\n  codarch addons add <ruta>"
      : "falta el nombre del addon\n\n  codarch addons remove <nombre>"
  );
  return 1;
}

/** Lo que un addon aporta, tal y como entra en el listado. */
function summarize(addon: Addon, declared: readonly string[]): AddonSummary {
  return {
    name: addon.manifest.name,
    title: addon.manifest.title,
    version: addon.manifest.version,
    description: addon.manifest.description ?? null,
    declared: declared.includes(addon.manifest.name),
    profiles: addon.profiles.map((profile) => profile.id),
    layers: addonLayers(addon).map((layer) => layer.name),
    rules: ruleConfigAddon(addon).rules.length,
    views: addon.views.map((view) => ({ id: view.id, title: view.title }))
  };
}

/** El nombre del addon que falló, tal y como lo dice el cargador. */
function brokenName(error: AddonError): string {
  return error.message.match(/^addons\/([^:]+)/)?.[1] ?? "?";
}

/** Lee `addons/` y el `.codarch.yml`: lo cargado, lo roto y lo que falta. */
function readAddons(root: string): AddonListing {
  const loaded = loadAddons(root);
  const declared = declaredIn(root, "addons");
  const missing = declared.filter(
    (name) => !fs.existsSync(path.join(root, ADDONS_DIR, name))
  );

  return {
    configFile: findConfig(root),
    declared,
    loaded: loaded.addons.map((addon) => summarize(addon, declared)),
    broken: loaded.errors.map((error) => ({
      name: brokenName(error),
      error: error.message
    })),
    missing
  };
}

/** El código del listado: 1 si algo no cargó o si falta una carpeta declarada. */
function listingCode(listing: AddonListing): number {
  return listing.broken.length > 0 || listing.missing.length > 0 ? 1 : 0;
}

function listAddons(root: string, json: boolean): number {
  const listing = readAddons(root);
  return json ? printListingJson(listing, root) : printListing(listing);
}

/** La salida machine-readable: los mismos campos, en el mismo orden. */
function printListingJson(listing: AddonListing, root: string): number {
  console.log(
    JSON.stringify(
      {
        dir: ADDONS_DIR,
        config: listing.configFile
          ? path.relative(root, listing.configFile)
          : null,
        declared: listing.declared,
        addons: [...listing.loaded, ...listing.broken],
        missing: listing.missing
      },
      null,
      2
    )
  );
  return listingCode(listing);
}

/** El listado en texto: cabecera, addons, lo que falta y la nota final. */
function printListing(listing: AddonListing): number {
  console.log("");
  console.log("  CodArch · addons");
  console.log("");

  const empty =
    listing.loaded.length === 0 &&
    listing.broken.length === 0 &&
    listing.missing.length === 0;
  if (empty) {
    console.log(`  No hay addons en ${ADDONS_DIR}/.`);
    console.log("");
    console.log("  Para instalar uno:");
    console.log("");
    console.log("    codarch addons add <ruta>");
    console.log("");
    return 0;
  }

  for (const addon of listing.loaded) printAddon(addon);
  for (const broken of listing.broken) printBroken(broken);
  for (const name of listing.missing) printMissing(name);

  if (listing.declared.length === 0) {
    console.log(
      "  Ninguno está instalado: no hay addons declarados en .codarch.yml."
    );
    console.log("");
  }

  return listingCode(listing);
}

/** Un addon cargado: qué es, cuánto aporta y si el repo lo declara. */
function printAddon(addon: AddonSummary): void {
  const mark = addon.declared ? "instalado" : "sin declarar";
  console.log(`  ${addon.name} ${addon.version} · ${addon.title} — ${mark}`);
  if (addon.description) console.log(`    ${addon.description}`);

  const parts = partsFor(addon);
  if (parts.length > 0) console.log(`    ${parts.join(" · ")}`);
  if (addon.layers.length > 0) {
    console.log(`    capas: ${addon.layers.join(", ")}`);
  }
  for (const view of addon.views) {
    console.log(`    vista ${view.id}: ${view.title}`);
  }
  if (!addon.declared) printUndeclared(addon.name);
  console.log("");
}

/** «1 perfil · 2 reglas · 1 vista», en singular y plural. */
function partsFor(addon: AddonSummary): string[] {
  const parts: string[] = [];
  if (addon.profiles.length > 0) {
    parts.push(`${addon.profiles.length} perfil`);
  }
  if (addon.rules > 0) {
    parts.push(`${addon.rules} regla${addon.rules === 1 ? "" : "s"}`);
  }
  if (addon.views.length > 0) {
    parts.push(`${addon.views.length} vista${addon.views.length === 1 ? "" : "s"}`);
  }
  return parts;
}

function printBroken(broken: BrokenAddon): void {
  console.log(`  ${broken.name} · no se pudo cargar`);
  console.log(`    ${broken.error}`);
  console.log("");
}

function printMissing(name: string): void {
  console.log(`  ${name} · declarado pero falta la carpeta`);
  console.log("    no se aplica: quítalo de .codarch.yml o vuelve a copiarlo.");
  console.log("");
}

/** Lo que hay que escribir para que un addon suelto entre en el análisis. */
function printUndeclared(name: string): void {
  console.log("    no se aplica; para instalarlo, decláralo en .codarch.yml:");
  console.log(`      addons: [${name}]`);
}

function addAddon(root: string, target: string): number {
  const source = path.resolve(root, target);
  const addon = readAddon(source);
  if (typeof addon === "number") return addon;

  const dest = path.join(root, ADDONS_DIR, addon.manifest.name);
  if (fs.existsSync(dest)) {
    console.error(
      `${ADDONS_DIR}/${addon.manifest.name} ya existe. Quítalo antes con: codarch addons remove ${addon.manifest.name}`
    );
    return 1;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(source, dest, { recursive: true });

  const declared = declareIn(root, "addons", addon.manifest.name);
  if (!declared.ok) {
    console.error(declared.message);
    return 1;
  }

  printInstalled(addon);
  return 0;
}

/** Lee el addon que se va a instalar, o devuelve el código del error. */
function readAddon(source: string): Addon | number {
  try {
    return loadAddon(source);
  } catch (error) {
    console.error(
      error instanceof AddonError
        ? `addon inválido: ${error.message}`
        : (error as Error).message
    );
    return 1;
  }
}

/** Lo que se acaba de instalar, con lo que aporta y el recordatorio de commitear. */
function printInstalled(addon: Addon): void {
  console.log("");
  console.log(
    `  ${addon.manifest.name} ${addon.manifest.version} · ${addon.manifest.title}`
  );
  for (const profile of addon.profiles) {
    console.log(`    perfil ${profile.id}: ${profile.title}`);
  }
  const ruleCount = ruleConfigAddon(addon).rules.length;
  console.log(`    ${ruleCount} regla${ruleCount === 1 ? "" : "s"}`);
  for (const view of addon.views) {
    console.log(`    vista ${view.id}: ${view.title}`);
  }
  console.log("");
  console.log(
    `  Instalado en ${ADDONS_DIR}/${addon.manifest.name} y declarado en .codarch.yml.`
  );
  console.log("  Es un fichero del repo: commitéalo para que lo tengan los demás.");
  console.log("");
}

function removeAddon(root: string, name: string): number {
  if (!ADDON_NAME.test(name)) {
    console.error(`no es un nombre de addon: ${name}`);
    return 1;
  }

  const dir = path.join(root, ADDONS_DIR, name);
  if (!fs.existsSync(dir)) {
    console.error(`no existe ${ADDONS_DIR}/${name}`);
    return 1;
  }

  fs.rmSync(dir, { recursive: true, force: true });

  const undeclared = undeclareIn(root, "addons", name);
  if (!undeclared.ok) {
    console.error(undeclared.message);
    return 1;
  }

  console.log("");
  console.log(`  ${name} quitado de ${ADDONS_DIR}/ y de .codarch.yml.`);
  console.log("");
  return 0;
}
