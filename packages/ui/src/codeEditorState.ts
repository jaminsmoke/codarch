import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/**
 * El estado del editor de la ficha (ADR 0086).
 *
 * Vive aparte del componente para poder probarlo sin navegador: el documento,
 * el solo lectura y la canaleta se comprueban aquí. Los colores no son los de
 * CodeMirror sino las clases `.token.*` de `styles.css`, así que el bloque no
 * tiene dos paletas.
 */
const tokens = HighlightStyle.define([
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment],
    class: "token comment"
  },
  {
    tag: [
      tags.punctuation,
      tags.bracket,
      tags.squareBracket,
      tags.brace,
      tags.paren,
      tags.angleBracket
    ],
    class: "token punctuation"
  },
  {
    tag: [tags.propertyName, tags.attributeName, tags.tagName],
    class: "token property"
  },
  { tag: [tags.bool, tags.number], class: "token boolean" },
  {
    tag: [tags.string, tags.character, tags.attributeValue],
    class: "token string"
  },
  { tag: [tags.operator, tags.url], class: "token operator" },
  {
    tag: [
      tags.keyword,
      tags.controlKeyword,
      tags.definitionKeyword,
      tags.moduleKeyword,
      tags.self,
      tags.atom,
      tags.modifier
    ],
    class: "token keyword"
  },
  {
    tag: [
      tags.function(tags.variableName),
      tags.function(tags.propertyName),
      tags.className,
      tags.typeName
    ],
    class: "token function"
  },
  {
    tag: [tags.regexp, tags.special(tags.string)],
    class: "token regex"
  }
]);

/**
 * La canaleta numera el fichero, no la muestra: la primera línea es la que
 * dice la plataforma (1-based).
 */
export function lineLabel(start: number): (line: number) => string {
  return (line) => String(line + start - 1);
}

/** El estado del editor, de solo lectura y con la canaleta del fichero. */
export function snippetState({
  lines,
  start,
  path
}: {
  lines: readonly string[];
  start: number;
  path: string;
}): EditorState {
  const jsx = /\.(tsx|jsx)$/i.test(path);
  const plain = /\.[cm]?jsx?$/i.test(path);
  return EditorState.create({
    doc: lines.join("\n"),
    extensions: [
      lineNumbers({ formatNumber: lineLabel(start) }),
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      EditorView.lineWrapping,
      javascript({ jsx, typescript: !plain }),
      syntaxHighlighting(tokens)
    ]
  });
}
