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
 */

export function runAddons(options: InstalledOptions): number {
  const root = path.resolve(options.root);

  if (options.action === "list") return listAddons(root, options.json);

  if (!options.target) {
    console.error(
      options.action === "add"
        ? "falta la ruta del addon\n\n  codarch addons add <ruta>"
        : "falta el nombre del addon\n\n  codarch addons remove <nombre>"
    );
    return 1;
  }

  return options.action === "add"
    ? addAddon(root, options.target)
    : removeAddon(root, options.target);
}

function listAddons(root: string, json: boolean): number {
  const loaded = loadAddons(root);
  const configFile = findConfig(root);
  const declared = declaredIn(root, "addons");
  const missing = declared.filter(
    (name) => !fs.existsSync(path.join(root, ADDONS_DIR, name))
  );

  const groups = [
    ...loaded.addons.map((addon) => ({
      name: addon.manifest.name,
      title: addon.manifest.title,
      version: addon.manifest.version,
      description: addon.manifest.description ?? null,
      declared: declared.includes(addon.manifest.name),
      profiles: addon.profiles.map((profile) => profile.id),
      layers: addonLayers(addon).map((layer) => layer.name),
      rules: ruleConfigAddon(addon).rules.length,
      views: addon.views.map((view) => ({ id: view.id, title: view.title }))
    })),
    ...loaded.errors.map((error) => ({
      name: error.message.match(/^addons\/([^:]+)/)?.[1] ?? "?",
      error: error.message
    }))
  ];

  if (json) {
    console.log(
      JSON.stringify(
        {
          dir: ADDONS_DIR,
          config: configFile ? path.relative(root, configFile) : null,
          declared,
          addons: groups,
          missing
        },
        null,
        2
      )
    );
    return loaded.errors.length > 0 || missing.length > 0 ? 1 : 0;
  }

  console.log("");
  console.log("  CodArch · addons");
  console.log("");

  if (groups.length === 0 && missing.length === 0) {
    console.log(`  No hay addons en ${ADDONS_DIR}/.`);
    console.log("");
    console.log("  Para instalar uno:");
    console.log("");
    console.log("    codarch addons add <ruta>");
    console.log("");
    return 0;
  }

  for (const group of groups) {
    if ("error" in group) {
      console.log(`  ${group.name} · no se pudo cargar`);
      console.log(`    ${group.error}`);
      console.log("");
      continue;
    }

    const mark = group.declared ? "instalado" : "sin declarar";
    console.log(`  ${group.name} ${group.version} · ${group.title} — ${mark}`);
    if (group.description) console.log(`    ${group.description}`);
    const parts: string[] = [];
    if (group.profiles.length > 0) parts.push(`${group.profiles.length} perfil`);
    if (group.rules > 0) parts.push(`${group.rules} regla${group.rules === 1 ? "" : "s"}`);
    if (group.views.length > 0) parts.push(`${group.views.length} vista${group.views.length === 1 ? "" : "s"}`);
    if (parts.length > 0) console.log(`    ${parts.join(" · ")}`);
    if (group.layers.length > 0) {
      console.log(`    capas: ${group.layers.join(", ")}`);
    }
    for (const view of group.views) {
      console.log(`    vista ${view.id}: ${view.title}`);
    }
    if (!group.declared) {
      console.log("    no se aplica; para instalarlo, decláralo en .codarch.yml:");
      console.log(`      addons: [${group.name}]`);
    }
    console.log("");
  }

  for (const name of missing) {
    console.log(`  ${name} · declarado pero falta la carpeta`);
    console.log("    no se aplica: quítalo de .codarch.yml o vuelve a copiarlo.");
    console.log("");
  }

  if (declared.length === 0) {
    console.log("  Ninguno está instalado: no hay addons declarados en .codarch.yml.");
    console.log("");
  }

  return loaded.errors.length > 0 || missing.length > 0 ? 1 : 0;
}

function addAddon(root: string, target: string): number {
  const source = path.resolve(root, target);

  let addon: Addon;
  try {
    addon = loadAddon(source);
  } catch (error) {
    console.error(
      error instanceof AddonError
        ? `addon inválido: ${error.message}`
        : (error as Error).message
    );
    return 1;
  }

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

  console.log("");
  console.log(`  ${addon.manifest.name} ${addon.manifest.version} · ${addon.manifest.title}`);
  for (const profile of addon.profiles) {
    console.log(`    perfil ${profile.id}: ${profile.title}`);
  }
  const ruleCount = ruleConfigAddon(addon).rules.length;
  console.log(`    ${ruleCount} regla${ruleCount === 1 ? "" : "s"}`);
  for (const view of addon.views) {
    console.log(`    vista ${view.id}: ${view.title}`);
  }
  console.log("");
  console.log(`  Instalado en ${ADDONS_DIR}/${addon.manifest.name} y declarado en .codarch.yml.`);
  console.log("  Es un fichero del repo: commitéalo para que lo tengan los demás.");
  console.log("");
  return 0;
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

