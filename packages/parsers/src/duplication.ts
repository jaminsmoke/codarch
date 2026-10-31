import { sha256Hex } from "@codarch/schema/browser";

/**
 * La duplicación del código, medida (ADR 0102).
 *
 * No sabe de gramáticas: parte de las líneas significativas del fichero y
 * compara ventanas de ocho líneas con su SHA-256. Dos ficheros que comparten
 * una ventana son un par; las ventanas contiguas se funden en bloques antes de
 * contar líneas. Es determinista y funciona igual en el CLI y el navegador.
 */

/** Las líneas significativas que forman una ventana. */
export const DUPLICATION_WINDOW = 8;

/** Por debajo de esta similitud no hay par: es parecido, no copia. */
export const DUPLICATION_MIN_SIMILARITY = 40;

export interface DuplicationFileInput {
  relativePath: string;
  /** Líneas de código del fichero, para la proporción del resumen. */
  rloc: number;
  source: string;
}

export interface DuplicationNode {
  /** Líneas dentro de bloques compartidos con otro fichero. */
  duplicatedLines: number;
  /** Líneas dentro de bloques repetidos en el mismo fichero. */
  repeatedLines: number;
  /** Ruta del gemelo canónico, si el fichero entero es idéntico a otro. */
  duplicateOf?: string;
}

export interface DuplicationPair {
  from: string;
  to: string;
  /** Líneas compartidas, contadas una vez por bloque maximal. */
  lines: number;
  /** 0..100: ventanas compartidas / mínimo de ventanas de los dos. */
  similarity: number;
  status: "copy" | "diverging";
}

export interface DuplicationSummary {
  pairs: number;
  /** Ficheros que son copia de otro. */
  copies: number;
  duplicatedLines: number;
  repeatedLines: number;
  /** 0..100 sobre el rloc del árbol. Se calcula, no se suma. */
  ratio: number;
}

export interface DuplicationResult {
  nodes: Map<string, DuplicationNode>;
  pairs: DuplicationPair[];
  summary: DuplicationSummary;
}

/** Lo que se guarda de un fichero para compararlo sin volver a leerlo. */
export interface DuplicationDigest {
  windows: string[];
  whole: string;
}

/** La huella de un fichero ya leído, con su rloc para la proporción. */
export interface DuplicationFingerprint extends DuplicationDigest {
  relativePath: string;
  rloc: number;
}

/**
 * Las líneas significativas de un fuente.
 *
 * Se quitan los comentarios por su texto —`//` y `/* *\/`—, los espacios de los
 * extremos y las líneas que solo son delimitadores. Es la normalización que
 * hace comparables dos ficheros con el mismo código y distinto formato; no
 * interpreta el lenguaje, así que valga para todos los que analiza el mapa.
 */
export function significantLines(source: string): string[] {
  const lines: string[] = [];
  let inBlockComment = false;

  for (const raw of source.split("\n")) {
    let line = raw;

    if (inBlockComment) {
      const end = line.indexOf("*/");
      if (end === -1) continue;
      line = line.slice(end + 2);
      inBlockComment = false;
    }

    line = line.replace(/\/\*.*?\*\//g, "");
    const blockStart = line.indexOf("/*");
    if (blockStart !== -1) {
      line = line.slice(0, blockStart);
      inBlockComment = true;
    }

    const lineComment = line.indexOf("//");
    if (lineComment !== -1) line = line.slice(0, lineComment);

    line = line.trim();
    if (line === "") continue;
    if (/^[{}()\[\];,]+$/.test(line)) continue;
    lines.push(line);
  }

  return lines;
}

/** Los hashes de las ventanas consecutivas de un fichero. */
function windowHashes(lines: readonly string[]): string[] {
  const hashes: string[] = [];
  for (let index = 0; index + DUPLICATION_WINDOW <= lines.length; index++) {
    hashes.push(
      sha256Hex(
        lines.slice(index, index + DUPLICATION_WINDOW).join("\n")
      )
    );
  }
  return hashes;
}

/** La huella de un fuente: sus ventanas y el hash del fichero entero. */
export function duplicationFingerprint(
  relativePath: string,
  rloc: number,
  source: string
): DuplicationFingerprint {
  const lines = significantLines(source);
  return {
    relativePath,
    rloc,
    windows: windowHashes(lines),
    whole: sha256Hex(lines.join("\n"))
  };
}

/** La duplicación de un conjunto de ficheros ya leídos. */
export function analyzeDuplication(
  files: readonly DuplicationFileInput[]
): DuplicationResult {
  return analyzeDuplicationFingerprints(
    files.map((file) =>
      duplicationFingerprint(file.relativePath, file.rloc, file.source)
    )
  );
}

/** La duplicación a partir de huellas ya calculadas (caché incremental). */
export function analyzeDuplicationFingerprints(
  files: readonly DuplicationFingerprint[]
): DuplicationResult {
  const ordered = [...files].sort((left, right) =>
    compareStrings(left.relativePath, right.relativePath)
  );

  const windowsByFile = new Map<string, string[]>();
  const identicalGroups = new Map<string, string[]>();

  for (const file of ordered) {
    windowsByFile.set(file.relativePath, file.windows);
    const group = identicalGroups.get(file.whole);
    if (group) group.push(file.relativePath);
    else identicalGroups.set(file.whole, [file.relativePath]);
  }

  // Una ventana, sus apariciones por fichero. De aquí salen la duplicación
  // entre ficheros, la repetición interna y los pares.
  const occurrences = new Map<string, Map<string, number[]>>();
  for (const file of ordered) {
    const hashes = windowsByFile.get(file.relativePath) as string[];
    for (const [index, hash] of hashes.entries()) {
      let byFile = occurrences.get(hash);
      if (!byFile) {
        byFile = new Map();
        occurrences.set(hash, byFile);
      }
      const positions = byFile.get(file.relativePath);
      if (positions) positions.push(index);
      else byFile.set(file.relativePath, [index]);
    }
  }

  const duplicated = new Map<string, Set<number>>();
  const repeated = new Map<string, Set<number>>();
  const pairs = new Map<
    string,
    { from: string; to: string; windows: number; lines: Set<number> }
  >();

  for (const byFile of occurrences.values()) {
    const paths = [...byFile.keys()];

    if (paths.length >= 2) {
      for (const path of paths) {
        const positions = byFile.get(path) as number[];
        const indices = mark(duplicated, path);
        for (const position of positions) markRange(indices, position);
      }
      for (let left = 0; left < paths.length; left++) {
        for (let right = left + 1; right < paths.length; right++) {
          const from = paths[left] as string;
          const to = paths[right] as string;
          const key = `${from}\u0000${to}`;
          let pair = pairs.get(key);
          if (!pair) {
            pair = { from, to, windows: 0, lines: new Set<number>() };
            pairs.set(key, pair);
          }
          pair.windows += 1;
          for (const position of byFile.get(from) as number[]) {
            markRange(pair.lines, position);
          }
        }
      }
    }

    for (const [path, positions] of byFile) {
      if (!repeatsWithinFile(positions)) continue;
      const indices = mark(repeated, path);
      for (const position of positions) markRange(indices, position);
    }
  }

  const rankedPairs = [...pairs.values()]
    .map((pair): DuplicationPair => {
      const fromWindows = (windowsByFile.get(pair.from) as string[]).length;
      const toWindows = (windowsByFile.get(pair.to) as string[]).length;
      const minimum = Math.min(fromWindows, toWindows);
      const similarity =
        minimum === 0 ? 0 : Math.round((pair.windows / minimum) * 100);
      return {
        from: pair.from,
        to: pair.to,
        lines: pair.lines.size,
        similarity,
        status: similarity === 100 ? "copy" : "diverging"
      };
    })
    .filter((pair) => pair.similarity >= DUPLICATION_MIN_SIMILARITY)
    .sort(
      (left, right) =>
        right.similarity - left.similarity ||
        right.lines - left.lines ||
        compareStrings(left.from, right.from) ||
        compareStrings(left.to, right.to)
    );

  const duplicateOf = new Map<string, string>();
  for (const group of identicalGroups.values()) {
    const canonical = [...group].sort(compareStrings)[0] as string;
    for (const path of group) {
      if (path !== canonical) duplicateOf.set(path, canonical);
    }
  }

  const nodes = new Map<string, DuplicationNode>();
  for (const file of ordered) {
    nodes.set(file.relativePath, {
      duplicatedLines: duplicated.get(file.relativePath)?.size ?? 0,
      repeatedLines: repeated.get(file.relativePath)?.size ?? 0,
      ...(duplicateOf.has(file.relativePath)
        ? { duplicateOf: duplicateOf.get(file.relativePath) as string }
        : {})
    });
  }

  const duplicatedLines = sum(nodes, "duplicatedLines");
  const repeatedLines = sum(nodes, "repeatedLines");
  const totalRloc = ordered.reduce(
    (total, file) => total + Math.max(0, file.rloc),
    0
  );

  return {
    nodes,
    pairs: rankedPairs,
    summary: {
      pairs: rankedPairs.length,
      copies: duplicateOf.size,
      duplicatedLines,
      repeatedLines,
      ratio:
        totalRloc === 0
          ? 0
          : Math.round((duplicatedLines / totalRloc) * 100)
    }
  };
}

function mark(
  map: Map<string, Set<number>>,
  path: string
): Set<number> {
  let indices = map.get(path);
  if (!indices) {
    indices = new Set();
    map.set(path, indices);
  }
  return indices;
}

function markRange(indices: Set<number>, start: number): void {
  for (let index = start; index < start + DUPLICATION_WINDOW; index++) {
    indices.add(index);
  }
}

/** ¿La misma ventana aparece dos veces sin solaparse consigo misma? */
function repeatsWithinFile(positions: readonly number[]): boolean {
  for (let left = 0; left < positions.length; left++) {
    for (let right = left + 1; right < positions.length; right++) {
      if ((positions[right] as number) - (positions[left] as number) >= DUPLICATION_WINDOW) {
        return true;
      }
    }
  }
  return false;
}

function sum(
  nodes: ReadonlyMap<string, DuplicationNode>,
  field: "duplicatedLines" | "repeatedLines"
): number {
  let total = 0;
  for (const node of nodes.values()) total += node[field];
  return total;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
