import type { DiffReport } from "@codarch/metrics/browser";
import { formatCompact } from "@codarch/render/browser";
import type { RenderFile, RenderModel } from "@codarch/render/browser";
import type { CcMigrationLens, CcSymbol } from "@codarch/schema/browser";
import { Metric } from "./panels";
import { STATUS_COLOR, STATUS_LABEL } from "./labels";
import {
  countViolations,
  ffiEdgesForFile,
  symbolSummary,
  violationsForPath
} from "./lenses";
import { RuleRow } from "./RuleRow";

type Signal = "complexity" | "churn" | "size";

const SIGNAL_LABEL: Record<Signal, string> = {
  complexity: "Complejidad",
  churn: "Churn",
  size: "Tamaño"
};

/** El fichero del que se leen las lentes. */
const MAX_VIOLATIONS = 8;
const MAX_EDGES = 6;

/**
 * Las lentes del fichero, dentro de la pestaña Reglas (ADR 0059).
 *
 * No repiten la tabla de métricas del inspector: la explican. El riesgo se
 * desglosa con las mismas señales y pesos que usa el mapa, la lente de dominio
 * solo aparece cuando hay reporte cargado (las reglas viven ahí, no en el
 * snapshot) y la migración viene del propio `cc.json` (ADR 0057). Antes era una
 * pestaña; ahora es la mitad de arriba de Reglas, con el fichero seleccionado
 * como contexto.
 */
export function FileLens({
  model,
  file,
  migration,
  report,
  symbols,
  onSelectPath
}: {
  model: RenderModel | null;
  file: RenderFile;
  migration: CcMigrationLens | null;
  report: DiffReport | null;
  symbols: CcSymbol[];
  onSelectPath: (path: string) => void;
}) {
  const parts = file.riskParts;
  const missing = (Object.keys(SIGNAL_LABEL) as Signal[]).filter(
    (signal) => parts[signal].weight === 0
  );

  const violations = violationsForPath(report, file.path);
  const counts = countViolations(violations);
  const node = migration?.nodes[file.nodeId] ?? null;
  const edges = ffiEdgesForFile(migration, file.nodeId, model?.files ?? []);
  const summary = symbolSummary(symbols);

  return (
    <div className="rules-file">
      <div className="lens-section">
        <div className="eyebrow">Riesgo</div>
        <div className="lens-risk-head">
          <b className="lens-risk-value">
            {formatCompact(Math.round(file.risk * 100))}
          </b>
          <span className="lens-risk-unit">/ 100</span>
        </div>
        <div className="lens-bars">
          {(Object.keys(SIGNAL_LABEL) as Signal[]).map((signal) => {
            const part = parts[signal];
            return (
              <div
                key={signal}
                className="lens-bar-row"
                title={`${formatCompact(part.value)} de p95 ${formatCompact(
                  part.p95
                )} · peso ${Math.round(part.weight * 100)} %`}
              >
                <span>{SIGNAL_LABEL[signal]}</span>
                <span className="lens-bar">
                  <i style={{ width: `${Math.round(part.norm * 100)}%` }} />
                </span>
                <span className="mono">{formatCompact(part.value)}</span>
                <span className="lens-weight">
                  {Math.round(part.weight * 100)} %
                </span>
              </div>
            );
          })}
        </div>
        <p className="muted tiny">
          {missing.length === 0
            ? "Peso del riesgo: complejidad 50 % · churn 32 % · tamaño 18 %, normalizado por el p95 de cada señal."
            : missing.length === 3
              ? "Este snapshot no trae las señales del riesgo."
              : `Sin ${missing
                  .map((signal) => SIGNAL_LABEL[signal].toLowerCase())
                  .join(" ni ")} en este snapshot: su peso se reparte entre las demás señales.`}
        </p>
        <p className="muted tiny mono">
          p95 del proyecto · complejidad {formatCompact(parts.complexity.p95)}{" "}
          · churn {formatCompact(parts.churn.p95)} · tamaño{" "}
          {formatCompact(parts.size.p95)}
        </p>
      </div>

      <div className="lens-section">
        <div className="eyebrow">Dominio</div>
        {!report ? (
          <p className="muted small">
            La lente de dominio vive en el reporte del diff. Carga un{" "}
            <code>report.json</code> para ver las reglas que toca este fichero.
          </p>
        ) : !report.rules.configured ? (
          <p className="muted small">
            Este reporte no trae reglas de arquitectura configuradas.
          </p>
        ) : violations.length === 0 ? (
          <p className="muted small">Ninguna regla violada en este fichero.</p>
        ) : (
          <>
            <div className="lens-counts">
              {counts.introduced > 0 ? (
                <span className="lens-chip lens-chip-new">
                  {counts.introduced} nueva{counts.introduced === 1 ? "" : "s"}
                </span>
              ) : null}
              {counts.existing > 0 ? (
                <span className="lens-chip">
                  {counts.existing} existente
                  {counts.existing === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            <div className="violation-list">
              {violations.slice(0, MAX_VIOLATIONS).map(({ status, violation }) => (
                <RuleRow
                  key={`${status}-${violation.key}`}
                  violation={violation}
                  status={status}
                  onSelectPath={onSelectPath}
                  otherThan={file.path}
                  showStatus
                />
              ))}
            </div>
            {violations.length > MAX_VIOLATIONS ? (
              <p className="muted tiny">
                y {violations.length - MAX_VIOLATIONS} reglas más en este
                fichero.
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="lens-section">
        <div className="eyebrow">Migración</div>
        {!migration ? (
          <p className="muted small">Este snapshot no trae lente de migración.</p>
        ) : !node ? (
          <p className="muted small">La lente no tiene datos de este fichero.</p>
        ) : (
          <>
            <div className="inspector-status">
              <span
                className="status-dot"
                style={{ background: STATUS_COLOR[node.status] }}
              />
              <span>{STATUS_LABEL[node.status]}</span>
              <span className="mono">{node.language}</span>
            </div>
            <div className="metric-grid">
              <Metric label="Deuda" value={formatCompact(node.debt ?? 0)} />
              <Metric label="Cruces FFI" value={formatCompact(node.crossings)} />
            </div>
            <p className="muted tiny">
              La deuda de un fichero TS/JS es (complejidad máx. + 1) × (1 +
              fan-in): lo que costaría migrarlo.
            </p>
            {edges.length === 0 ? (
              <p className="muted small">Sin cruces FFI en este fichero.</p>
            ) : (
              <div className="lens-edges">
                {edges.slice(0, MAX_EDGES).map((edge) => (
                  <button
                    key={`${edge.direction}-${edge.path}-${edge.kind}`}
                    type="button"
                    className="lens-edge"
                    title={edge.path}
                    onClick={() => onSelectPath(edge.path)}
                  >
                    <span className={`lens-flag lens-${edge.kind}`}>
                      {edge.kind}
                    </span>
                    <span className="lens-edge-path">
                      {edge.direction === "out" ? "→" : "←"} {edge.path}
                    </span>
                  </button>
                ))}
                {edges.length > MAX_EDGES ? (
                  <span className="muted tiny">
                    y {edges.length - MAX_EDGES} cruces más.
                  </span>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      <div className="lens-section">
        <div className="eyebrow">Símbolos</div>
        {summary.count === 0 ? (
          <p className="muted small">Sin símbolos en este fichero.</p>
        ) : (
          <>
            <p className="muted small">
              {summary.count} símbolo{summary.count === 1 ? "" : "s"} ·{" "}
              {summary.functions}{" "}
              {summary.functions === 1 ? "función" : "funciones"}
            </p>
            {summary.mostComplex?.complexity ? (
              <p className="muted small">
                El más complejo:{" "}
                <b className="lens-symbol">{summary.mostComplex.name}</b>{" "}
                <span className="mono">{summary.mostComplex.complexity}</span>
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
