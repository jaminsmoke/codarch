import type { RenderFile } from "@codarch/render/browser";
import { CollapsibleSection } from "../CollapsibleSection";

/** Los ficheros que importa y los que lo usan. */
export function DependenciesSection({
  outgoing,
  incoming,
  edges = [],
  onSelectPath
}: {
  outgoing: readonly RenderFile[];
  incoming: readonly RenderFile[];
  /** Los cruces FFI del fichero, que antes vivían en Reglas (ADR 0104). */
  edges?: ReadonlyArray<{
    direction: "in" | "out";
    path: string;
    kind: string;
  }>;
  onSelectPath: (path: string) => void;
}) {
  if (outgoing.length + incoming.length + edges.length === 0) return null;

  return (
    <CollapsibleSection
      id="file-dependencies"
      title="Dependencias"
      className="section-deps"
      count={outgoing.length + incoming.length + edges.length}
      summary={`${outgoing.length} salidas · ${incoming.length} entradas${
        edges.length > 0 ? ` · ${edges.length} cruces FFI` : ""
      }`}
    >
      <div className="dependency-list">
        {outgoing.length > 0 ? (
          <div className="dependency-group">
            <div className="symbol-group-head">
              <span>Importa</span>
              <span className="symbol-group-line" aria-hidden="true" />
              <span className="mono symbol-group-count">
                {outgoing.length}
              </span>
            </div>
            {outgoing.map((entry) => (
              <DependencyRow
                key={entry.path}
                path={entry.path}
                onSelectPath={onSelectPath}
              />
            ))}
          </div>
        ) : null}

        {incoming.length > 0 ? (
          <div className="dependency-group">
            <div className="symbol-group-head">
              <span>Lo usan</span>
              <span className="symbol-group-line" aria-hidden="true" />
              <span className="mono symbol-group-count">
                {incoming.length}
              </span>
            </div>
            {incoming.map((entry) => (
              <DependencyRow
                key={entry.path}
                path={entry.path}
                onSelectPath={onSelectPath}
              />
            ))}
          </div>
        ) : null}

        {edges.length > 0 ? (
          <div className="dependency-group">
            <div className="symbol-group-head">
              <span>Cruces FFI</span>
              <span className="symbol-group-line" aria-hidden="true" />
              <span className="mono symbol-group-count">
                {edges.length}
              </span>
            </div>
            {edges.map((edge) => (
              <button
                key={`${edge.direction}-${edge.path}-${edge.kind}`}
                type="button"
                className="dependency-row ffi-row"
                title={`${edge.path} · ${edge.kind}`}
                onClick={() => onSelectPath(edge.path)}
              >
                <span className="lens-edge-dir" aria-hidden="true">
                  {edge.direction === "out" ? "→" : "←"}
                </span>
                <span className="mono dependency-path">{edge.path}</span>
                <span className={`lens-flag lens-${edge.kind}`}>
                  {edge.kind}
                </span>
              </button>
            ))}
            <p className="muted tiny card-note">
              Una arista que cruza la frontera de la migración.
            </p>
          </div>
        ) : null}

        <p className="muted tiny card-note">
          Pulsa una ruta para abrir ese fichero.
        </p>
      </div>
    </CollapsibleSection>
  );
}

function DependencyRow({
  path,
  onSelectPath
}: {
  path: string;
  onSelectPath: (path: string) => void;
}) {
  return (
    <button
      type="button"
      className="dependency-row"
      onClick={() => onSelectPath(path)}
      title={`Abrir ${path}`}
    >
      <span className="mono dependency-path">{path}</span>
    </button>
  );
}
