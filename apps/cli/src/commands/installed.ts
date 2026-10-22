import fs from "node:fs";
import path from "node:path";
import { parseDocument, type Document } from "yaml";

/**
 * Instalar y quitar extensiones: lo que comparten plugins y addons (ADR 0030).
 *
 * La lista de instalados vive en `.codarch.yml`, no en un manifiesto aparte:
 * ya la leen el build, el CLI, las apps, la acción y el MCP. Instalar es copiar
 * una carpeta hija de `plugins/` o `addons/` y añadir su nombre; quitar es
 * borrar esa carpeta y quitar el nombre. La carpeta contenedora no se toca.
 */

/** Las claves de `.codarch.yml` que listan lo instalado. */
export type InstalledKind = "plugins" | "addons";

export interface InstalledOptions {
  action: "list" | "add" | "remove";
  /** La ruta a copiar (`add`) o el nombre a quitar (`remove`). */
  target?: string;
  /** El repo (por defecto, el directorio actual). */
  root: string;
  json: boolean;
}

const CONFIG_FILES = [".codarch.yml", ".codarch.yaml"];

/** El `.codarch.yml` del repo, si lo hay. */
export function findConfig(root: string): string | null {
  for (const file of CONFIG_FILES) {
    const full = path.join(root, file);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

/** Los nombres declarados en `.codarch.yml`, en orden. */
export function declaredIn(root: string, kind: InstalledKind): string[] {
  const file = findConfig(root);
  if (!file) return [];

  const doc = readDocument(file);
  if (!doc.ok) return [];

  return stringList(asRecord(doc.doc.toJS())[kind]);
}

/** Declara un nombre en `.codarch.yml`, creando el archivo si no existe. */
export function declareIn(
  root: string,
  kind: InstalledKind,
  name: string
): { ok: true } | { ok: false; message: string } {
  const file = findConfig(root);

  if (!file) {
    fs.writeFileSync(
      path.join(root, ".codarch.yml"),
      `version: 1\n\n${kind}:\n  - ${name}\n`,
      "utf8"
    );
    return { ok: true };
  }

  const doc = readDocument(file);
  if (!doc.ok) return { ok: false, message: doc.message };

  const declared = stringList(asRecord(doc.doc.toJS())[kind]);
  if (!declared.includes(name)) {
    doc.doc.set(kind, [...declared, name]);
  }
  if (asRecord(doc.doc.toJS()).version === undefined) {
    doc.doc.set("version", 1);
  }

  fs.writeFileSync(file, String(doc.doc), "utf8");
  return { ok: true };
}

/** Quita un nombre de la lista; si no estaba, no pasa nada. */
export function undeclareIn(
  root: string,
  kind: InstalledKind,
  name: string
): { ok: true } | { ok: false; message: string } {
  const file = findConfig(root);
  if (!file) return { ok: true };

  const doc = readDocument(file);
  if (!doc.ok) return { ok: false, message: doc.message };

  const declared = stringList(asRecord(doc.doc.toJS())[kind]);
  if (!declared.includes(name)) return { ok: true };

  doc.doc.set(
    kind,
    declared.filter((entry) => entry !== name)
  );
  fs.writeFileSync(file, String(doc.doc), "utf8");
  return { ok: true };
}

export function readDocument(
  file: string
): { ok: true; doc: Document } | { ok: false; message: string } {
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

export function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

/** Las carpetas de un directorio, sin las que no son extensiones. */
export function childDirectories(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith(".") && name !== "node_modules")
    .sort();
}
