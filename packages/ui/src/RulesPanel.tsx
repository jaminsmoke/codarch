import type { DiffReport } from "@codarch/metrics/browser";
import { formatCompact } from "@codarch/render/browser";
import type { RenderFile, RenderModel } from "@codarch/render/browser";
import type { CcMigrationLens, CcSymbol } from "@codarch/schema/browser";
import { FileLens } from "./FileLens";
import { RuleRow } from "./RuleRow";
import { countBySource, type RuleStatus } from "./rules";

/**
 * La pestaña de reglas: el fichero y el cambio en una sola lectura.
 *
 * Primero el fichero seleccionado —riesgo, reglas de dominio, migración y
 * símbolos, que antes eran la pestaña Lentes— y después el cambio: cuántas
 * reglas nuevas, existentes y resueltas, de dónde salen y los hotspots. Todo
 * sale del snapshot y del `report.json` que ya existían (ADR 0058 y ADR 0059).
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

/** Lo que enseña la parte del fichero, para quien aún no ha elegido celda. */
const FILE_INDEX = [
  { title: "Riesgo", detail: "complejidad, churn y tamaño" },
  { title: "Dominio", detail: "reglas del reporte cargado" },
  { title: "Migración", detail: "deuda y cruces FFI" },
  { title: "Símbolos", detail: "funciones y complejidad" }
];

export default function RulesPanel({
  report,
  source,
  error,
  onLoad,
  onSelectPath,
  file,
  model,
  migration,
  symbols
}: {
  report: DiffReport | null;
  source: string | null;
  error: string | null;
  onLoad: () => void;
  /** Selecciona otro fichero sin salir de la pestaña. */
  onSelectPath: (path: string) => void;
  file: RenderFile | null;
  model: RenderModel | null;
  migration: CcMigrationLens | null;
  symbols: CcSymbol[];
}) {
  const rules = report?.rules ?? null;
  const summary = rules?.summary ?? null;
  const all = rules
    ? [
        ...rules.violations.introduced,
        ...rules.violations.existing,
        ...rules.violations.resolved
      ]
    : [];
  const sources = countBySource(all);
  const hotspots = report?.hotspots ?? [];

  return (
    <section className="rules-panel">
      <div className="eyebrow">
        Reglas{report && source ? ` · ${source}` : ""}
      </div>
      <h2>{file ? file.name : "Arquitectura del cambio"}</h2>
      {file ? (
        <div className="inspector-path" title={file.path}>
          {file.path}
        </div>
      ) : null}

      {file ? (
        <FileLens
          model={model}
          file={file}
          migration={migration}
          report={report}
          symbols={symbols}
          onSelectPath={onSelectPath}
        />
      ) : (
        <div className="rules-hint">
          <p className="muted small">
            Selecciona una celda para ver el fichero: <b>por qué</b> tiene ese
            riesgo, qué reglas de dominio toca y qué deuda de migración
            arrastra.
          </p>
          <div className="lens-index">
            {FILE_INDEX.map((row) => (
              <div key={row.title}>
                <b>{row.title}</b>
                <span>{row.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rules-change">
        <div className="eyebrow">El cambio</div>

        {!report ? (
          <>
            <p className="rules-empty-title">Sin reporte</p>
            <p className="muted small">
              Las reglas se evalúan en el diff. Carga el{" "}
              <code>report.json</code> que genera <code>codarch diff</code> o
              la GitHub Action para ver qué rompe el cambio, qué deuda ya
              estaba y qué se ha resuelto.
            </p>
            <button className="button dark" type="button" onClick={onLoad}>
              Abrir reporte
            </button>
            {error ? <p className="panel-error">{error}</p> : null}
          </>
        ) : (
          <>
            <div className="change-checksums mono">
              {report.base.checksum.slice(0, 8) || "base"} →{" "}
              {report.head.checksum.slice(0, 8) || "head"}
            </div>

            {rules?.configured && summary ? (
              <>
                <div className="change-grid">
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
                  {summary.introducedWarnings === 1 ? "" : "s"} ·{" "}
                  {summary.rules} regla{summary.rules === 1 ? "" : "s"} en{" "}
                  {summary.layers} capa{summary.layers === 1 ? "" : "s"}
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
                        <span
                          className={`rules-count rules-count-${group.status}`}
                        >
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
              <div className="change-section">
                <div className="eyebrow">Sin configuración</div>
                <p className="muted small">
                  Este reporte no trae reglas de arquitectura. Añádelas a{" "}
                  <code>.codarch.yml</code> para que el diff las evalúe.
                </p>
              </div>
            )}

            <div className="change-section">
              <div className="eyebrow">
                Hotspots · {report.hotspotMetric ?? "métrica"}
              </div>
              {hotspots.length === 0 ? (
                <p className="muted small">
                  Ningún fichero destaca en la métrica del cambio.
                </p>
              ) : (
                <div className="change-rows">
                  {hotspots.map((hotspot) => (
                    <button
                      key={`${hotspot.id}-${hotspot.metric}`}
                      type="button"
                      className="change-row"
                      title={hotspot.path}
                      onClick={() => onSelectPath(hotspot.path)}
                    >
                      <span className="change-path">{hotspot.path}</span>
                      <span
                        className={`mono change-delta${
                          hotspot.delta > 0 ? " is-worse" : ""
                        }`}
                      >
                        {formatCompact(hotspot.base)} →{" "}
                        {formatCompact(hotspot.head)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
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
    <div className={`change-stat${accent ? ` change-stat-${accent}` : ""}`}>
      <span>{label}</span>
      <b>{formatCompact(value)}</b>
    </div>
  );
}
