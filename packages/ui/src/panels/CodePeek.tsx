import { lazy, Suspense, useMemo, useState } from "react";
import type {
  CcMember,
  CcSymbol
} from "@codarch/schema/browser";
import type { RenderFile } from "@codarch/render/browser";
import type { CodeSnippet, EditorRequest } from "../platform";

/** El editor de la ficha va en su propio trozo: el mapa no lo paga (ADR 0086). */
const CodeEditor = lazy(() => import("../CodeEditor"));

/** Lo que se abre bajo una fila: un símbolo o un miembro de clase. */
export interface CodeTarget {
  id: string;
  name: string;
  path: string;
  line: number;
  lines?: number;
}

/** El destino de la fila de un símbolo: su nombre, su línea y su cuerpo. */
export function symbolTarget(file: RenderFile, symbol: CcSymbol): CodeTarget {
  return {
    id: `symbol:${symbol.kind}:${symbol.name}:${symbol.line}`,
    name: symbol.name,
    path: file.path,
    line: symbol.line,
    lines: symbol.lines
  };
}

/** El destino de la fila de un miembro: se nombra con su dueño delante. */
export function memberTarget(
  file: RenderFile,
  owner: string,
  member: CcMember
): CodeTarget {
  return {
    id: `member:${owner}:${member.name}:${member.line}`,
    name: `${owner}.${member.name}`,
    path: file.path,
    line: member.line,
    lines: member.lines
  };
}

/**
 * Quita la sangría común de una muestra de código.
 *
 * El símbolo se enseña desde la columna 0 aunque en el fichero viva dentro de
 * tres bloques: la muestra se lee mejor y las líneas largas caben en el panel
 * sin barra horizontal. Las líneas en blanco se quedan en blanco.
 */
export function dedentLines(lines: readonly string[]): string[] {
  let common = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    if (line.trim() === "") continue;
    const indent = line.length - line.trimStart().length;
    if (indent < common) common = indent;
  }
  if (!Number.isFinite(common) || common === 0) return lines.slice();
  return lines.map((line) => line.slice(common));
}

/** La muestra de código de un símbolo, con su editor y su copia de la ruta. */
export function InlineCode({
  state,
  onOpenEditor
}: {
  state: {
    target: CodeTarget;
    snippet: CodeSnippet | null;
    loading: boolean;
    error: string | null;
  };
  onOpenEditor: (request: EditorRequest) => Promise<boolean>;
}) {
  const { target, snippet, loading, error } = state;
  const [message, setMessage] = useState<string | null>(null);

  // La muestra va sin la sangría común: el símbolo empieza en la columna 0 y
  // las líneas largas caben en el panel sin barra horizontal.
  const codeLines = useMemo(
    () => (snippet ? dedentLines(snippet.lines) : []),
    [snippet]
  );

  const openEditor = async (): Promise<void> => {
    const ok = await onOpenEditor({ path: target.path, line: target.line });
    setMessage(
      ok
        ? null
        : "No se pudo abrir el editor. Copia la ruta y pégala en tu editor."
    );
  };

  const copyPath = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(`${target.path}:${target.line}`);
      setMessage("Ruta copiada.");
    } catch {
      setMessage(`No se pudo copiar. La ruta es ${target.path}:${target.line}`);
    }
  };

  return (
    <div className="symbol-code">
      <div className="symbol-code-head">
        <span>Código</span>
        <span className="mono">
          {snippet
            ? `líneas ${snippet.start}–${snippet.end}`
            : `línea ${target.line}`}
        </span>
        <span className="symbol-code-actions">
          <button type="button" onClick={() => void openEditor()}>
            Editor
          </button>
          <button type="button" onClick={() => void copyPath()}>
            Copiar ruta
          </button>
        </span>
      </div>
      {message ? (
        <p className="muted tiny" role="status">
          {message}
        </p>
      ) : null}
      {loading ? (
        <p className="muted small">Cargando el código…</p>
      ) : error ? (
        <p className="muted small">No se pudo leer el código: {error}</p>
      ) : snippet && codeLines.length > 0 ? (
        <>
          <div role="group" aria-label={`Código de ${target.name}`}>
            <Suspense
              fallback={<p className="muted small">Cargando el código…</p>}
            >
              <CodeEditor
                lines={codeLines}
                start={snippet.start}
                path={target.path}
              />
            </Suspense>
          </div>
          {snippet.end < snippet.total ? (
            <p className="muted tiny code-note">
              Se muestran las líneas {snippet.start}–{snippet.end} de{" "}
              {snippet.total}.
            </p>
          ) : null}
        </>
      ) : (
        <p className="muted small">
          El código no está disponible en esta plataforma.
        </p>
      )}
    </div>
  );
}
