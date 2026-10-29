import fs from "node:fs";
import path from "node:path";
import { ADDON_NAME } from "@codarch/metrics";

/**
 * Leer un `plugin.json`.
 *
 * Un plugin es código del repo (ADR 0028): su carpeta tiene el manifiesto y el
 * punto de entrada, y el build de CodArch lo compila. Aquí solo se comprueba
 * que el manifiesto diga lo que tiene que decir; compilar es de otro sitio.
 *
 * Cada regla es una función que devuelve el valor ya validado o el mensaje que
 * se lee en la terminal, y `readManifest` las encadena en el mismo orden que
 * antes: primero el fichero, luego su nombre, su texto, sus vistas y, al final,
 * el punto de entrada.
 */

/** Los ficheros que pueden hacer de punto de entrada, en orden de preferencia. */
export const ENTRY_FILES = ["index.tsx", "index.ts"];

export interface PluginManifest {
  name: string;
  version: string;
  title: string;
  description?: string;
  icon?: string;
  contributes: { views: string[] };
  requires?: Record<string, boolean>;
}

export type Loaded =
  | { ok: true; manifest: PluginManifest }
  | { ok: false; message: string };

/** Lo validado, o el motivo por el que no vale. */
type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

/** El manifiesto ya leído y comprobado, o el primer problema que tenga. */
export function readManifest(dir: string, fallbackName: string): Loaded {
  const raw = readJson(dir);
  if (!raw.ok) return raw;

  const name = readName(raw.value, fallbackName);
  if (!name.ok) return name;

  const text = readText(raw.value);
  if (!text.ok) return text;

  const views = readViews(raw.value);
  if (!views.ok) return views;

  if (!hasEntry(dir)) {
    return {
      ok: false,
      message: `falta el punto de entrada en ${dir}: ${ENTRY_FILES.join(" o ")}`
    };
  }

  const manifest: PluginManifest = {
    name: name.value,
    version: text.value.version,
    title: text.value.title,
    description:
      typeof raw.value.description === "string" ? raw.value.description : undefined,
    icon: typeof raw.value.icon === "string" ? raw.value.icon : undefined,
    contributes: { views: views.value },
    requires: readRequires(raw.value)
  };
  return { ok: true, manifest };
}

/** El `plugin.json` como objeto. Un BOM de Windows no lo estropea. */
function readJson(dir: string): Parsed<Record<string, unknown>> {
  const file = path.join(dir, "plugin.json");
  if (!fs.existsSync(file)) {
    return { ok: false, message: `falta plugin.json en ${dir}` };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    return {
      ok: false,
      message: `plugin.json no es JSON: ${(error as Error).message}`
    };
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, message: "plugin.json tiene que ser un objeto" };
  }
  return { ok: true, value: raw as Record<string, unknown> };
}

/** El nombre: el del manifiesto o, si no lo trae, el de la carpeta. */
function readName(record: Record<string, unknown>, fallback: string): Parsed<string> {
  const name = record.name ?? fallback;
  if (typeof name !== "string" || !ADDON_NAME.test(name)) {
    return {
      ok: false,
      message: `name no es un nombre de plugin: ${String(name)} (minúsculas, números y guiones)`
    };
  }
  return { ok: true, value: name };
}

/** Lo que se enseña en el listado: versión y título, los dos con texto. */
function readText(
  record: Record<string, unknown>
): Parsed<{ version: string; title: string }> {
  if (typeof record.version !== "string" || record.version.trim() === "") {
    return { ok: false, message: "falta version" };
  }
  if (typeof record.title !== "string" || record.title.trim() === "") {
    return { ok: false, message: "falta title" };
  }
  return { ok: true, value: { version: record.version, title: record.title } };
}

/** Las vistas que aporta: al menos una, y todas con nombre. */
function readViews(record: Record<string, unknown>): Parsed<string[]> {
  const contributes = record.contributes;
  const views =
    typeof contributes === "object" && contributes !== null
      ? (contributes as Record<string, unknown>).views
      : undefined;

  if (!Array.isArray(views) || views.length === 0) {
    return {
      ok: false,
      message: "contributes.views tiene que ser una lista con al menos una vista"
    };
  }

  const names = views.filter(
    (view): view is string => typeof view === "string" && view !== ""
  );
  if (names.length !== views.length) {
    return { ok: false, message: "contributes.views solo admite nombres" };
  }
  return { ok: true, value: names };
}

/** Las dependencias declaradas, si las hay. */
function readRequires(
  record: Record<string, unknown>
): Record<string, boolean> | undefined {
  const requires = record.requires;
  if (typeof requires !== "object" || requires === null) return undefined;
  return requires as Record<string, boolean>;
}

/** Si la carpeta trae alguno de los puntos de entrada posibles. */
function hasEntry(dir: string): boolean {
  return ENTRY_FILES.some((entry) => fs.existsSync(path.join(dir, entry)));
}
