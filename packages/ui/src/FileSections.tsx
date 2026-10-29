import type { DiffReport } from "@codarch/metrics/browser";
import { formatCompact } from "@codarch/render/browser";
import type { RenderFile, RenderModel } from "@codarch/render/browser";
import type { CcMigrationLens, CcMigrationNode } from "@codarch/schema/browser";
import { CollapsibleSection, GroupHead } from "./CollapsibleSection";
import {
  countViolations,
  ffiEdgesForFile,
  violationsForPath,
  type FileViolation,
  type FfiEdgeView
} from "./lenses";
import { RuleRow } from "./RuleRow";

/**
 * Las secciones de la ficha que hablan de reglas y de migración (ADR 0069).
 *
 * Antes eran la mitad de arriba de la pestaña Reglas; ahora viven donde
 * pertenecen, junto al fichero, y **no repiten** lo que ya dice la tabla de
 * métricas: el riesgo se explica, no se vuelve a contar, y la deuda y los
 * cruces se quedan en su fila. Aquí solo aparecen los nombres, el porqué y las
 * reglas que tocan al fichero.
 *
 * El fichero se lee en tres piezas: el desglose del riesgo, el grupo de
 * **Dominio** y el de **Deuda de migración**. `RulesSection` solo decide qué se
 * enseña y con qué cuenta; lo que hay dentro de cada grupo es de su grupo.
 */

type Signal = "complexity" | "churn" | "size";

const SIGNAL_LABEL: Record<Signal, string> = {
  complexity: "Complejidad",
  churn: "Churn",
  size: "Tamaño"
};

const SIGNALS = Object.keys(SIGNAL_LABEL) as Signal[];

/** El fichero corta la lista de reglas y de cruces; el reporte tiene el resto. */
const MAX_VIOLATIONS = 8;
const MAX_EDGES = 6;

/** «1 nueva», «2 nuevas»: la cuenta con su palabra. */
function pluralCount(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** La cuenta, si hay algo que contar. */
function countText(count: number, one: string, many: string): string | null {
  return count > 0 ? pluralCount(count, one, many) : null;
}

/** Junta las partes no vacías con el separador de la ficha. */
function joinParts(parts: Array<string | null>): string {
  return parts.filter((part) => part !== null).join(" · ");
}

/**
 * El porqué del riesgo, en palabras.
 *
 * Si falta alguna señal, se dice cuál: su peso se reparte entre las demás, y un
 * snapshot sin las tres no trae riesgo que explicar.
 */
function riskNote(missing: readonly Signal[]): string {
  if (missing.length === 0) {
    return "Complejidad 50 % · churn 32 % · tamaño 18 %, normalizado por el p95 de cada señal.";
  }
  if (missing.length === SIGNALS.length) {
    return "Este snapshot no trae las señales del riesgo.";
  }
  const names = missing
    .map((signal) => SIGNAL_LABEL[signal].toLowerCase())
    .join(" ni ");
  return `Sin ${names} en este snapshot: su peso se reparte entre las demás señales.`;
}

/**
 * De dónde sale el riesgo, dentro de Métricas.
 *
 * El valor y la barra ya están en la primera fila de la tabla; esto solo
 * separa las tres señales que lo componen, con su peso y el p95 del proyecto.
 */
export function RiskBreakdown({ file }: { file: RenderFile }) {
  const parts = file.riskParts;
  const missing = SIGNALS.filter((signal) => parts[signal].weight === 0);

  return (
    <div className="risk-breakdown">
      <div className="risk-head">De dónde sale el riesgo</div>
      <div className="risk-bars">
        {SIGNALS.map((signal) => {
          const part = parts[signal];
          return (
            <div
              key={signal}
              className="risk-bar-row"
              title={`${formatCompact(part.value)} de p95 ${formatCompact(
                part.p95
              )} · peso ${Math.round(part.weight * 100)} %`}
            >
              <span>{SIGNAL_LABEL[signal]}</span>
              <span className="risk-bar">
                <i style={{ width: `${Math.round(part.norm * 100)}%` }} />
              </span>
              <span className="mono">{formatCompact(part.value)}</span>
              <span className="risk-weight">
                {Math.round(part.weight * 100)} %
              </span>
            </div>
          );
        })}
      </div>
      <p className="muted tiny risk-note">{riskNote(missing)}</p>
      <p className="muted tiny mono risk-p95">
        p95 del proyecto · complejidad {formatCompact(parts.complexity.p95)} ·
        churn {formatCompact(parts.churn.p95)} · tamaño{" "}
        {formatCompact(parts.size.p95)}
      </p>
    </div>
  );
}

/** Las reglas que tocan al fichero, con el corte y la cuenta de las que sobran. */
function ViolationList({
  violations,
  filePath,
  onSelectPath
}: {
  violations: readonly FileViolation[];
  filePath: string;
  onSelectPath: (path: string) => void;
}) {
  return (
    <>
      <div className="violation-list">
        {violations.slice(0, MAX_VIOLATIONS).map(({ status, violation }) => (
          <RuleRow
            key={`${status}-${violation.key}`}
            violation={violation}
            status={status}
            onSelectPath={onSelectPath}
            otherThan={filePath}
            showStatus
          />
        ))}
      </div>
      {violations.length > MAX_VIOLATIONS ? (
        <p className="muted tiny">
          y {violations.length - MAX_VIOLATIONS} reglas más en este fichero.
        </p>
      ) : null}
    </>
  );
}

/** Los cruces FFI del fichero, con el corte y la cuenta de los que sobran. */
function EdgeList({
  edges,
  onSelectPath
}: {
  edges: readonly FfiEdgeView[];
  onSelectPath: (path: string) => void;
}) {
  return (
    <div className="lens-edges">
      {edges.slice(0, MAX_EDGES).map((edge) => (
        <button
          key={`${edge.direction}-${edge.path}-${edge.kind}`}
          type="button"
          className="lens-edge"
          title={edge.path}
          onClick={() => onSelectPath(edge.path)}
        >
          <span className="lens-edge-dir" aria-hidden="true">
            {edge.direction === "out" ? "→" : "←"}
          </span>
          <span className="lens-edge-path" title={edge.path}>
            {edge.path}
          </span>
          <span className={`lens-flag lens-${edge.kind}`}>{edge.kind}</span>
        </button>
      ))}
      {edges.length > MAX_EDGES ? (
        <span className="muted tiny">
          y {edges.length - MAX_EDGES} cruces más.
        </span>
      ) : null}
    </div>
  );
}

/** Lo que el grupo de Dominio dice de un vistazo, con la sección plegada. */
function domainSummary(
  report: DiffReport | null,
  counts: { introduced: number; existing: number }
): string | undefined {
  if (!report) return undefined;
  if (!report.rules.configured) return "sin reglas configuradas";
  return (
    joinParts([
      countText(counts.introduced, "nueva", "nuevas"),
      countText(counts.existing, "existente", "existentes")
    ]) || "ninguna"
  );
}

/**
 * Dominio: las reglas de arquitectura que tocan al fichero.
 *
 * Sin reporte cargado no hay lente de dominio, y se dice: las reglas se
 * evalúan contra el diff, no contra el snapshot.
 */
function DomainGroup({
  report,
  violations,
  filePath,
  onSelectPath
}: {
  report: DiffReport | null;
  violations: readonly FileViolation[];
  /** El fichero abierto: una regla no se repite a sí misma. */
  filePath: string;
  onSelectPath: (path: string) => void;
}) {
  const counts = countViolations(violations);

  if (!report) {
    return (
      <p className="muted tiny card-note">
        Sin reporte cargado no hay reglas de dominio: se evalúan contra el diff.
      </p>
    );
  }

  return (
    <div className="rule-group">
      <GroupHead label="Dominio" summary={domainSummary(report, counts)} />
      {!report.rules.configured ? (
        <p className="muted small">
          Este reporte no trae reglas de arquitectura configuradas.
        </p>
      ) : violations.length === 0 ? null : (
        <ViolationList
          violations={violations}
          filePath={filePath}
          onSelectPath={onSelectPath}
        />
      )}
    </div>
  );
}

/**
 * Deuda de migración: la fórmula y los cruces FFI del fichero.
 *
 * La deuda en sí ya es una fila de Métricas; aquí solo se dice cómo se calcula
 * y qué aristas la cruzan.
 */
function MigrationGroup({
  edges,
  onSelectPath
}: {
  edges: readonly FfiEdgeView[];
  onSelectPath: (path: string) => void;
}) {
  return (
    <div className="rule-group">
      <GroupHead
        label="Deuda de migración"
        summary={
          edges.length === 0
            ? "sin cruces"
            : pluralCount(edges.length, "cruce", "cruces")
        }
      />
      <p
        className="muted tiny rule-formula"
        title="(complejidad máx. + 1) × (1 + fan-in): lo que costaría migrarlo."
      >
        Deuda = (compl. máx. + 1) × (1 + fan-in)
      </p>
      {edges.length === 0 ? null : (
        <EdgeList edges={edges} onSelectPath={onSelectPath} />
      )}
    </div>
  );
}

/** Lo que se lee en la cabecera con la sección cerrada. */
function rulesSummary(
  counts: { introduced: number; existing: number },
  edgeCount: number
): string {
  return joinParts([
    countText(counts.introduced, "nueva", "nuevas"),
    countText(counts.existing, "existente", "existentes"),
    countText(edgeCount, "cruce", "cruces")
  ]);
}

/**
 * Lo que el proyecto le exige a este fichero, en una sola sección.
 *
 * **Dominio** y **Deuda de migración** van juntos porque ninguno de los dos
 * sale del snapshot parecido al resto de la ficha: el dominio vive en el
 * reporte del diff y la migración en su lente, y las dos contestan a la misma
 * pregunta, «¿qué le pide el proyecto a este fichero?». Separadas, la segunda
 * aparecía entre Dependencias y Miembros, lejos de la primera.
 *
 * La sección no repite la tabla: la deuda y los cruces ya son filas de
 * Métricas; aquí solo se nombran las reglas y las aristas.
 */
export function RulesSection({
  report,
  migration,
  node,
  model,
  file,
  onSelectPath
}: {
  report: DiffReport | null;
  migration: CcMigrationLens | null;
  node: CcMigrationNode | null;
  model: RenderModel | null;
  file: RenderFile;
  onSelectPath: (path: string) => void;
}) {
  const violations = report ? violationsForPath(report, file.path) : [];
  const edges =
    migration && node
      ? ffiEdgesForFile(migration, file.nodeId, model?.files ?? [])
      : [];
  const debt = node?.debt ?? 0;
  const showsMigration = node !== null && (edges.length > 0 || debt > 0);

  if (!report && !showsMigration) return null;

  return (
    <CollapsibleSection
      id="file-rules"
      title="Reglas"
      count={violations.length + edges.length}
      summary={
        rulesSummary(countViolations(violations), edges.length) ||
        "sin violaciones"
      }
      className="section-rules"
    >
      <DomainGroup
        report={report}
        violations={violations}
        filePath={file.path}
        onSelectPath={onSelectPath}
      />
      {showsMigration ? (
        <MigrationGroup edges={edges} onSelectPath={onSelectPath} />
      ) : null}
    </CollapsibleSection>
  );
}
