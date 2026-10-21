/**
 * Contrato de un parser de fichero.
 *
 * Los símbolos son opcionales a propósito: la v1 modela ficheros, pero un parser
 * puede devolverlos sin cambiar el resto del pipeline (ADR 0006).
 */
export type Metrics = Record<string, number>;

export type ImportKind = "static" | "dynamic" | "require" | "export";

export interface ParsedImport {
  /** Specifier tal cual aparece en el fuente, sin comillas. */
  specifier: string;
  kind: ImportKind;
  typeOnly: boolean;
  /** Línea 1-based. */
  line: number;
}

export interface ParsedSymbol {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "enum" | "variable";
  /** Línea 1-based. */
  line: number;
  /** Complejidad ciclomática. Solo en las funciones con cuerpo. */
  complexity?: number;
  /** Líneas que ocupa. */
  lines?: number;
}

export interface FileParseResult {
  metrics: Metrics;
  imports: ParsedImport[];
  symbols?: ParsedSymbol[];
}

export interface SourceParser {
  readonly name: string;
  readonly extensions: readonly string[];
  parse(source: string, filePath: string): FileParseResult;
}
