import fs from "node:fs";
import path from "node:path";

/**
 * Las capturas del mapa, en dos ranuras que rotan (ADR 0091).
 *
 * Dos y no veinte: quien mira la captura quiere ver el mapa de ahora y, como
 * mucho, compararlo con el de antes. Una carpeta de capturas que crece sola es
 * basura con fecha en el nombre. Se escribe siempre en la ranura libre y, con
 * las dos ocupadas, se pisa la **más antigua** por su fecha de modificación.
 */

/** Cuántas capturas se guardan. */
export const SHOT_SLOTS = 2;

/** La carpeta de capturas de un repositorio: dentro de `.codarch/`, que no se versiona. */
export function shotDirectory(root: string): string {
  return path.join(root, ".codarch", "shots");
}

/** El nombre del fichero de una ranura, empezando en 1. */
export function shotName(slot: number): string {
  return `map-${slot}.png`;
}

export interface WrittenShot {
  /** Ruta absoluta del PNG escrito. */
  file: string;
  /** La ranura usada, empezando en 1. */
  slot: number;
}

/** La fecha de modificación de un fichero, o `null` si no existe. */
function modifiedAt(file: string): number | null {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return null;
  }
}

/**
 * Escribe la captura en su ranura.
 *
 * Devuelve la ranura que ha usado: si queda alguna libre, esa; si están las
 * dos, la que se escribió antes. El nombre no lleva fecha a propósito —el
 * fichero es siempre `map-1.png` o `map-2.png`—, así que la ruta de una captura
 * no cambia entre ejecuciones y un enlace a ella sigue valiendo.
 */
export function writeShot(root: string, png: Buffer): WrittenShot {
  const directory = shotDirectory(root);
  fs.mkdirSync(directory, { recursive: true });

  const slots = Array.from({ length: SHOT_SLOTS }, (_, index) => index + 1);
  const state = slots.map((slot) => {
    const file = path.join(directory, shotName(slot));
    return { slot, file, at: modifiedAt(file) };
  });

  const free = state.find((entry) => entry.at === null);
  const target =
    free ??
    state.reduce((oldest, entry) =>
      (entry.at as number) < (oldest.at as number) ? entry : oldest
    );

  fs.writeFileSync(target.file, png);
  return { file: target.file, slot: target.slot };
}

/** Las capturas que hay ahora, de la más antigua a la más nueva. */
export function listShots(root: string): string[] {
  const directory = shotDirectory(root);
  return Array.from({ length: SHOT_SLOTS }, (_, index) =>
    path.join(directory, shotName(index + 1))
  )
    .map((file) => ({ file, at: modifiedAt(file) }))
    .filter((entry): entry is { file: string; at: number } => entry.at !== null)
    .sort((left, right) => left.at - right.at)
    .map((entry) => entry.file);
}
