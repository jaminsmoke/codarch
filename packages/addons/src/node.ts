import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  AddonError,
  addonError,
  parseAddon,
  parseAddonManifest,
  type Addon
} from "./index";

/**
 * Leer addons del disco.
 *
 * Un addon vive en `addons/<nombre>/` (ADR 0029): una carpeta con su
 * `addon.json` y los ficheros que el manifiesto declare. Se lee todo lo que
 * hay, y el `.codarch.yml` decide **cuáles** se usan.
 */

/** La carpeta donde viven los addons de un repo. */
export const ADDONS_DIR = "addons";

export interface AddonLoadResult {
  addons: Addon[];
  /**
   * Los addons que no se pudieron cargar.
   *
   * No se lanza: un addon roto no puede esconder los demás. Quien lo pide
   * decide si es un error (uno declarado) o un aviso (uno suelto).
   */
  errors: AddonError[];
}

/** Carga todos los addons de `addons/`. Si no hay carpeta, no hay addons. */
export function loadAddons(root: string): AddonLoadResult {
  const dir = path.join(root, ADDONS_DIR);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return { addons: [], errors: [] };
  }

  const addons: Addon[] = [];
  const errors: AddonError[] = [];
  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const name of folders) {
    try {
      const addon = loadAddon(path.join(dir, name));
      // En `addons/` la carpeta es la identidad: si el manifiesto dice otra
      // cosa, el `.codarch.yml` no lo encontraría nunca.
      if (addon.manifest.name !== name) {
        throw new AddonError(
          `la carpeta se llama "${name}" y el manifiesto "${addon.manifest.name}": deben coincidir`
        );
      }
      addons.push(addon);
    } catch (error) {
      errors.push(addonError(name, error));
    }
  }

  return { addons, errors };
}

/** Carga un addon de una carpeta. Lanza `AddonError` si no cumple el contrato. */
export function loadAddon(dir: string): Addon {
  const label = path.basename(dir);
  const manifest = parseAddonManifest(
    readJson(path.join(dir, "addon.json"), `${label}/addon.json`)
  );

  return parseAddon({
    manifest,
    profiles: readYamlPieces(dir, manifest.contributes.profiles),
    rules: readYamlPieces(dir, manifest.contributes.rules),
    views: readYamlPieces(dir, manifest.contributes.views)
  });
}

/**
 * Lee las piezas de un addon.
 *
 * Un fichero puede tener **una** pieza (un perfil es un objeto) o **una
 * lista** (las reglas y las vistas se escriben como listas). Se acepta lo uno
 * y lo otro porque cada pieza tiene su forma natural.
 */
function readYamlPieces(dir: string, files: readonly string[]): unknown[] {
  const pieces: unknown[] = [];
  for (const file of files) {
    const full = path.join(dir, file);
    let text: string;
    try {
      text = fs.readFileSync(full, "utf8");
    } catch (error) {
      throw new AddonError(`no se pudo leer ${file}: ${(error as Error).message}`);
    }
    let value: unknown;
    try {
      value = parseYaml(stripBom(text));
    } catch (error) {
      throw new AddonError(`YAML inválido en ${file}: ${(error as Error).message}`);
    }
    if (Array.isArray(value)) pieces.push(...value);
    else if (value !== undefined && value !== null) pieces.push(value);
  }
  return pieces;
}

function readJson(file: string, label: string): unknown {
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    throw new AddonError(`no se pudo leer ${label}: ${(error as Error).message}`);
  }
  try {
    return JSON.parse(stripBom(text)) as unknown;
  } catch (error) {
    throw new AddonError(`JSON inválido en ${label}: ${(error as Error).message}`);
  }
}

/** Un editor de Windows puede dejar un BOM delante: no es parte del JSON. */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
