import { createHash } from "node:crypto";
import type { CcNodeType } from "./types";

/** Longitud hexadecimal de los ids de nodo, igual que `cc.json` 2.x. */
export const ID_LENGTH = 16;

/** Normaliza un nombre de segmento igual que el emisor de `cc.json` (NFC). */
export function normalizeName(name: string): string {
  return name.normalize("NFC");
}

/** Convierte una ruta (`src/App.ts`) en segmentos canónicos, sin vacíos ni `.`. */
export function pathSegments(path: string): string[] {
  const segments: string[] = [];
  for (const raw of path.replace(/\\/g, "/").split("/")) {
    const segment = normalizeName(raw);
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments;
}

/** Ruta canónica 2.x: siempre empieza por `/`; la raíz es `/`. */
export function canonicalPath(segments: readonly string[]): string {
  return `/${segments.map(normalizeName).join("/")}`;
}

/**
 * Id estable de un nodo: `sha256(type + canonicalPath)[:16]`.
 *
 * La ruta canónica excluye la raíz del árbol, así que la raíz de cualquier
 * proyecto es `Folder/` y un fichero `src/App.ts` es `File/src/App.ts`.
 */
export function idFromCanonicalPath(path: string, type: CcNodeType = "File"): string {
  const canonical = path.startsWith("/") ? path : `/${path}`;
  return createHash("sha256")
    .update(type + canonical, "utf8")
    .digest("hex")
    .slice(0, ID_LENGTH);
}

/** Id de un nodo a partir de su tipo y sus segmentos. */
export function nodeId(type: CcNodeType, segments: readonly string[]): string {
  return idFromCanonicalPath(canonicalPath(segments), type);
}

/** Id de un fichero a partir de su ruta relativa al proyecto. */
export function fileId(path: string): string {
  return nodeId("File", pathSegments(path));
}

/** Id de una carpeta a partir de su ruta relativa al proyecto. La raíz es `folderId("")`. */
export function folderId(path: string): string {
  return nodeId("Folder", pathSegments(path));
}
