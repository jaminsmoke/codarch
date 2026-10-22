import fs from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";
import { ADDON_NAME } from "@codarch/metrics";
import {
  AddonError,
  addonLayers,
  ruleConfigAddon,
  type Addon
} from "@codarch/addons";
import { ADDONS_DIR, declaredAddons, loadAddon, loadAddons } from "@codarch/addons/node";

/**
 * Los addons de un repo (ADR 0029).
 *
 * Un addon es conocimiento declarativo — perfiles, reglas y vistas guardadas —
 * que vive en `addons/<nombre>/` y que el `.codarch.yml` declara. Instalarlo
 * es copiar una carpeta: no hay registro ni código que ejecutar.
 */

export interface AddonsOptions {
  action: "list" | "add" | "remove";
  /** La ruta a copiar (`add`) o el nombre a quitar (`remove`). */
  target?: string;
  /** El repo (por defecto, el directorio actual). */
  root: string;
  json: boolean;
}

export function runAddons(options: AddonsOptions): number {
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
  const declared = declaredAddons(root);

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
          addons: groups
        },
        null,
        2
      )
    );
    return loaded.errors.length > 0 ? 1 : 0;
  }

  console.log("");
  console.log("  CodArch · addons");
  console.log("");

  if (groups.length === 0) {
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

    const mark = group.declared ? "declarado" : "sin declarar";
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
      console.log("    para usarlo, decláralo en .codarch.yml:");
      console.log(`      addons: [${group.name}]`);
    }
    console.log("");
  }

  if (declared.length === 0) {
    console.log("  Ninguno está declarado en .codarch.yml: no afectan al análisis.");
    console.log("");
  }

  return loaded.errors.length > 0 ? 1 : 0;
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

  const declared = declare(root, addon.manifest.name);
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

  const config = findConfig(root);
  if (config) {
    const doc = readDocument(config);
    if (doc.ok) {
      const declared = declaredIn(doc.doc);
      if (declared.includes(name)) {
        doc.doc.set(
          "addons",
          declared.filter((entry) => entry !== name)
        );
        fs.writeFileSync(config, String(doc.doc), "utf8");
      }
    }
  }

  console.log("");
  console.log(`  ${name} quitado de ${ADDONS_DIR}/ y de .codarch.yml.`);
  console.log("");
  return 0;
}

/** Declara un addon en `.codarch.yml`, creando el archivo si no existe. */
function declare(
  root: string,
  name: string
): { ok: true } | { ok: false; message: string } {
  const config = findConfig(root);

  if (!config) {
    const file = path.join(root, ".codarch.yml");
    fs.writeFileSync(file, `version: 1\n\naddons:\n  - ${name}\n`, "utf8");
    return { ok: true };
  }

  const doc = readDocument(config);
  if (!doc.ok) return { ok: false, message: doc.message };

  const declared = declaredIn(doc.doc);
  if (!declared.includes(name)) {
    doc.doc.set("addons", [...declared, name]);
  }
  if (asRecord(doc.doc.toJS()).version === undefined) {
    doc.doc.set("version", 1);
  }

  fs.writeFileSync(config, String(doc.doc), "utf8");
  return { ok: true };
}

function findConfig(root: string): string | null {
  for (const file of [".codarch.yml", ".codarch.yaml"]) {
    const full = path.join(root, file);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

/** Los addons que declara un `.codarch.yml`, en orden. */
function declaredIn(doc: import("yaml").Document): string[] {
  return stringList(asRecord(doc.toJS()).addons);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function readDocument(
  file: string
): { ok: true; doc: import("yaml").Document } | { ok: false; message: string } {
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    return { ok: false, message: `no se pudo leer ${file}: ${(error as Error).message}` };
  }

  const doc = parseDocument(text);
  if (doc.errors.length > 0) {
    return {
      ok: false,
      message: `YAML inválido en ${file}: ${doc.errors[0]?.message ?? "error"}`
    };
  }
  return { ok: true, doc };
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}
