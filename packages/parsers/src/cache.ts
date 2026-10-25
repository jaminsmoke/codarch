import type { FileParseResult } from "./types";

/**
 * Lo que cuesta calcular de un fichero, guardado para no repetirlo.
 *
 * Analizar un repositorio entero se va casi todo en leer y parsear ficheros
 * que no han cambiado (medido en este repo: 2 194 ms de 2 819). Con esta
 * caché, un guardado reparsea solo lo tocado y rehace el resto del pipeline
 * —resolución, grafo, migración y snapshot—, que son milisegundos (ADR 0056).
 *
 * La clave es la **versión** del fichero (`tamaño:mtime`), no su contenido: si
 * la versión no cambió, se da por bueno. La caché es del proceso, no se
 * persiste y no cambia el checksum: el resultado tiene que ser el mismo que el
 * de un análisis completo.
 */
export interface CachedParse {
  /** `tamaño:mtime` con el que se parseó. */
  version: string;
  parsed: FileParseResult;
  /** Si el fichero puentea a otro lenguaje (`jsIsBridge`), ya medido. */
  bridge: boolean;
}

export class ParseCache {
  private readonly entries = new Map<string, CachedParse>();

  /** El parseo guardado, si la versión coincide. */
  get(relativePath: string, version: string): CachedParse | null {
    const entry = this.entries.get(relativePath);
    if (!entry || entry.version !== version) return null;
    return entry;
  }

  set(relativePath: string, entry: CachedParse): void {
    this.entries.set(relativePath, entry);
  }

  /** Se queda solo con los ficheros vivos: los borrados no ocupan memoria. */
  retain(relativePaths: Iterable<string>): void {
    const alive = new Set(relativePaths);
    for (const relativePath of this.entries.keys()) {
      if (!alive.has(relativePath)) this.entries.delete(relativePath);
    }
  }

  /** Cuántos ficheros guarda. Lo usan los tests y los diagnósticos. */
  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }
}
