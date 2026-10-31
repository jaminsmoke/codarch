import type { RenderFile, TreeNode } from "@codarch/render/browser";
import { findFolder } from "../tree";
import type { InspectorTab } from "../viewState";

/**
 * Qué selecciona cada gesto, sin tocar estado.
 *
 * La selección es una sola cosa —un fichero o una carpeta— y la comparten las
 * dos apps, así que su regla vive aquí y el hook solo la obedece. Dos gestos
 * necesitan pensar: elegir un fichero cambia de hoja, y un refresco del live
 * devuelve la selección que había sin cerrar la hoja que se está leyendo.
 */

/** El índice de un fichero por su ruta en el mapa; `-1` si no está. */
export function indexOfPath(
  files: readonly Pick<RenderFile, "path">[],
  path: string
): number {
  return files.findIndex((file) => file.path === path);
}

/**
 * La hoja que toca al elegir un fichero (ADR 0092).
 *
 * La carpeta y el proyecto no pueden tener un fichero seleccionado a la vez:
 * elegir uno devuelve la hoja del fichero. Cambios y fichero se respetan.
 */
export function tabAfterFilePick(tab: InspectorTab): InspectorTab {
  return tab === "folder" || tab === "project" ? "file" : tab;
}

/** Lo que deja un fichero elegido por índice. */
export interface FilePick {
  index: number | null;
  /** La ruta que recuerda el hook para recuperarlo en el próximo modelo. */
  path: string | null;
}

/** El fichero de un índice, o el vacío. */
export function filePick(
  files: readonly Pick<RenderFile, "path">[],
  index: number | null
): FilePick {
  if (index === null) return { index: null, path: null };
  return { index, path: files[index]?.path ?? null };
}

/** Lo que se sabe cuando el modelo cambia. */
export interface RestoreInput {
  /** Los ficheros del modelo nuevo; `null` si no hay mapa. */
  files: readonly Pick<RenderFile, "path">[] | null;
  roots: readonly TreeNode[];
  /** La carpeta seleccionada, si hay una. */
  folder: string | null;
  /** La ruta del fichero que estaba elegido. */
  remembered: string | null;
  /** El fichero que el modelo propone cuando no hay nada que recordar. */
  defaultIndex: number | null;
}

/**
 * Qué selección toca con el modelo nuevo.
 *
 * `undefined` es «no tocar»: un refresco del live no elige fichero, devuelve el
 * que había, y no cierra la hoja de Proyecto ni la de una carpeta que sigue en
 * el árbol. Solo una carpeta que ya no está se queda sin sujeto, y entonces la
 * hoja pasa a la del fichero (ADR 0092).
 */
export interface RestorePlan {
  index: number | null | undefined;
  folder: string | null | undefined;
  /** La carpeta seleccionada desapareció: su hoja se queda sin sujeto. */
  folderGone: boolean;
}

export function planRestore(input: RestoreInput): RestorePlan {
  const { files, roots, folder, remembered, defaultIndex } = input;
  const still = { index: undefined, folder: undefined, folderGone: false };

  if (!files) return { index: null, folder: undefined, folderGone: false };

  let folderPlan: string | null | undefined;
  let folderGone = false;
  if (folder) {
    // La carpeta sigue: la selección y la hoja se quedan donde estaban.
    if (findFolder(roots, folder)) return still;
    folderPlan = null;
    folderGone = true;
  }

  if (remembered !== null) {
    const index = indexOfPath(files, remembered);
    if (index >= 0) return { index, folder: folderPlan, folderGone };
  }

  return { index: defaultIndex, folder: folderPlan, folderGone };
}
