/**
 * El estado de las secciones plegables (ADR 0061).
 *
 * Lo único que se guarda es si una sección está cerrada. Vive en el
 * almacenamiento local de la app, no en el repositorio: es una preferencia de
 * lectura, no parte del proyecto. Si el almacenamiento falla o alguien escribió
 * otra cosa, la sección cae a su estado por defecto en vez de romper.
 */

export interface SectionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Lo que una sección plegable tiene que declarar (ADR 0061).
 *
 * Cerrada, una sección enseña su resumen: sin él, plegar es esconder. La
 * cuenta dice cuántas cosas hay dentro y el título, de qué habla.
 */
export interface SectionHeading {
  id: string;
  title: string;
  count?: number;
  summary?: string;
}

/** Los datos que le faltan a una sección para leerse cerrada. */
export function missingSectionParts(section: SectionHeading): string[] {
  const missing: string[] = [];
  if (!section.id.trim()) missing.push("id");
  if (!section.title.trim()) missing.push("title");
  if (section.count === undefined) missing.push("count");
  if (!section.summary?.trim()) missing.push("summary");
  return missing;
}

/** El prefijo de todas las secciones: `codarch:section:<id>`. */
const PREFIX = "codarch:section:";

export function sectionKey(id: string): string {
  return `${PREFIX}${id}`;
}

/**
 * Lee si una sección está cerrada.
 *
 * `closed` es el estado por defecto: las secciones que se mejoran nacen
 * abiertas y solo se cierran si el usuario lo pidió.
 */
export function readSectionClosed(
  storage: SectionStorage | null,
  id: string,
  closed = false
): boolean {
  if (!storage) return closed;
  try {
    const value = storage.getItem(sectionKey(id));
    if (value === "closed") return true;
    if (value === "open") return false;
    return closed;
  } catch {
    return closed;
  }
}

/** Guarda el estado de una sección, sin dejar que un fallo rompa la vista. */
export function writeSectionClosed(
  storage: SectionStorage | null,
  id: string,
  closed: boolean
): void {
  if (!storage) return;
  try {
    storage.setItem(sectionKey(id), closed ? "closed" : "open");
  } catch {
    // El navegador puede bloquear el almacenamiento; la sección funciona igual.
  }
}
