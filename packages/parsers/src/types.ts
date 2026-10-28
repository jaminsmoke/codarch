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

/**
 * A qué apunta un import, tal como lo ve el parser del lenguaje.
 *
 * Los de TS/JS no lo declaran: usa la resolución de módulos, paquetes y alias.
 * Los de Java y Python sí, porque un paquete es una ruta y no hay manifiesto
 * que leer (ADR 0090).
 */
export type ImportTargets =
  | {
      kind: "paths";
      /** Rutas relativas a la raíz, con `/`; la primera que exista gana. */
      paths: string[];
    }
  | {
      /** Un paquete: todos los ficheros de una carpeta, como en Go. */
      kind: "package";
      /** Carpetas relativas a la raíz, con `/`; la primera con ficheros gana. */
      directories: string[];
      /** Las extensiones que forman el paquete: un paquete de Go son sus `.go`. */
      extensions: readonly string[];
      /**
       * El import nombra un paquete del propio módulo (`go.mod`), así que si la
       * carpeta no aparece el import está roto y no es una dependencia.
       */
      required?: boolean;
      /** Lo que cuenta si no aparece ninguna carpeta: plataforma o dependencia. */
      builtin?: boolean;
    }
  | {
      kind: "external";
      /** De la plataforma: `java.util`, `javax.…`; se cuenta como builtin. */
      builtin: boolean;
    };

/**
 * Lo que un parser puede mirar del proyecto antes de medir ficheros.
 *
 * Go necesita el nombre del módulo, que vive en el `go.mod` y no en cada
 * fichero. Se lee una vez por análisis, no una vez por import.
 */
export interface ParserProject {
  /** Lee un fichero por ruta relativa a la raíz del análisis. */
  readFile(relativePath: string): string | null;
}

export interface SourceParser {
  readonly name: string;
  readonly extensions: readonly string[];
  parse(source: string, filePath: string): FileParseResult;
  /**
   * Resuelve la ruta que nombra un import.
   *
   * Recibe el import entero y la ruta del fichero que lo escribe: Python
   * necesita los nombres de un `from … import …` —pueden ser submódulos— y el
   * fichero para resolver los relativos (`from . import x`).
   *
   * Ausente: el análisis resuelve como TS/JS (`ImportResolver`).
   */
  importTargets?(imported: ParsedImport, filePath: string): ImportTargets;
  /**
   * Se llama una vez por análisis, antes de recorrer los ficheros.
   *
   * Para lo que el lenguaje declara fuera de los ficheros que se miden: Go
   * lee aquí su `go.mod`.
   */
  prepare?(project: ParserProject): void;
}
