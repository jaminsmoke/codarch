import Prism from "prismjs";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";

/**
 * El resaltado del código de la ficha (ADR 0067).
 *
 * Prism trabaja línea a línea para conservar los números de línea de la ficha:
 * un comentario o una cadena de varias líneas puede perder el color en las
 * líneas siguientes, pero el texto y los números siempre son los correctos.
 * Prism escapa el HTML del fuente antes de devolverlo, así que se puede pintar
 * con `dangerouslySetInnerHTML` sin inyectar código del repositorio.
 */
export function languageForPath(path: string): "tsx" | "typescript" {
  return /\.(tsx|jsx)$/i.test(path) ? "tsx" : "typescript";
}

export function highlightLine(line: string, path: string): string {
  if (line === "") return "";
  const language = languageForPath(path);
  const grammar = Prism.languages[language];
  if (!grammar) return escapeHtml(line);
  return Prism.highlight(line, grammar, language);
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
