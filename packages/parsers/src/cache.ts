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
 * la versión no cambió, se da por bueno. No cambia el checksum: el resultado
 * tiene que ser el mismo que el de un análisis completo.
 *
 * Vive en memoria del proceso que analiza, y un alcance la deja además en su
 * `.codarch/` para que el análisis que lo contiene la lea hacia abajo
 * (ADR 0089). Nunca se lee hacia arriba: un alcance parcial no hereda el
 * estado de un alcance mayor.
 *
 * Cada entrada lleva el parser que la produjo (ADR 0090): con varios
 * lenguajes, la versión del fichero ya no dice con qué se parseó, y un acierto
 * solo vale si es el mismo parser.
 */
export interface CachedParse {
  /** `tamaño:mtime` con el que se parseó. */
  version: string;
  /** `SourceParser.name` con el que se parseó. */
  parser: string;
  parsed: FileParseResult;
  /** Si el fichero puentea a otro lenguaje (`jsIsBridge`), ya medido. */
  bridge: boolean;
}

/**
 * El formato del fichero donde un alcance guarda su caché de parseo.
 *
 * Se sube cuando el contenido guardado deja de valer para un lector viejo; un
 * lector que no conoce el formato ignora la caché y parsea, que es seguro.
 *
 * El 2 es el de la entrada firmada por parser (ADR 0090): una caché del 1 se
 * ignoró entera y se reparseó, que es justo lo que se buscaba.
 */
export const PARSE_CACHE_FORMAT = 2;

export class ParseCache {
  private readonly entries = new Map<string, CachedParse>();

  /**
   * El parseo guardado, si la versión coincide y es del parser pedido.
   *
   * Sin `parser`, basta con la versión: lo usan los diagnósticos que solo
   * quieren saber si hay entrada.
   */
  get(
    relativePath: string,
    version: string,
    parser?: string
  ): CachedParse | null {
    const entry = this.entries.get(relativePath);
    if (!entry || entry.version !== version) return null;
    if (parser !== undefined && entry.parser !== parser) return null;
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

  /**
   * Los parseos guardados, en orden de ruta.
   *
   * El orden es estable a propósito: de aquí sale el fichero que un alcance
   * deja para que lo lea el que lo contiene (ADR 0089).
   */
  list(): Array<[string, CachedParse]> {
    return [...this.entries.entries()].sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0
    );
  }

  clear(): void {
    this.entries.clear();
  }
}
