import type { ReactNode } from "react";
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
import { CollapsibleSection } from "../CollapsibleSection";
import { KIND_LABEL, STATUS_COLOR, STATUS_LABEL } from "../labels";

/**
 * La leyenda del mapa: qué significa cada color del modo activo.
 *
 * Cada modo dice lo suyo —los estados de migración, las secciones o la escala
 * de la métrica— y un modo sin leyenda no pinta nada en vez de mentir con la
 * de otro. El bloque pliega como los demás del raíl (ADR 0061, M49), con la
 * cifra corta que se lee cerrado.
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
      <RailBlock
        id="legend-lint"
        title="Leyenda · lint"
        count={2}
        summary={`${formatCompact(withFindings)} con hallazgos`}
      >
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
      </RailBlock>
    );
  }

  if (colorMode === "status" && migration) {
    return (
      <RailBlock
        id="legend-status"
        title="Leyenda"
        count={4}
        summary={`${migration.summary.bridgeFiles} puentes`}
      >
        <div className="legend">
          {(["js", "rust", "bridge", "native"] as CcMigrationStatus[]).map((status) => (
            <div key={status}>
              <i style={{ background: STATUS_COLOR[status] }} />
              <span>{STATUS_LABEL[status]}</span>
              <span className="mono">{migration.summary.status[status]}</span>
            </div>
          ))}
        </div>
      </RailBlock>
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
      <RailBlock
        id="legend-kind"
        title="Leyenda · tipo"
        count={kinds.length}
        summary={`${kinds.length} tipos`}
      >
        <div className="legend">
          {kinds.map((kind) => (
            <div key={kind}>
              <i style={{ background: KIND_COLOR[kind] }} />
              <span>{KIND_LABEL[kind]}</span>
              <span className="mono">{counts.get(kind)}</span>
            </div>
          ))}
        </div>
      </RailBlock>
    );
  }

  if (colorMode === "structure" && model) {
    return (
      <RailBlock
        id="legend-structure"
        title="Leyenda"
        count={Math.min(model.sections.length, 8)}
        summary={`${model.sections.length} secciones`}
      >
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
      </RailBlock>
    );
  }

  if (colorMode === "risk") {
    return (
      <RailBlock
        id="legend-risk"
        title="Leyenda · riesgo"
        count={2}
        summary="bajo → alto"
      >
        <div className="gradient risk" />
        <div className="gradient-labels">
          <span>bajo</span>
          <span>alto</span>
        </div>
      </RailBlock>
    );
  }

  // La duplicación se lee como una métrica, pero la leyenda dice además
  // cuántos ficheros comparten código y cuántos pares hay: es la cifra que el
  // degradado no cuenta (ADR 0102).
  if (
    (colorMode === "duplicatedLines" || colorMode === "repeatedLines") &&
    model
  ) {
    if (!model.duplication.measured) return null;
    const metric = model.metrics.find((entry) => entry.key === colorMode);
    if (!metric) return null;
    const repeated = colorMode === "repeatedLines";
    const withDuplication = model.files.filter((file) => {
      const node = model.duplication.nodes[file.nodeId];
      return repeated ? node?.repeatedLines : node?.duplicatedLines;
    }).length;
    return (
      <RailBlock
        id="legend-duplication"
        title="Leyenda · duplicación"
        count={2}
        summary={`${formatCompact(withDuplication)} con copias`}
      >
        <div className="gradient metric" />
        <div className="gradient-labels">
          <span>{formatCompact(metric.min)}</span>
          <span>{formatCompact(metric.max)}</span>
        </div>
        <div className="muted tiny">
          {withDuplication === 0
            ? `ningún fichero con líneas ${repeated ? "repetidas" : "compartidas"}`
            : `${formatCompact(withDuplication)} de ${formatCompact(
                model.fileCount
              )} ficheros con líneas ${repeated ? "repetidas" : "compartidas"}`}
          {repeated ? null : (
            <>{" · "}{formatCompact(model.duplication.pairs)} pares</>
          )}
        </div>
      </RailBlock>
    );
  }

  const metric = model?.metrics.find((entry) => entry.key === colorMode);
  if (!metric) return null;

  return (
    <RailBlock
      id="legend-metric"
      title={`Leyenda · ${metric.title}`}
      count={2}
      summary={`máx ${formatCompact(metric.max)}`}
    >
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
    </RailBlock>
  );
}

/** Un bloque del raíl: pliega como los demás y dice su cifra cerrado (M49). */
function RailBlock({
  id,
  title,
  count,
  summary,
  children
}: {
  id: string;
  title: string;
  count: number;
  summary: string;
  children: ReactNode;
}) {
  return (
    <CollapsibleSection
      id={id}
      title={title}
      className="panel-block"
      count={count}
      summary={summary}
    >
      {children}
    </CollapsibleSection>
  );
}
