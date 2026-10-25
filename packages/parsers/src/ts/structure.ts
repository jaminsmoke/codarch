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

/** Las salidas de un `export_statement`. */
export function exportSurface(node: SyntaxNodeLike): ParsedExport[] {
  const line = node.startPosition.row + 1;
  const typeOnly = node.children.some((child) => child.type === "type");
  const sourceNode =
    node.childForFieldName("source") ??
    node.namedChildren.find((child) => child.type === "string");
  const source = sourceNode ? stringLiteralValue(sourceNode) ?? undefined : undefined;
  const isDefault = node.children.some((child) => child.type === "default");
  const declaration =
    node.childForFieldName("declaration") ??
    node.namedChildren.find((child) => EXPORT_DECLARATIONS.has(child.type));

  if (isDefault) {
    const local = declaration ? declaredNames(declaration)[0] : undefined;
    return [
      {
        name: "default",
        ...(local ? { local } : {}),
        kind: "default",
        ...(typeOnly ? { typeOnly } : {}),
        line
      }
    ];
  }

  if (declaration) {
    return declaredNames(declaration).map((name) => ({
      name,
      kind: "declaration" as const,
      ...(typeOnly ? { typeOnly } : {}),
      line
    }));
  }

  const clause = node.namedChildren.find(
    (child) => child.type === "export_clause"
  );
  if (clause) {
    const exports: ParsedExport[] = [];
    for (const specifier of clause.namedChildren) {
      if (specifier.type !== "export_specifier") continue;
      const identifiers = specifier.namedChildren.filter(
        (inner) => inner.type === "identifier"
      );
      const original = identifiers[0]?.text;
      if (!original) continue;
      const alias = identifiers[1]?.text;
      exports.push({
        name: alias ?? original,
        ...(alias ? { local: original } : {}),
        ...(source ? { source } : {}),
        kind: "named",
        ...(typeOnly ? { typeOnly } : {}),
        line
      });
    }
    return exports;
  }

  const namespace = node.namedChildren.find(
    (child) => child.type === "namespace_export"
  );
  if (namespace) {
    const name = namespace.namedChildren.find(
      (inner) => inner.type === "identifier"
    );
    return [
      {
        name: `* as ${name?.text ?? "?"}`,
        ...(source ? { source } : {}),
        kind: "namespace",
        ...(typeOnly ? { typeOnly } : {}),
        line
      }
    ];
  }

  if (source) {
    return [
      {
        name: "*",
        source,
        kind: "all",
        ...(typeOnly ? { typeOnly } : {}),
        line
      }
    ];
  }

  return [];
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
