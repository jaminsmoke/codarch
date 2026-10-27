import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { lineLabel, snippetState } from "../src/codeEditorState";

describe("el estado del editor de la ficha", () => {
  const lines = ["export function a() {", "  return 1;", "}"];

  it("numera la canaleta con las líneas del fichero", () => {
    expect([1, 2, 3].map(lineLabel(195))).toEqual(["195", "196", "197"]);
  });

  it("monta el documento con las líneas de la muestra", () => {
    const state = snippetState({ lines, start: 195, path: "a.ts" });
    expect(state.doc.lines).toBe(3);
    expect(state.doc.toString()).toBe(lines.join("\n"));
  });

  it("es de solo lectura y no se puede editar", () => {
    const state = snippetState({ lines, start: 1, path: "a.tsx" });
    expect(state.facet(EditorState.readOnly)).toBe(true);
    expect(state.facet(EditorView.editable)).toBe(false);
  });
});
