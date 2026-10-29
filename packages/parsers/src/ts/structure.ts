import type { ParsedExport, ParsedMember } from "../types";
import { stringLiteralValue } from "./strings";
import type { SyntaxNodeLike } from "./measure";

/**
 * Lo que un fichero declara sin ser un símbolo (ADR 0064).
 *
 * - **Miembros**: campos de clase y propiedades del constructor. No tienen
 *   identidad propia: viven dentro de la clase.
 * - **Superficie**: qué nombres entran y salen. Los imports ya se recogen para
 *   el grafo; aquí se les añaden los nombres. Los exports se recogen aparte.
 */

const EXPORT_DECLARATIONS = new Set([
  "function_declaration",
  "generator_function_declaration",
  "class_declaration",
  "abstract_class_declaration",
  "interface_declaration",
  "type_alias_declaration",
  "enum_declaration",
  "lexical_declaration",
  "variable_declaration"
]);

/** Los nombres que trae un `import_statement`. */
export function importedNames(node: SyntaxNodeLike): string[] {
  const clause = node.namedChildren.find(
    (child) => child.type === "import_clause"
  );
  if (!clause) return [];

  const names: string[] = [];
  for (const child of clause.namedChildren) {
    if (child.type === "identifier") {
      names.push(`default as ${child.text}`);
      continue;
    }
    if (child.type === "namespace_import") {
      const name = child.namedChildren.find(
        (inner) => inner.type === "identifier"
      );
      names.push(`* as ${name?.text ?? "?"}`);
      continue;
    }
    if (child.type !== "named_imports") continue;
    for (const specifier of child.namedChildren) {
      if (specifier.type !== "import_specifier") continue;
      const identifiers = specifier.namedChildren.filter(
        (inner) => inner.type === "identifier"
      );
      const typeOnly = specifier.children.some(
        (inner) => inner.type === "type"
      );
      const original = identifiers[0]?.text;
      if (!original) continue;
      const alias = identifiers[1]?.text;
      names.push(
        `${typeOnly ? "type " : ""}${original}${alias ? ` as ${alias}` : ""}`
      );
    }
  }
  return names;
}

/** Lo que un `export_statement` dice de sí mismo, ya resuelto. */
interface ExportShape {
  line: number;
  /** `export type { … }`: lo que sale no es código. */
  typeOnly: boolean;
  /** El módulo de origen, si reexporta. */
  source: string | undefined;
  /** `export default …`. */
  isDefault: boolean;
  /** La declaración que se exporta, si la lleva en el mismo nodo. */
  declaration: SyntaxNodeLike | undefined;
}

/** Las salidas de un `export_statement`. */
export function exportSurface(node: SyntaxNodeLike): ParsedExport[] {
  const shape = exportShape(node);
  if (shape.isDefault) return [defaultExport(shape)];
  if (shape.declaration) return declarationExports(shape);

  const clause = findChild(node, "export_clause");
  if (clause) return namedExports(clause, shape);

  const namespace = findChild(node, "namespace_export");
  if (namespace) return [namespaceExport(namespace, shape)];

  return shape.source ? [allExport(shape)] : [];
}

/** Lee del nodo lo que comparten todas las formas de exportar. */
function exportShape(node: SyntaxNodeLike): ExportShape {
  const sourceNode =
    node.childForFieldName("source") ?? findChild(node, "string");

  return {
    line: node.startPosition.row + 1,
    typeOnly: node.children.some((child) => child.type === "type"),
    source: sourceNode ? stringLiteralValue(sourceNode) ?? undefined : undefined,
    isDefault: node.children.some((child) => child.type === "default"),
    declaration:
      node.childForFieldName("declaration") ??
      node.namedChildren.find((child) => EXPORT_DECLARATIONS.has(child.type))
  };
}

/** `export default …`, con el nombre local si lo tiene. */
function defaultExport(shape: ExportShape): ParsedExport {
  const local = shape.declaration
    ? declaredNames(shape.declaration)[0]
    : undefined;

  return {
    name: "default",
    ...(local ? { local } : {}),
    kind: "default",
    ...(shape.typeOnly ? { typeOnly: true } : {}),
    line: shape.line
  };
}

/** `export function…`, `export const…`: un nombre por lo que declara. */
function declarationExports(shape: ExportShape): ParsedExport[] {
  const declaration = shape.declaration as SyntaxNodeLike;
  return declaredNames(declaration).map((name) => ({
    name,
    kind: "declaration" as const,
    ...(shape.typeOnly ? { typeOnly: true } : {}),
    line: shape.line
  }));
}

/** `export { a, b as c }`, con o sin módulo de origen. */
function namedExports(
  clause: SyntaxNodeLike,
  shape: ExportShape
): ParsedExport[] {
  const exports: ParsedExport[] = [];

  for (const specifier of clause.namedChildren) {
    if (specifier.type !== "export_specifier") continue;
    const exported = namedExport(specifier, shape);
    if (exported) exports.push(exported);
  }

  return exports;
}

/** Un nombre de `export { … }`: lo de dentro y el alias con el que sale. */
function namedExport(
  specifier: SyntaxNodeLike,
  shape: ExportShape
): ParsedExport | null {
  const identifiers = specifier.namedChildren.filter(
    (inner) => inner.type === "identifier"
  );
  const original = identifiers[0]?.text;
  if (!original) return null;
  const alias = identifiers[1]?.text;

  return {
    name: alias ?? original,
    ...(alias ? { local: original } : {}),
    ...(shape.source ? { source: shape.source } : {}),
    kind: "named",
    ...(shape.typeOnly ? { typeOnly: true } : {}),
    line: shape.line
  };
}

/** `export * as ns from "…"`. */
function namespaceExport(
  namespace: SyntaxNodeLike,
  shape: ExportShape
): ParsedExport {
  const name = namespace.namedChildren.find(
    (inner) => inner.type === "identifier"
  );

  return {
    name: `* as ${name?.text ?? "?"}`,
    ...(shape.source ? { source: shape.source } : {}),
    kind: "namespace",
    ...(shape.typeOnly ? { typeOnly: true } : {}),
    line: shape.line
  };
}

/** `export * from "…"`: sale todo el módulo. */
function allExport(shape: ExportShape): ParsedExport {
  return {
    name: "*",
    source: shape.source as string,
    kind: "all",
    ...(shape.typeOnly ? { typeOnly: true } : {}),
    line: shape.line
  };
}

/** El primer hijo con ese tipo, si lo hay. */
function findChild(
  node: SyntaxNodeLike,
  type: string
): SyntaxNodeLike | undefined {
  return node.namedChildren.find((child) => child.type === type);
}

/** Los nombres que declara una declaración exportada. */
function declaredNames(node: SyntaxNodeLike): string[] {
  if (node.type === "lexical_declaration" || node.type === "variable_declaration") {
    const names: string[] = [];
    for (const declarator of node.namedChildren) {
      if (declarator.type !== "variable_declarator") continue;
      const pattern = declarator.childForFieldName("name");
      if (!pattern) continue;
      if (pattern.type === "identifier") names.push(pattern.text);
      else {
        for (const inner of pattern.namedChildren) {
          if (inner.type === "identifier") names.push(inner.text);
        }
      }
    }
    return names;
  }

  const name = node.childForFieldName("name");
  return name ? [name.text] : [];
}

/** Los campos y propiedades del constructor de una clase. */
export function membersOfClass(
  classNode: SyntaxNodeLike,
  owner: string
): ParsedMember[] {
  const body = classNode.namedChildren.find(
    (child) => child.type === "class_body"
  );
  if (!body) return [];

  const members: ParsedMember[] = [];
  for (const member of body.namedChildren) {
    if (member.type === "public_field_definition") {
      const nameNode =
        member.childForFieldName("name") ??
        member.namedChildren.find((child) => child.type === "property_identifier");
      if (!nameNode) continue;
      members.push({
        owner,
        name: nameNode.text,
        line: member.startPosition.row + 1,
        lines: member.endPosition.row - member.startPosition.row + 1,
        from: "field"
      });
      continue;
    }

    if (member.type !== "method_definition") continue;
    const methodName = member.childForFieldName("name");
    if (methodName?.text !== "constructor") continue;
    const parameters =
      member.childForFieldName("parameters") ??
      member.namedChildren.find((child) => child.type === "formal_parameters");
    if (!parameters) continue;

    for (const parameter of parameters.namedChildren) {
      if (
        parameter.type !== "required_parameter" &&
        parameter.type !== "optional_parameter"
      ) {
        continue;
      }
      const isProperty =
        parameter.namedChildren.some(
          (child) => child.type === "accessibility_modifier"
        ) || /^(public|private|protected|readonly)\b/.test(parameter.text);
      if (!isProperty) continue;
      const nameNode = parameter.namedChildren.find(
        (child) => child.type === "identifier"
      );
      if (!nameNode) continue;
      members.push({
        owner,
        name: nameNode.text,
        line: parameter.startPosition.row + 1,
        lines: parameter.endPosition.row - parameter.startPosition.row + 1,
        from: "parameter"
      });
    }
  }

  return members.sort((left, right) => left.line - right.line);
}

/** El nombre de una clase, o `null` si es anónima. */
export function classOwner(node: SyntaxNodeLike): string | null {
  return node.childForFieldName("name")?.text ?? null;
}

/**
 * Los miembros del fichero, en un recorrido aparte.
 *
 * Es el camino lento que usa el test de paridad; el análisis normal los recoge
 * en el mismo paseo que las métricas y los símbolos.
 */
export function collectMembers(root: SyntaxNodeLike): ParsedMember[] {
  const members: ParsedMember[] = [];
  const stack: SyntaxNodeLike[] = [root];

  while (stack.length > 0) {
    const node = stack.pop() as SyntaxNodeLike;

    if (
      node.type === "class_declaration" ||
      node.type === "abstract_class_declaration"
    ) {
      const owner = classOwner(node);
      if (owner) members.push(...membersOfClass(node, owner));
    } else if (node.type === "variable_declarator") {
      const nameNode = node.childForFieldName("name");
      const value = node.childForFieldName("value");
      if (nameNode?.type === "identifier" && value?.type === "class") {
        members.push(...membersOfClass(value, nameNode.text));
      }
    }

    for (let index = node.children.length - 1; index >= 0; index--) {
      stack.push(node.children[index] as SyntaxNodeLike);
    }
  }

  return members.sort((left, right) => left.line - right.line);
}

/** Las salidas del fichero, en un recorrido aparte. */
export function collectExports(root: SyntaxNodeLike): ParsedExport[] {
  const exports: ParsedExport[] = [];
  const stack: SyntaxNodeLike[] = [root];

  while (stack.length > 0) {
    const node = stack.pop() as SyntaxNodeLike;
    if (node.type === "export_statement") exports.push(...exportSurface(node));
    for (let index = node.children.length - 1; index >= 0; index--) {
      stack.push(node.children[index] as SyntaxNodeLike);
    }
  }

  return exports.sort((left, right) => left.line - right.line);
}
