import type { DiffReport, RuleViolation } from "@codarch/metrics/browser";
import { formatCompact } from "@codarch/render/browser";
import {
  countBySource,
  sourceLabel,
  violationPath,
  type RuleStatus
} from "./rules";

/**
 * La pestaña de reglas: la arquitectura del cambio, no el cambio entero.
 *
 * Las reglas vivían escondidas al final de la pestaña PR, después de la
 * migración, los símbolos y los ficheros. Aquí tienen su sitio: el resumen del
 * diff, las violaciones nuevas, las que ya estaban y las resueltas, de dónde
 * sale cada regla y qué ficheros toca. Los hotspots vienen con ellas porque
 * también son una lectura del cambio, no del PR (ADR 0058).
 */

/** El orden en el que se leen los tres grupos. */
const GROUPS: Array<{ status: RuleStatus; title: string; empty: string }> = [
  {
    status: "introduced",
    title: "Nuevas",
    empty: "Ninguna regla nueva: el cambio no rompe la arquitectura."
  },
  {
    status: "existing",
    title: "Existentes",
    empty: "Sin deuda de arquitectura previa en este reporte."
  },
  {
    status: "resolved",
    title: "Resueltas",
    empty: "No se ha resuelto ninguna violación."
  }
];

/** Un grupo largo se corta aquí; el reporte sigue teniendo el resto. */
const MAX_ROWS = 25;

export default function RulesPanel({
  report,
  source,
  error,
  onLoad,
  onSelectPath
}: {
  report: DiffReport | null;
  source: string | null;
  error: string | null;
  onLoad: () => void;
  onSelectPath: (path: string) => void;
}) {
  if (!report) {
    return (
      <section className="rules-panel rules-empty">
        <div className="eyebrow">Reglas</div>
        <h2>Sin reporte</h2>
        <p className="muted small">
          Las reglas se evalúan en el diff. Carga el{" "}
          <code>report.json</code> que genera <code>codarch diff</code> o la
          GitHub Action para ver qué rompe el cambio, qué deuda ya estaba y qué
          se ha resuelto.
        </p>
        <button className="button dark" type="button" onClick={onLoad}>
          Abrir reporte
        </button>
        {error ? <p className="pr-error">{error}</p> : null}
      </section>
    );
  }

  const rules = report.rules;
  const summary = rules.summary;
  const all = [
    ...rules.violations.introduced,
    ...rules.violations.existing,
    ...rules.violations.resolved
  ];
  const sources = countBySource(all);
  const hotspots = report.hotspots;

  return (
    <section className="rules-panel">
      <div className="eyebrow">Reglas · {source ?? "report.json"}</div>
      <h2>Arquitectura del cambio</h2>
      <div className="pr-checksums mono">
        {report.base.checksum.slice(0, 8) || "base"} →{" "}
        {report.head.checksum.slice(0, 8) || "head"}
      </div>

      {rules.configured ? (
        <>
          <div className="pr-grid">
            <RuleStat
              label="Nuevas"
              value={summary.introduced}
              accent={summary.introduced > 0 ? "bad" : undefined}
            />
            <RuleStat label="Existentes" value={summary.existing} />
            <RuleStat
              label="Resueltas"
              value={summary.resolved}
              accent={summary.resolved > 0 ? "good" : undefined}
            />
            <RuleStat
              label="Errores nuevos"
              value={summary.introducedErrors}
              accent={summary.introducedErrors > 0 ? "bad" : undefined}
            />
          </div>

          <p className="rules-meta">
            {summary.introducedWarnings} aviso
            {summary.introducedWarnings === 1 ? "" : "s"} nuevo
            {summary.introducedWarnings === 1 ? "" : "s"} · {summary.rules}{" "}
            regla{summary.rules === 1 ? "" : "s"} en {summary.layers} capa
            {summary.layers === 1 ? "" : "s"}
            {rules.profile ? (
              <>
                {" "}
                · perfil <b>{rules.profile}</b>
              </>
            ) : null}
          </p>

          {sources.length > 0 ? (
            <div className="rules-sources">
              {sources.map((entry) => (
                <span className="rules-chip" key={entry.source}>
                  {entry.label} <b>{entry.count}</b>
                </span>
              ))}
            </div>
          ) : null}

          {GROUPS.map((group) => {
            const rows = rules.violations[group.status];
            return (
              <div className="rules-group" key={group.status}>
                <div className="rules-group-head">
                  <div className="eyebrow">{group.title}</div>
                  <span className={`rules-count rules-count-${group.status}`}>
                    {rows.length}
                  </span>
                </div>
                {rows.length === 0 ? (
                  <p className="muted small">{group.empty}</p>
                ) : (
                  <div className="violation-list">
                    {rows.slice(0, MAX_ROWS).map((violation) => (
                      <RuleRow
                        key={violation.key}
                        violation={violation}
                        status={group.status}
                        onSelectPath={onSelectPath}
                      />
                    ))}
                  </div>
                )}
                {rows.length > MAX_ROWS ? (
                  <p className="muted tiny">
                    y {rows.length - MAX_ROWS} más en el reporte.
                  </p>
                ) : null}
              </div>
            );
          })}
        </>
      ) : (
        <div className="pr-section">
          <div className="eyebrow">Sin configuración</div>
          <p className="muted small">
            Este reporte no trae reglas de arquitectura. Añádelas a{" "}
            <code>.codarch.yml</code> para que el diff las evalúe.
          </p>
        </div>
      )}

      <div className="pr-section">
        <div className="eyebrow">
          Hotspots · {report.hotspotMetric ?? "métrica"}
        </div>
        {hotspots.length === 0 ? (
          <p className="muted small">
            Ningún fichero destaca en la métrica del cambio.
          </p>
        ) : (
          <div className="pr-rows">
            {hotspots.map((hotspot) => (
              <button
                key={`${hotspot.id}-${hotspot.metric}`}
                type="button"
                className="pr-row"
                title={hotspot.path}
                onClick={() => onSelectPath(hotspot.path)}
              >
                <span className="pr-path">{hotspot.path}</span>
                <span
                  className={`mono pr-delta${hotspot.delta > 0 ? " is-worse" : ""}`}
                >
                  {formatCompact(hotspot.base)} → {formatCompact(hotspot.head)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RuleStat({
  label,
  value,
  accent
}: {
  label: string;
  value: number;
  accent?: "bad" | "good";
}) {
  return (
    <div className={`pr-stat${accent ? ` pr-stat-${accent}` : ""}`}>
      <span>{label}</span>
      <b>{formatCompact(value)}</b>
    </div>
  );
}

function RuleRow({
  violation,
  status,
  onSelectPath
}: {
  violation: RuleViolation;
  status: RuleStatus;
  onSelectPath: (path: string) => void;
}) {
  const path = violationPath(violation);
  const title =
    violation.files.join(", ") ||
    (violation.cycle
      ? violation.cycle.nodes.map((node) => node.path).join(" → ")
      : "Sin ruta");
  // El mensaje por defecto ya cuenta la arista, la métrica o el ciclo; solo
  // se añade el detalle cuando el mensaje es propio y no lo repite.
  const edge =
    violation.edge &&
    !(
      violation.message.includes(violation.edge.from) &&
      violation.message.includes(violation.edge.to)
    )
      ? violation.edge
      : null;
  const metric =
    violation.metric && !violation.message.includes(violation.metric.name)
      ? violation.metric
      : null;
  const cycle =
    violation.cycle &&
    !violation.message.includes(violation.cycle.nodes[0]?.path ?? "")
      ? violation.cycle
      : null;

  return (
    <button
      type="button"
      className={`violation violation-${violation.severity} rules-rule rules-rule-${status}`}
      onClick={() => path && onSelectPath(path)}
      title={title}
    >
      <i />
      <span>
        <b>
          {violation.rule}
          <em className="violation-source" title="De dónde sale la regla">
            {sourceLabel(violation.source)}
          </em>
        </b>
        <small>{violation.message}</small>
        {edge ? (
          <small className="rules-detail">
            {edge.from} → {edge.to}
          </small>
        ) : null}
        {metric ? (
          <small className="rules-detail">
            {metric.name} = {formatCompact(metric.value)}
            {metric.max !== undefined
              ? ` · máx. ${formatCompact(metric.max)}`
              : ""}
            {metric.min !== undefined
              ? ` · mín. ${formatCompact(metric.min)}`
              : ""}
          </small>
        ) : null}
        {cycle ? (
          <small className="rules-detail">
            ciclo de {cycle.size}:{" "}
            {cycle.nodes.map((node) => node.path).join(" → ")}
          </small>
        ) : null}
        {status === "resolved" ? (
          <small className="rules-detail">ya no está en el head</small>
        ) : null}
      </span>
    </button>
  );
}
