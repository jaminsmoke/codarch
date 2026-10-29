import fs from "node:fs";
import path from "node:path";
import type { CcJson } from "@codarch/schema";

/**
 * El snapshot de lo que no es código, en su propio fichero (ADR 0093).
 *
 * Vive al lado del snapshot del código y tiene su propio checksum: `codarch
 * analyze` y `codarch serve` lo escriben, y todo lo que compara código —el
 * diff, las reglas, la acción y el MCP— no lo lee.
 */

export const REST_FILE = "rest.cc.json";

export function restSnapshotPath(outDirectory: string): string {
  return path.join(outDirectory, REST_FILE);
}

/** Lo que se escribió: dónde quedó y si el fichero cambió de verdad. */
export interface RestWrite {
  path: string;
  written: boolean;
}

/**
 * Escribe el resto, o lo salta si el que ya está en disco es el mismo.
 *
 * El corte va por checksum, como el snapshot del código (ADR 0056): guardar un
 * fichero de código no reescribe un mapa de documentos que no ha cambiado.
 */
export function writeRestSnapshot(
  outDirectory: string,
  snapshot: CcJson
): RestWrite {
  const file = restSnapshotPath(outDirectory);
  const checksum = snapshot.meta.checksum ?? "";
  if (checksum !== "" && readChecksum(file) === checksum) {
    return { path: file, written: false };
  }

  fs.mkdirSync(outDirectory, { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return { path: file, written: true };
}

/** El checksum de un resto ya escrito, o `null` si falta o no se puede leer. */
function readChecksum(file: string): string | null {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
      meta?: { checksum?: unknown };
    };
    return typeof raw.meta?.checksum === "string" ? raw.meta.checksum : null;
  } catch {
    return null;
  }
}
