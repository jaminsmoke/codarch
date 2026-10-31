import type { RenderFile, RenderSection } from "./model-types";

/**
 * Las secciones: el color categórico que sale de la ruta de cada fichero.
 *
 * Un color por carpeta de las tres primeras, estable entre ejecuciones —la
 * paleta se indexa por un hash de la clave—, para que dos mapas del mismo
 * proyecto pinten la misma carpeta del mismo tono.
 */

const PALETTE = [
  "#b9c4d0",
  "#c9b8a8",
  "#a9bfae",
  "#c4b6c9",
  "#c9c2a6",
  "#d5d2ca",
  "#c2c8d0",
  "#d6c6bd",
  "#b7c6c2",
  "#cbbfb0",
  "#bcc3b9",
  "#cfc6c9"
];

/** FNV-1a: estable entre ejecuciones y barato. */
function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sectionForPath(path: string): string {
  const folders = path.split("/").filter(Boolean).slice(0, -1);
  if (folders.length === 0) return "(raíz)";
  if (folders.length === 1) return folders[0] as string;
  return folders.slice(0, 3).join("/");
}

/**
 * Secciones: color categórico por las tres primeras partes de la ruta.
 * Da color a "app/codeCharta/features" sin convertir cada carpeta en un color.
 */
export function buildSections(files: RenderFile[]): RenderSection[] {
  const accumulator = new Map<string, { files: number; area: number }>();
  for (const file of files) {
    const key = sectionForPath(file.path);
    const current = accumulator.get(key) ?? { files: 0, area: 0 };
    current.files++;
    current.area += file.actualArea;
    accumulator.set(key, current);
  }

  const sections: RenderSection[] = [...accumulator.entries()]
    .map(([key, value]) => ({
      key,
      label: key,
      files: value.files,
      area: value.area,
      color: PALETTE[hashString(key) % PALETTE.length] as string
    }))
    .sort((a, b) => b.area - a.area || a.key.localeCompare(b.key));

  const sectionIndex = new Map(sections.map((section, index) => [section.key, index]));
  for (const file of files) {
    file.section = sectionIndex.get(sectionForPath(file.path)) ?? 0;
  }

  return sections;
}
