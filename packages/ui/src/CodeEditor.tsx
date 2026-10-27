import { useEffect, useRef } from "react";
import { EditorView } from "@codemirror/view";
import { snippetState } from "./codeEditorState";

/**
 * El código de la ficha con CodeMirror 6, de solo lectura (ADR 0086).
 *
 * CodeMirror pinta solo las líneas que caben en el viewport, así que el coste
 * deja de crecer con el tamaño de la muestra. Los colores y el marco son los
 * del bloque de siempre: el editor solo aporta la canaleta y el troceado del
 * pintado.
 *
 * Va en su propio trozo (carga diferida) y no captura `Esc` ni el retroceso:
 * esas teclas siguen siendo del mapa. El montaje deja su medida en
 * `codarch-code-mount`, que es la que sostiene el ADR 0086.
 */
export default function CodeEditor({
  lines,
  start,
  path
}: {
  lines: readonly string[];
  /** La primera línea de la muestra, 1-based: la canaleta numera el fichero. */
  start: number;
  path: string;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current) return;
    performance.mark("codarch-code-start");
    const view = new EditorView({
      parent: host.current,
      state: snippetState({ lines, start, path })
    });
    performance.mark("codarch-code-end");
    performance.measure(
      "codarch-code-mount",
      "codarch-code-start",
      "codarch-code-end"
    );
    return () => view.destroy();
  }, [lines, start, path]);

  return <div className="code-view code-editor" ref={host} />;
}
