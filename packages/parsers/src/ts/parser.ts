import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import type { FileParseResult, ImportKind, ParsedImport, SourceParser, Metrics } from "../types";

const EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"] as const;

/**
 * Nodos que representan una función implementada. Las firmas de interfaces y
 * los métodos abstractos no cuentan: no tienen cuerpo que medir.
 */
const FUNCTION_TYPES = new Set([
  "function_declaration",
  "function_expression",
  "arrow_function",
  "method_definition",
  "generator_function_declaration",
  "generator_function"
]);

/** Puntos de decisión de complejidad ciclomática. */
const DECISION_TYPES = new Set([
  "if_statement",
  "for_statement",
  "for_in_statement",
  "while_statement",
  "do_statement",
  "switch_case",
  "catch_clause",
  "ternary_expression",
  "conditional_expression"
]);

const LOGICAL_OPERATORS = new Set(["&&", "||", "??"]);

/**
 * Parser TypeScript/JavaScript basado en tree-sitter.
 *
 * Devuelve solo agregados por fichero. No retiene el árbol ni el fuente: el
 * análisis de un repositorio procesa un fichero cada vez.
 */
export class TypeScriptParser implements SourceParser {
  readonly name = "typescript";
  readonly extensions = EXTENSIONS;

  private readonly tsParser = new Parser();
  private readonly tsxParser = new Parser();

  constructor() {
    this.tsParser.setLanguage(TypeScript.typescript);
    this.tsxParser.setLanguage(TypeScript.tsx);
  }

  parse(source: string, filePath: string): FileParseResult {
    const parser = usesTsxGrammar(filePath) ? this.tsxParser : this.tsParser;
    const root = parser.parse(source).rootNode;
    return {
      metrics: measureSource(source, root),
      imports: collectImports(root)
    };
  }
}

function usesTsxGrammar(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.endsWith(".tsx") ||
    lower.endsWith(".jsx") ||
    lower.endsWith(".js") ||
    lower.endsWith(".mjs") ||
    lower.endsWith(".cjs")
  );
}

function measureSource(source: string, root: Parser.SyntaxNode): Metrics {
  const codeLines = new Set<number>();
  const stack: Parser.SyntaxNode[] = [root];
  let functions = 0;
  let maxComplexity = 0;
  let maxFunctionLength = 0;

  while (stack.length > 0) {
    const node = stack.pop() as Parser.SyntaxNode;
    if (node.type === "comment" || node.type === "hash_bang_line") continue;

    if (node.childCount === 0) {
      if (node.text.trim() !== "") {
        for (let row = node.startPosition.row; row <= node.endPosition.row; row++) {
          codeLines.add(row);
        }
      }
      continue;
    }

    if (FUNCTION_TYPES.has(node.type)) {
      functions++;
      const complexity = functionComplexity(node);
      const length = node.endPosition.row - node.startPosition.row + 1;
      if (complexity > maxComplexity) maxComplexity = complexity;
      if (length > maxFunctionLength) maxFunctionLength = length;
    }

    for (const child of node.children) stack.push(child);
  }

  return {
    loc: countLines(source),
    rloc: codeLines.size,
    functions,
    maxComplexity,
    maxFunctionLength
  };
}

/**
 * Complejidad ciclomática de una función: 1 + decisiones de su cuerpo.
 * No desciende a funciones anidadas: cada una se mide por separado.
 */
function functionComplexity(fn: Parser.SyntaxNode): number {
  let complexity = 1;
  const body = fn.childForFieldName("body") ?? fn;
  const stack: Parser.SyntaxNode[] = [];

  for (const child of body.children) stack.push(child);

  while (stack.length > 0) {
    const node = stack.pop() as Parser.SyntaxNode;
    if (FUNCTION_TYPES.has(node.type)) continue;

    if (DECISION_TYPES.has(node.type)) complexity++;

    if (
      node.type === "binary_expression" ||
      node.type === "augmented_assignment_expression"
    ) {
      const operator = node.childForFieldName("operator")?.text;
      if (operator && LOGICAL_OPERATORS.has(operator)) complexity++;
    }

    for (const child of node.children) stack.push(child);
  }

  return complexity;
}

/** `loc` cuenta líneas físicas; `rloc` líneas con al menos un token de código. */
function countLines(source: string): number {
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

function collectImports(root: Parser.SyntaxNode): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const stack: Parser.SyntaxNode[] = [root];

  while (stack.length > 0) {
    const node = stack.pop() as Parser.SyntaxNode;

    if (node.type === "import_statement") {
      const source = findImportSource(node);
      const specifier = source ? stringLiteralValue(source) : null;
      if (specifier !== null) {
        const isRequire = node.namedChildren.some(
          (child) => child.type === "import_require_clause"
        );
        imports.push({
          specifier,
          kind: isRequire ? "require" : "static",
          typeOnly: node.children.some((child) => child.type === "type"),
          line: node.startPosition.row + 1
        });
      }
    } else if (node.type === "export_statement") {
      const source = node.childForFieldName("source");
      const specifier = source ? stringLiteralValue(source) : null;
      if (specifier !== null) {
        imports.push({
          specifier,
          kind: "export",
          typeOnly: node.children.some((child) => child.type === "type"),
          line: node.startPosition.row + 1
        });
      }
    } else if (node.type === "call_expression") {
      const kind = callImportKind(node);
      if (kind) {
        const argumentsNode = node.childForFieldName("arguments");
        const first = argumentsNode?.namedChildren[0];
        const specifier = first ? stringLiteralValue(first) : null;
        if (specifier !== null) {
          imports.push({
            specifier,
            kind,
            typeOnly: false,
            line: node.startPosition.row + 1
          });
        }
      }
    }

    // Stack LIFO: empujar en orden inverso para recorrer el fuente en orden.
    for (let index = node.children.length - 1; index >= 0; index--) {
      stack.push(node.children[index] as Parser.SyntaxNode);
    }
  }

  return imports;
}

function findImportSource(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  const direct = node.childForFieldName("source");
  if (direct) return direct;

  const clause = node.namedChildren.find(
    (child) => child.type === "import_require_clause"
  );
  return clause?.childForFieldName("source") ?? null;
}

function callImportKind(node: Parser.SyntaxNode): ImportKind | null {
  const fn = node.childForFieldName("function");
  if (!fn) return null;
  if (fn.type === "import") return "dynamic";
  if (fn.type === "identifier" && fn.text === "require") return "require";
  return null;
}

function stringLiteralValue(node: Parser.SyntaxNode): string | null {
  if (node.type === "string") {
    return decodeStringBody(node.text.slice(1, -1));
  }
  if (node.type === "template_string") {
    const hasSubstitution = node.namedChildren.some(
      (child) => child.type === "template_substitution"
    );
    if (!hasSubstitution) return decodeStringBody(node.text.slice(1, -1));
  }
  return null;
}

function decodeStringBody(body: string): string {
  return body.replace(
    /\\(u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|([\s\S]))/g,
    (_match, _escaped, braced, four, two, character) => {
      if (braced) return String.fromCodePoint(Number.parseInt(braced, 16));
      if (four) return String.fromCharCode(Number.parseInt(four, 16));
      if (two) return String.fromCharCode(Number.parseInt(two, 16));
      switch (character) {
        case "n":
          return "\n";
        case "r":
          return "\r";
        case "t":
          return "\t";
        case "b":
          return "\b";
        case "f":
          return "\f";
        case "v":
          return "\v";
        case "0":
          return "\0";
        default:
          return character;
      }
    }
  );
}
