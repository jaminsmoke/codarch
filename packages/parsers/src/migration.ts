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
 * Lo que el escáner de Rust tiene delante: código, un comentario, un string
 * abierto o un char literal.
 */
type RustScanState =
  | "code"
  | "lineComment"
  | "blockComment"
  | "string"
  | "char"
  | "rawString";

interface RustScan {
  source: string;
  /** Carácter que toca leer; siempre el siguiente sin consumir. */
  index: number;
  state: RustScanState;
  line: number;
  lineHasCode: boolean;
  codeLines: Set<number>;
  /** Profundidad del comentario de bloque en curso: Rust los anida. */
  blockDepth: number;
  /** Almohadillas del raw string abierto; -1 cuando no hay ninguno. */
  rawHashes: number;
  /** Barra invertida pendiente de la secuencia de escape en curso. */
  escaped: boolean;
}

/**
 * LOC/RLOC de Rust sin parser.
 *
 * Ignora comentarios de línea y de bloque (anidados), respeta strings normales,
 * raw strings y char literals, y no cuenta líneas en blanco como código.
 */
export function measureRustSource(source: string): { loc: number; rloc: number } {
  if (source.length === 0) return { loc: 0, rloc: 0 };

  const scan = startScan(source);
  while (scan.index < source.length) {
    // El salto de línea se cierra igual esté uno donde esté; el resto es cosa
    // del estado en que se pille el cursor.
    if (stepNewline(scan)) continue;
    stepState(scan);
  }
  if (scan.lineHasCode) scan.codeLines.add(scan.line);

  return { loc: countPhysicalLines(source), rloc: scan.codeLines.size };
}

function startScan(source: string): RustScan {
  return {
    source,
    index: 0,
    state: "code",
    line: 0,
    lineHasCode: false,
    codeLines: new Set<number>(),
    blockDepth: 0,
    rawHashes: -1,
    escaped: false
  };
}

/** Un handler por estado; cada uno consume al menos un carácter. */
function stepState(scan: RustScan): void {
  switch (scan.state) {
    case "lineComment":
      return stepLineComment(scan);
    case "blockComment":
      return stepBlockComment(scan);
    case "string":
      return stepQuoted(scan, "\"");
    case "char":
      return stepQuoted(scan, "'");
    case "rawString":
      return stepRawString(scan);
    default:
      return stepCode(scan);
  }
}

function stepNewline(scan: RustScan): boolean {
  const current = scan.source[scan.index];
  if (current !== "\n" && current !== "\r") return false;

  // `\r\n` es un solo salto: se consumen los dos y se cierra una línea.
  const pair = current === "\r" && scan.source[scan.index + 1] === "\n";
  scan.index += pair ? 2 : 1;
  closeLine(scan);
  return true;
}

function closeLine(scan: RustScan): void {
  if (scan.lineHasCode) scan.codeLines.add(scan.line);
  scan.line++;
  // El contenido de un string multilínea sigue siendo código.
  scan.lineHasCode = scan.state === "string" || scan.state === "rawString";
}

function stepCode(scan: RustScan): void {
  const current = scan.source[scan.index] as string;
  const next = scan.source[scan.index + 1];

  if (current === "/" && next === "/") {
    scan.state = "lineComment";
    scan.index += 2;
    return;
  }
  if (current === "/" && next === "*") {
    scan.state = "blockComment";
    scan.blockDepth = 1;
    scan.index += 2;
    return;
  }
  if (opensRawString(scan)) return;
  if (current === "\"") {
    scan.state = "string";
    scan.index++;
    markCode(scan);
    return;
  }
  if (current === "'" && isRustCharLiteral(scan.source, scan.index)) {
    scan.state = "char";
    scan.index++;
    markCode(scan);
    return;
  }

  if (current.trim() !== "") markCode(scan);
  scan.index++;
}

function stepLineComment(scan: RustScan): void {
  // El salto de línea lo cierra el paso común; aquí solo se gasta la línea.
  while (scan.index < scan.source.length) {
    const current = scan.source[scan.index];
    if (current === "\n" || current === "\r") break;
    scan.index++;
  }
  scan.state = "code";
}

function stepBlockComment(scan: RustScan): void {
  const current = scan.source[scan.index];
  const next = scan.source[scan.index + 1];

  if (current === "/" && next === "*") {
    scan.blockDepth++;
    scan.index += 2;
    return;
  }
  if (current === "*" && next === "/") {
    scan.index += 2;
    scan.blockDepth--;
    if (scan.blockDepth === 0) scan.state = "code";
    return;
  }
  scan.index++;
}

/** Strings y char literals comparten el escape; solo cambia la comilla final. */
function stepQuoted(scan: RustScan, closing: string): void {
  const current = scan.source[scan.index] as string;
  markCode(scan);
  scan.index++;

  if (scan.escaped) {
    scan.escaped = false;
    return;
  }
  if (current === "\\") {
    scan.escaped = true;
    return;
  }
  if (current === closing) scan.state = "code";
}

function stepRawString(scan: RustScan): void {
  if (scan.source[scan.index] !== "\"") {
    scan.index++;
    return;
  }

  const hashes = countHashes(scan.source, scan.index + 1);
  // Una comilla con menos almohadillas de las que abrieron el raw es contenido.
  if (hashes < scan.rawHashes) {
    scan.index++;
    return;
  }

  scan.index += scan.rawHashes + 1;
  scan.rawHashes = -1;
  scan.state = "code";
}

/** Abre un raw string (`r"…"`, `r#"…"#`, `br##"…"##`) si el cursor lo pide. */
function opensRawString(scan: RustScan): boolean {
  const { source } = scan;
  const current = source[scan.index];
  let cursor = scan.index + 1;

  if (current === "b" && source[cursor] === "r") {
    cursor++;
  } else if (current !== "r") {
    return false;
  }

  const hashes = countHashes(source, cursor);
  cursor += hashes;
  if (source[cursor] !== "\"") return false;

  scan.rawHashes = hashes;
  scan.state = "rawString";
  scan.index = cursor + 1;
  markCode(scan);
  return true;
}

function countHashes(source: string, start: number): number {
  let hashes = 0;
  while (source[start + hashes] === "#") hashes++;
  return hashes;
}

function markCode(scan: RustScan): void {
  scan.lineHasCode = true;
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
    const fileStatus = statusFor(file);
    const debt = debtFor(file);
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

/** El estado de un fichero en la lente: nativo, puente, Rust o lo demás. */
function statusFor(file: MigrationFileInput): CcMigrationStatus {
  if (isNativeLanguage(file.language)) return "native";
  if (file.bridge) return "bridge";
  return file.language === "rust" ? "rust" : "js";
}

/** Deuda de migración: (complejidad + 1) × (1 + fan-in). Solo TS/JS. */
function debtFor(file: MigrationFileInput): number | undefined {
  if (!isTsJsLanguage(file.language)) return undefined;
  return (file.maxComplexity + 1) * (1 + file.fanIn);
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
