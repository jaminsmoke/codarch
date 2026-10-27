import { lazy, Suspense, useEffect, useState } from "react";
import type { CodeRequest, CodeSnippet } from "./platform";

const CodeEditor = lazy(() => import("./CodeEditor"));

/**
 * El fichero entero, en lugar del mapa (ADR 0087).
 *
 * Se abre con doble clic en su bloque y se cierra con la ruta, con `Esc` o con
 * su botón de vuelta: no hay pestaña. Es el mismo editor de la ficha, de solo
 * lectura, con su canaleta y su trozo de carga.
 */
export function FileCodeView({
  path,
  load,
  onClose
}: {
  path: string;
  load: (request: CodeRequest) => Promise<CodeSnippet | null>;
  onClose: () => void;
}) {
  const [code, setCode] = useState<CodeSnippet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    // `end` va al tope porque la plataforma que lee de memoria el navegador
    // recorta con él; el servidor y el escritorio lo ignoran cuando es entero.
    void load({ path, start: 1, end: Number.MAX_SAFE_INTEGER, whole: true }).then(
      (snippet) => {
        if (!live) return;
        if (snippet) setCode(snippet);
        else setError("No se pudo leer el código de este fichero.");
      }
    );
    return () => {
      live = false;
    };
  }, [path, load]);

  const lines = code
    ? code.end < code.total
      ? `líneas 1–${code.end} de ${code.total}`
      : `${code.total} líneas`
    : null;

  return (
    <div className="code-stage">
      <div className="code-stage-head">
        <span className="code-stage-where">
          <button
            className="code-back"
            type="button"
            onClick={onClose}
            title="Volver al mapa (Esc)"
          >
            ← Mapa
          </button>
          <span className="mono">{path}</span>
        </span>
        {lines ? <span className="mono">{lines}</span> : null}
      </div>
      <div className="code-stage-body">
        {error ? (
          <p className="muted small">{error}</p>
        ) : !code ? (
          <p className="muted small">Cargando el código…</p>
        ) : (
          <Suspense
            fallback={<p className="muted small">Cargando el editor…</p>}
          >
            <CodeEditor lines={code.lines} start={code.start} path={path} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
