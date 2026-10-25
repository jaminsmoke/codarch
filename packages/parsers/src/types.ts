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
  /** Nombres que entran: `default as fs`, `* as path`, `a as b`, `type C`. */
  names?: string[];
}

/** Un miembro de una clase: un campo o una propiedad del constructor. */
export interface ParsedMember {
  /** La clase a la que pertenece. */
  owner: string;
  name: string;
  /** Línea 1-based. */
  line: number;
  /** Líneas que ocupa. */
  lines?: number;
  /** `field` si se declara en el cuerpo; `parameter` si viene del constructor. */
  from: "field" | "parameter";
}

/** Una salida del fichero: una declaración exportada o una reexportación. */
export interface ParsedExport {
  /** El nombre con el que sale. `default`, `*` y `* as ns` también son nombres. */
  name: string;
  /** El nombre local cuando hay alias o es un `default` con nombre. */
  local?: string;
  /** El módulo de origen, en una reexportación. */
  source?: string;
  kind: "declaration" | "default" | "named" | "all" | "namespace";
  typeOnly?: boolean;
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
  /**
   * Hash del cuerpo (los tokens, sin comentarios).
   *
   * Es la identidad del símbolo: sobrevive a los renombrados y a las mudanzas
   * (ADR 0026 ✓).
   */
  hash?: string;
}

export interface FileParseResult {
  metrics: Metrics;
  imports: ParsedImport[];
  symbols?: ParsedSymbol[];
  /** Campos y propiedades del constructor, agrupados después por clase. */
  members?: ParsedMember[];
  /** La superficie de salida: declaraciones exportadas y reexportaciones. */
  exports?: ParsedExport[];
}

export interface SourceParser {
  readonly name: string;
  readonly extensions: readonly string[];
  parse(source: string, filePath: string): FileParseResult;
}
