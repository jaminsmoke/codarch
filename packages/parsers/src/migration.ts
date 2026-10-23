import type {
  CcMigrationLanguage,
  CcMigrationLanguageStats,
  CcMigrationNode,
  CcMigrationStatus,
  CcMigrationSummary
} from "@codarch/schema/browser";

const EXTENSION_LANGUAGE: Record<string, CcMigrationLanguage> = {
  ".ts": "ts",
  ".tsx": "ts",
  ".mts": "ts",
  ".cts": "ts",
  ".js": "js",
  ".jsx": "js",
  ".mjs": "js",
  ".cjs": "js",
  ".rs": "rust",
  ".wasm": "wasm",
  ".node": "node"
};

/** Extensiones que el analizador recorre para la lente de migración. */
export const MIGRATION_EXTENSIONS = Object.keys(EXTENSION_LANGUAGE);

const LANGUAGE_ORDER: readonly CcMigrationLanguage[] = ["ts", "js", "rust", "wasm", "node"];

const RUST_BRIDGE =
  /#\[\s*(?:napi|wasm_bindgen)(?:\(|\])|\bnapi_derive\b|\bnapi::|\bwasm_bindgen(?:::|\b)|\bwasm-pack\b/;

const JS_FFI =
  /\bWebAssembly\s*\.\s*(?:instantiate|compile|Module|Instance)\b|\bprocess\.dlopen\b/;

export interface MigrationFileInput {
  relativePath: string;
  language: CcMigrationLanguage;
  loc: number;
  rloc: number;
  maxComplexity: number;
  fanIn: number;
  bridge: boolean;
}

export interface MigrationLinkInput {
  from: string;
  to: string;
  kind: "wasm" | "native";
}

export interface MigrationResult {
  nodes: Map<string, CcMigrationNode>;
  edges: MigrationLinkInput[];
  summary: CcMigrationSummary;
}

export function languageForPath(relativePath: string): CcMigrationLanguage | null {
  const lower = relativePath.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot === -1) return null;
  return EXTENSION_LANGUAGE[lower.slice(dot)] ?? null;
}

export function isTsJsLanguage(language: CcMigrationLanguage): boolean {
  return language === "ts" || language === "js";
}

export function isNativeLanguage(language: CcMigrationLanguage): boolean {
  return language === "wasm" || language === "node";
}

/**
 * LOC/RLOC de Rust sin parser.
 *
 * Ignora comentarios de línea y de bloque (anidados), respeta strings normales,
 * raw strings y char literals, y no cuenta líneas en blanco como código.
 */
export function measureRustSource(source: string): { loc: number; rloc: number } {
  if (source.length === 0) return { loc: 0, rloc: 0 };

  const loc = countPhysicalLines(source);
  const codeLines = new Set<number>();
  let line = 0;
  let lineHasCode = false;
  let blockDepth = 0;
  let inString = false;
  let inChar = false;
  let escaped = false;
  let rawHashes = -1;

  const mark = (): void => {
    lineHasCode = true;
  };

  const newline = (): void => {
    if (lineHasCode) codeLines.add(line);
    line++;
    // El contenido de un string multilínea sigue siendo código.
    lineHasCode = inString || rawHashes >= 0;
  };

  for (let index = 0; index < source.length; index++) {
    const current = source[index] as string;
    const next = source[index + 1] as string | undefined;

    if (current === "\r") {
      if (next === "\n") continue;
      newline();
      continue;
    }
    if (current === "\n") {
      newline();
      continue;
    }

    if (blockDepth > 0) {
      if (current === "/" && next === "*") {
        blockDepth++;
        index++;
      } else if (current === "*" && next === "/") {
        blockDepth--;
        index++;
      }
      continue;
    }

    if (rawHashes >= 0) {
      if (current === "\"") {
        let hashes = 0;
        while (source[index + 1 + hashes] === "#") hashes++;
        if (hashes >= rawHashes) {
          index += rawHashes;
          rawHashes = -1;
        }
      }
      continue;
    }

    if (inString) {
      mark();
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === "\"") inString = false;
      continue;
    }

    if (inChar) {
      mark();
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === "'") inChar = false;
      continue;
    }

    if (current === "/" && next === "/") {
      while (
        index + 1 < source.length &&
        source[index + 1] !== "\n" &&
        source[index + 1] !== "\r"
      ) {
        index++;
      }
      continue;
    }

    if (current === "/" && next === "*") {
      blockDepth = 1;
      index++;
      continue;
    }

    if (current === "r" || (current === "b" && next === "r")) {
      let cursor = current === "r" ? index + 1 : index + 2;
      let hashes = 0;
      while (source[cursor] === "#") {
        hashes++;
        cursor++;
      }
      if (source[cursor] === "\"") {
        rawHashes = hashes;
        index = cursor;
        mark();
        continue;
      }
    }

    if (current === "\"") {
      inString = true;
      mark();
      continue;
    }

    if (current === "'" && isRustCharLiteral(source, index)) {
      inChar = true;
      mark();
      continue;
    }

    if (current.trim() !== "") mark();
  }

  if (lineHasCode) codeLines.add(line);
  return { loc, rloc: codeLines.size };
}

export function rustIsBridge(source: string): boolean {
  return RUST_BRIDGE.test(source);
}

export function jsIsBridge(source: string, specifiers: readonly string[]): boolean {
  return (
    specifiers.some((specifier) => ffiKindForSpecifier(specifier) !== null) ||
    JS_FFI.test(source)
  );
}

/** Devuelve el tipo de frontera si el specifier apunta a un artefacto nativo. */
export function ffiKindForSpecifier(specifier: string): "wasm" | "native" | null {
  const clean = specifier.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
  if (clean.endsWith(".wasm")) return "wasm";
  if (clean.endsWith(".node")) return "native";
  return null;
}

export function buildMigration(
  files: readonly MigrationFileInput[],
  links: readonly MigrationLinkInput[]
): MigrationResult {
  const sortedFiles = [...files].sort((left, right) =>
    compareStrings(left.relativePath, right.relativePath)
  );
  const sortedLinks = [...links].sort(
    (left, right) =>
      compareStrings(left.from, right.from) ||
      compareStrings(left.to, right.to) ||
      compareStrings(left.kind, right.kind)
  );

  const crossings = new Map<string, number>();
  for (const link of sortedLinks) {
    crossings.set(link.from, (crossings.get(link.from) ?? 0) + 1);
    crossings.set(link.to, (crossings.get(link.to) ?? 0) + 1);
  }

  const nodes = new Map<string, CcMigrationNode>();
  const status: Record<CcMigrationStatus, number> = {
    js: 0,
    rust: 0,
    bridge: 0,
    native: 0
  };
  const languageStats = new Map<CcMigrationLanguage, CcMigrationLanguageStats>();
  let migrationDebt = 0;
  let ffiCrossings = 0;

  for (const file of sortedFiles) {
    const fileStatus: CcMigrationStatus = isNativeLanguage(file.language)
      ? "native"
      : file.bridge
        ? "bridge"
        : file.language === "rust"
          ? "rust"
          : "js";
    const debt = isTsJsLanguage(file.language)
      ? (file.maxComplexity + 1) * (1 + file.fanIn)
      : undefined;
    const fileCrossings = crossings.get(file.relativePath) ?? 0;

    nodes.set(file.relativePath, {
      language: file.language,
      status: fileStatus,
      loc: file.loc,
      rloc: file.rloc,
      ...(debt !== undefined ? { debt } : {}),
      crossings: fileCrossings
    });

    status[fileStatus]++;
    migrationDebt += debt ?? 0;
    ffiCrossings += fileCrossings;

    const stats = languageStats.get(file.language) ?? { files: 0, loc: 0, rloc: 0 };
    stats.files++;
    stats.loc += file.loc;
    stats.rloc += file.rloc;
    languageStats.set(file.language, stats);
  }

  const languages: CcMigrationSummary["languages"] = {};
  for (const language of LANGUAGE_ORDER) {
    const stats = languageStats.get(language);
    if (stats) languages[language] = stats;
  }

  return {
    nodes,
    edges: sortedLinks,
    summary: {
      files: sortedFiles.length,
      languages,
      status,
      bridgeFiles: status.bridge,
      ffiEdges: sortedLinks.length,
      ffiCrossings,
      migrationDebt
    }
  };
}

function isRustCharLiteral(source: string, index: number): boolean {
  const next = source[index + 1];
  if (next === undefined || next === "\n" || next === "\r") return false;
  if (next === "\\") return true;
  return source[index + 2] === "'";
}

function countPhysicalLines(source: string): number {
  if (source.length === 0) return 0;

  let lines = 1;
  for (let index = 0; index < source.length; index++) {
    const code = source.charCodeAt(index);
    if (code === 10) {
      lines++;
    } else if (code === 13 && source.charCodeAt(index + 1) !== 10) {
      lines++;
    }
  }

  const last = source.charCodeAt(source.length - 1);
  return last === 10 || last === 13 ? lines - 1 : lines;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
