import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { Plugin } from "vite";
import type { PluginManifest } from "./index";

/**
 * El registro de plugins, generado en el build.
 *
 * Los plugins viven en `plugins/` ✓, en la raíz del repo ✓. El repo declara
 * **cuáles están compilados** ✓ (`.codarch.yml`: `plugins: [...]` ✓) y solo
 * esos entran en el bundle ✓: lo que no está compilado no se arrastra (three.js
 * son 600 KB ✓).
 *
 * Después, el usuario **activa** los que quiera ✓ desde los ajustes ✓.
 */

const VIRTUAL_ID = "virtual:codarch-plugins";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export interface PluginBuildOptions {
  /** La raíz del repo. */
  root: string;
}

/** Los plugins que el repo declara compilados. */
export function compiledPlugins(root: string): string[] {
  const file = path.join(root, ".codarch.yml");
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = parseYaml(fs.readFileSync(file, "utf8")) as {
      plugins?: unknown;
    } | null;
    const list = parsed?.plugins;
    if (!Array.isArray(list)) return [];
    return list.filter((name): name is string => typeof name === "string");
  } catch {
    return [];
  }
}

/** Los manifiestos de los plugins compilados. */
export function pluginManifests(root: string): PluginManifest[] {
  const directory = path.join(root, "plugins");
  if (!fs.existsSync(directory)) return [];

  const wanted = compiledPlugins(root);
  const manifests: PluginManifest[] = [];

  for (const name of wanted) {
    const file = path.join(directory, name, "plugin.json");
    if (!fs.existsSync(file)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(file, "utf8")) as PluginManifest;
      manifests.push({ ...manifest, name: manifest.name ?? name });
    } catch {
      // Un manifiesto roto no debe parar el build: el plugin simplemente no
      // aparece en el store.
    }
  }

  return manifests;
}

/**
 * El plugin de Vite que genera el registro.
 *
 * El módulo virtual exporta los manifiestos y un cargador perezoso por plugin ✓:
 * el código se descarga cuando el usuario abre la vista ✓, no antes ✓.
 */
export function codarchPlugins(options: PluginBuildOptions): Plugin {
  const { root } = options;

  return {
    name: "codarch-plugins",
    resolveId(id: string): string | null {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id: string): string | null {
      if (id !== RESOLVED_ID) return null;

      const manifests = pluginManifests(root);
      const entries = manifests.map((manifest) => {
        const entry = pluginEntry(root, manifest.name);
        if (!entry) return null;
        // La ruta absoluta, con el prefijo que Vite usa para los ficheros
        // fuera de la raíz del proyecto ✓.
        const specifier = `/@fs/${entry.split(path.sep).join("/")}`;
        return `{
  manifest: ${JSON.stringify(manifest)},
  load: async () => {
    const module = await import(${JSON.stringify(specifier)});
    return module.default ?? module;
  }
}`;
      });

      const valid = entries.filter((entry): entry is string => entry !== null);
      return `export const plugins = [\n${valid.join(",\n")}\n];\n`;
    }
  };
}

/** El punto de entrada de un plugin, si lo tiene ✓. */
function pluginEntry(root: string, name: string): string | null {
  const directory = path.join(root, "plugins", name);
  for (const candidate of ["index.tsx", "index.ts"]) {
    const file = path.join(directory, candidate);
    if (fs.existsSync(file)) return file;
  }
  return null;
}
