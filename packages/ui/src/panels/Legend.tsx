import {
  formatCompact,
  KIND_COLOR,
  type RenderModel
} from "@codarch/render/browser";
import type {
  CcMigrationLens,
  CcMigrationStatus,
  CcRestKind
} from "@codarch/schema/browser";
import { KIND_LABEL, STATUS_COLOR, STATUS_LABEL } from "../labels";

/**
 * La leyenda del mapa: qué significa cada color del modo activo.
 *
 * Cada modo dice lo suyo —los estados de migración, las secciones o la escala
 * de la métrica— y un modo sin leyenda no pinta nada en vez de mentir con la
 * de otro.
 */
export function Legend({
  colorMode,
  migration,
  model,
  hasLint = false
}: {
  colorMode: string;
  migration: CcMigrationLens | null;
  model: RenderModel | null;
  /** Hay artefacto de lint: sin él, la leyenda del lint no se dibuja. */
  hasLint?: boolean;
}) {
  // La deuda de lint: la escala es el máximo del mapa, y la cifra que importa
  // es cuántos ficheros tienen algo, no cuántos hay (ADR 0094).
  if (colorMode === "lint") {
    if (!model || !hasLint) return null;
    const withFindings = model.files.filter((file) => file.lint > 0).length;
    return (
      <section className="panel-block">
        <div className="eyebrow">Leyenda · lint</div>
        <div className="gradient lint" />
        <div className="gradient-labels">
          <span>limpio</span>
          <span>{model.lintMax > 0 ? formatCompact(model.lintMax) : "deuda"}</span>
        </div>
        <div className="muted tiny">
          {withFindings === 0
            ? "ningún fichero con hallazgos"
            : `${formatCompact(withFindings)} de ${formatCompact(
                model.fileCount
              )} ficheros con hallazgos`}
        </div>
      </section>
    );
  }

  if (colorMode === "status" && migration) {
    return (
      <section className="panel-block">
        <div className="eyebrow">Leyenda</div>
        <div className="legend">
          {(["js", "rust", "bridge", "native"] as CcMigrationStatus[]).map((status) => (
            <div key={status}>
              <i style={{ background: STATUS_COLOR[status] }} />
              <span>{STATUS_LABEL[status]}</span>
              <span className="mono">{migration.summary.status[status]}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (colorMode === "kind" && model) {
    // El mapa del resto se lee por tipo: cuatro colores y cuántos hay de cada
    // uno. `other` solo aparece si existe: una leyenda con un cero es ruido.
    const counts = new Map<CcRestKind, number>();
    for (const file of model.files) {
      if (!file.kind) continue;
      counts.set(file.kind, (counts.get(file.kind) ?? 0) + 1);
    }
    const kinds = (["doc", "config", "asset", "other"] as CcRestKind[]).filter(
      (kind) => (counts.get(kind) ?? 0) > 0
    );
    if (kinds.length === 0) return null;

    return (
      <section className="panel-block">
        <div className="eyebrow">Leyenda · tipo</div>
        <div className="legend">
          {kinds.map((kind) => (
            <div key={kind}>
              <i style={{ background: KIND_COLOR[kind] }} />
              <span>{KIND_LABEL[kind]}</span>
              <span className="mono">{counts.get(kind)}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (colorMode === "structure" && model) {
    return (
      <section className="panel-block">
        <div className="eyebrow">Leyenda</div>
        <div className="legend">
          {model.sections.slice(0, 8).map((section) => (
            <div key={section.key}>
              <i style={{ background: section.color }} />
              <span className="ellipsis" title={section.label}>
                {section.label}
              </span>
              <span className="mono">{section.files}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (colorMode === "risk") {
    return (
      <section className="panel-block">
        <div className="eyebrow">Leyenda · riesgo</div>
        <div className="gradient risk" />
        <div className="gradient-labels">
          <span>bajo</span>
          <span>alto</span>
        </div>
      </section>
    );
  }

  const metric = model?.metrics.find((entry) => entry.key === colorMode);
  if (!metric) return null;

  return (
    <section className="panel-block">
      <div className="eyebrow">Leyenda · {metric.title}</div>
      <div className="gradient metric" />
      <div className="gradient-labels">
        <span>{formatCompact(metric.min)}</span>
        <span>{formatCompact(metric.max)}</span>
      </div>
      <div className="muted tiny">
        {metric.coverage} ficheros · {metric.mode === "log" ? "escala log" : "escala lineal"}
        {metric.actualMax > metric.max
          ? ` · máx real ${formatCompact(metric.actualMax)}`
          : ""}
      </div>
    </section>
  );
}
