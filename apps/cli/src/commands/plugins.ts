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

/**
 * Los plugins de un repo (ADR 0028 y ADR 0030).
 *
 * Un plugin es **código del repo**: vive en `plugins/<nombre>/`, se declara en
 * `.codarch.yml` (`plugins:`) y se compila en el build. Instalarlo es copiar la
 * carpeta y declararlo; quitarlo es borrar la carpeta hija y quitar el nombre,
 * nunca la carpeta contenedora. Activarlo es otra cosa y es de la máquina: lo
 * deciden los ajustes.
 */

export const PLUGINS_DIR = "plugins";

const ENTRY_FILES = ["index.tsx", "index.ts"];

export interface PluginManifest {
  name: string;
  version: string;
  title: string;
  description?: string;
  icon?: string;
  contributes: { views: string[] };
  requires?: Record<string, boolean>;
}

type Loaded =
  | { ok: true; manifest: PluginManifest }
  | { ok: false; message: string };

export function runPlugins(options: InstalledOptions): number {
  const root = path.resolve(options.root);

  if (options.action === "list") return listPlugins(root, options.json);

  if (!options.target) {
    console.error(
      options.action === "add"
        ? "falta la ruta del plugin\n\n  codarch plugins add <ruta>"
        : "falta el nombre del plugin\n\n  codarch plugins remove <nombre>"
    );
    return 1;
  }

  return options.action === "add"
    ? addPlugin(root, options.target)
    : removePlugin(root, options.target);
}

function listPlugins(root: string, json: boolean): number {
  const dir = path.join(root, PLUGINS_DIR);
  const configFile = findConfig(root);
  const declared = declaredIn(root, "plugins");

  const entries = childDirectories(dir).map((name) => {
    const loaded = readManifest(path.join(dir, name), name);
    const isDeclared = declared.includes(name);
    if (!loaded.ok) return { name, declared: isDeclared, error: loaded.message };
    if (loaded.manifest.name !== name) {
      return {
        name,
        declared: isDeclared,
        error: `la carpeta se llama ${name} y plugin.json dice ${loaded.manifest.name}: no entra en el build`
      };
    }
    return { name, declared: isDeclared, manifest: loaded.manifest };
  });

  const missing = declared.filter((name) => !entries.some((entry) => entry.name === name));
  const errors = entries.filter((entry) => "error" in entry);

  if (json) {
    console.log(
      JSON.stringify(
        {
          dir: PLUGINS_DIR,
          config: configFile ? path.relative(root, configFile) : null,
          declared,
          plugins: entries.map((entry) =>
            "error" in entry
              ? { name: entry.name, error: entry.error, declared: entry.declared }
              : {
                  name: entry.manifest.name,
                  title: entry.manifest.title,
                  version: entry.manifest.version,
                  description: entry.manifest.description ?? null,
                  views: entry.manifest.contributes.views,
                  declared: entry.declared
                }
          ),
          missing
        },
        null,
        2
      )
    );
    return errors.length > 0 || missing.length > 0 ? 1 : 0;
  }

  console.log("");
  console.log("  CodArch · plugins");
  console.log("");

  if (entries.length === 0 && missing.length === 0) {
    console.log(`  No hay plugins en ${PLUGINS_DIR}/.`);
    console.log("");
    console.log("  Para instalar uno:");
    console.log("");
    console.log("    codarch plugins add <ruta>");
    console.log("");
    return 0;
  }

  for (const entry of entries) {
    if ("error" in entry) {
      console.log(`  ${entry.name} · no se pudo cargar`);
      console.log(`    ${entry.error}`);
      console.log("");
      continue;
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

  for (const name of missing) {
    console.log(`  ${name} · declarado pero falta la carpeta`);
    console.log(`    no entra en el build: quítalo de .codarch.yml o vuelve a copiarlo.`);
    console.log("");
  }

  console.log("  Los plugins son fuente del build de CodArch: no viajan con el");
  console.log("  proyecto que analizas (ADR 0030).");
  console.log("");

  return errors.length > 0 || missing.length > 0 ? 1 : 0;
}

function addPlugin(root: string, target: string): number {
  const source = path.resolve(root, target);
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
    console.error(`no es una carpeta: ${displayPath(root, source)}`);
    return 1;
  }

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

  console.log("");
  console.log(`  ${manifest.name} ${manifest.version} · ${manifest.title}`);
  for (const view of manifest.contributes.views) {
    console.log(`    vista ${view}`);
  }
  console.log("");
  console.log(`  Instalado en ${PLUGINS_DIR}/${manifest.name} y declarado en .codarch.yml.`);
  console.log("  Es fuente del build de CodArch: compílalo para verlo y actívalo en los ajustes.");
  console.log("");
  return 0;
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

/** Lee y valida un `plugin.json`; el punto de entrada se comprueba aparte. */
function readManifest(dir: string, fallbackName: string): Loaded {
  const file = path.join(dir, "plugin.json");
  if (!fs.existsSync(file)) {
    return { ok: false, message: `falta plugin.json en ${dir}` };
  }

  let raw: unknown;
  try {
    // Un `plugin.json` guardado en Windows puede traer BOM.
    raw = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    return { ok: false, message: `plugin.json no es JSON: ${(error as Error).message}` };
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, message: "plugin.json tiene que ser un objeto" };
  }

  const record = raw as Record<string, unknown>;
  const name = record.name ?? fallbackName;
  if (typeof name !== "string" || !ADDON_NAME.test(name)) {
    return {
      ok: false,
      message: `name no es un nombre de plugin: ${String(name)} (minúsculas, números y guiones)`
    };
  }
  if (typeof record.version !== "string" || record.version.trim() === "") {
    return { ok: false, message: "falta version" };
  }
  if (typeof record.title !== "string" || record.title.trim() === "") {
    return { ok: false, message: "falta title" };
  }

  const contributes = record.contributes;
  const views =
    typeof contributes === "object" && contributes !== null
      ? (contributes as Record<string, unknown>).views
      : undefined;
  if (!Array.isArray(views) || views.length === 0) {
    return { ok: false, message: "contributes.views tiene que ser una lista con al menos una vista" };
  }
  const names = views.filter((view): view is string => typeof view === "string" && view !== "");
  if (names.length !== views.length) {
    return { ok: false, message: "contributes.views solo admite nombres" };
  }

  if (!ENTRY_FILES.some((entry) => fs.existsSync(path.join(dir, entry)))) {
    return {
      ok: false,
      message: `falta el punto de entrada en ${dir}: ${ENTRY_FILES.join(" o ")}`
    };
  }

  return {
    ok: true,
    manifest: {
      name,
      version: record.version,
      title: record.title,
      description: typeof record.description === "string" ? record.description : undefined,
      icon: typeof record.icon === "string" ? record.icon : undefined,
      contributes: { views: names },
      requires:
        typeof record.requires === "object" && record.requires !== null
          ? (record.requires as Record<string, boolean>)
          : undefined
    }
  };
}

function displayPath(root: string, target: string): string {
  const relative = path.relative(root, target);
  return relative.startsWith("..") ? target : relative;
}
