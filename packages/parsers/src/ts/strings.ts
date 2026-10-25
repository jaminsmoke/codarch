import type { SyntaxNodeLike } from "./measure";

/**
 * El valor de un literal de texto, sin comillas y con los escapes resueltos.
 *
 * Vive aparte de `measure.ts` para que la superficie de imports y exports lo
 * use sin crear un ciclo: `measure` importa los nombres de `structure`, y
 * `structure` necesita leer strings.
 */
export function stringLiteralValue(node: SyntaxNodeLike): string | null {
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
