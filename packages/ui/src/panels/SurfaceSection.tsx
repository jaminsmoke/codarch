import type { CcStructureNode } from "@codarch/schema/browser";
import { CollapsibleSection } from "../CollapsibleSection";
import { surfaceCount, surfaceSummary } from "../structure";

/** Imports y exports: lo que entra y sale sin ser símbolo. */
export function SurfaceSection({ structure }: { structure: CcStructureNode | null }) {
  if (!structure || surfaceCount(structure) === 0) return null;

  return (
    <CollapsibleSection
      id="file-surface"
      title="Superficie"
      className="section-surface"
      count={surfaceCount(structure)}
      summary={surfaceSummary(structure)}
    >
      <div className="surface-list">
        {structure.imports.length > 0 ? (
          <div className="surface-group">
            <div className="symbol-group-head">
              <span>Importa</span>
              <span className="symbol-group-line" aria-hidden="true" />
              <span className="mono symbol-group-count">
                {structure.imports.length}
              </span>
            </div>
            {structure.imports.map((entry) => (
              <div
                key={`${entry.line}-${entry.source}`}
                className="surface-row surface-row-imports"
              >
                <span className="surface-dir" aria-hidden="true">
                  →
                </span>
                <span className="mono surface-source" title={entry.source}>
                  {entry.source}
                </span>
                <span
                  className="surface-names"
                  title={
                    entry.names.length > 0 ? entry.names.join(", ") : undefined
                  }
                >
                  {entry.names.length > 0 ? (
                    entry.names.map((name) => (
                      <span key={name} className="surface-name">
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="muted tiny">efecto secundario</span>
                  )}
                </span>
                <span className="surface-tags">
                  {entry.typeOnly ? (
                    <span className="surface-badge">type</span>
                  ) : null}
                  {entry.kind !== "static" ? (
                    <span className="surface-badge">{entry.kind}</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {structure.exports.length > 0 ? (
          <div className="surface-group">
            <div className="symbol-group-head">
              <span>Exporta</span>
              <span className="symbol-group-line" aria-hidden="true" />
              <span className="mono symbol-group-count">
                {structure.exports.length}
              </span>
            </div>
            {structure.exports.map((entry) => (
              <div
                key={`${entry.line}-${entry.name}-${entry.source ?? ""}`}
                className="surface-row surface-row-exports"
              >
                <span
                  className="surface-dir surface-dir-out"
                  aria-hidden="true"
                >
                  ←
                </span>
                <span className="surface-name">{entry.name}</span>
                <span className="surface-detail">
                  {entry.local ? (
                    <span className="muted tiny">desde {entry.local}</span>
                  ) : null}
                  {entry.source ? (
                    <span
                      className="mono surface-source"
                      title={entry.source}
                    >
                      {entry.source}
                    </span>
                  ) : null}
                </span>
                <span className="surface-tags">
                  {entry.typeOnly ? (
                    <span className="surface-badge">type</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <p className="muted tiny card-note">
          No son símbolos: no tienen cadena.
        </p>
      </div>
    </CollapsibleSection>
  );
}
