import type {
  LintAdvice,
  LintArtifact,
  LintSeverity
} from "@codarch/lint/browser";
import type { RiskParts } from "@codarch/render/browser";
import { formatCompact } from "@codarch/render/browser";
import { CollapsibleSection, GroupHead } from "./CollapsibleSection";
import {
  lintRules,
  lintTotals,
  severityText
} from "./lintRollup";

/**
 * El lint de una ficha de código (ADR 0104).
 *
 * La sección habla de lo que **falló** y de lo que pesa en el riesgo: la deuda
 * —errores + ¼ avisos—, su peso, y los mensajes que la producen. No enseña el
 * catálogo de reglas activas ni los sistemas del proyecto: eso es configuración
 * y no una ficha de código.
 *
 * En el fichero se leen sus mensajes, con línea y texto, porque es donde se
 * arregla. En carpeta y proyecto, los hallazgos se agrupan por regla: la lista
 * de mensajes de un subárbol entero no se lee, pero la regla que más pesa sí.
 *
 * Sin artefacto no se enseñan ceros: se dice que no se midió y, si se conoce
 * el stack, cuál sería el lint mínimo recomendable. Nunca se escribe config.
 */

/** Cuántas reglas con hallazgos se listan antes de cortar. */
const RULE_ROWS = 12;

/** Cuántos mensajes de un fichero se listan antes de cortar. */
const FINDING_ROWS = 10;

const weightFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 1
});

function formatWeight(weight: number): string {
  return `${weightFormat.format(weight * 100)} %`;
}

function plural(value: number, one: string, many: string): string {
  return `${formatCompact(value)} ${value === 1 ? one : many}`;
}

/** La tinta de la severidad, solo para un hallazgo; la configuración va en gris. */
function SeverityDot({ severity }: { severity: LintSeverity }) {
  return (
    <span
      className={`lint-dot lint-dot-${severity}`}
      aria-hidden="true"
    />
  );
}

/**
 * La deuda y su parte del riesgo.
 *
 * `weight` es 0 cuando el lint no se midió: entonces no hay un 0 % que leer,
 * sino una señal apagada (ADR 0094). El p95 es el del proyecto, el mismo que
 * normaliza la señal.
 */
function RiskLine({ risk }: { risk: RiskParts }) {
  const measured = risk.lint.weight > 0;

  return (
    <div className="lint-risk">
      <div className="lint-risk-head">
        <span className="lint-risk-label">Peso en el riesgo</span>
        <span className="mono lint-risk-value">
          {measured ? formatWeight(risk.lint.weight) : "—"}
        </span>
        <span className={`lint-risk-weight${measured ? "" : " is-off"}`}>
          {measured ? "del riesgo total" : "sin medir"}
        </span>
      </div>
      <p className="muted tiny lint-risk-note">
        {measured
          ? `La deuda es errores + ¼ avisos, con el p95 del proyecto en ${formatCompact(
              risk.lint.p95
            )}. Las cuentas están en Métricas.`
          : "El lint no se midió: no suma al riesgo."}
      </p>
    </div>
  );
}

/** Los mensajes de un fichero, con su regla y su línea. */
function FileFindings({
  artifact,
  path
}: {
  artifact: LintArtifact;
  path: string;
}) {
  const messages = artifact.files[path]?.messages ?? [];
  if (messages.length === 0) {
    return <p className="muted tiny">Sin hallazgos en este fichero.</p>;
  }

  const shown = messages.slice(0, FINDING_ROWS);
  return (
    <div className="lint-findings">
      <GroupHead
        label="Hallazgos"
        summary={plural(messages.length, "hallazgo", "hallazgos")}
      />
      <div
        className="lint-message-list"
        role="group"
        aria-label="Hallazgos de lint"
      >
        {shown.map((message, index) => {
          const where = message.line
            ? `línea ${message.line}${message.column ? `:${message.column}` : ""}`
            : "sin línea";
          return (
            <div
              key={`${message.rule}-${message.line ?? 0}-${index}`}
              className="lint-message"
              title={`${message.rule} · ${where} · ${message.message}`}
            >
              <SeverityDot severity={message.severity} />
              <span className="lint-message-rule" title={message.rule}>
                {message.rule}
              </span>
              {message.line ? (
                <span className="mono lint-message-line">{message.line}</span>
              ) : null}
              <span className="lint-message-text">{message.message}</span>
            </div>
          );
        })}
      </div>
      {messages.length > shown.length ? (
        <p className="muted tiny">
          y {plural(messages.length - shown.length, "hallazgo", "hallazgos")} más.
        </p>
      ) : null}
    </div>
  );
}

/** La fila de una regla con hallazgos: la cuenta con tinta, el cero con raya. */
function FindingRow({ entry }: { entry: ReturnType<typeof lintRules>[number] }) {
  const info = entry.findings - entry.errors - entry.warnings;
  const cells: Array<[number, LintSeverity]> = [
    [entry.errors, "error"],
    [entry.warnings, "warn"],
    [info, "info"]
  ];
  const spoken = cells
    .filter(([value]) => value > 0)
    .map(([value, severity]) => severityText(value, severity))
    .join(" · ");

  return (
    <div
      className="lint-rule-row"
      title={`${entry.rule}${spoken ? ` · ${spoken}` : ""}`}
    >
      <span className="lint-rule-id">{entry.rule}</span>
      {cells.map(([value, severity]) => (
        <span
          key={severity}
          className={`mono lint-count${
            value > 0 ? ` lint-count-${severity}` : " is-zero"
          }`}
        >
          {value > 0 ? formatCompact(value) : "—"}
        </span>
      ))}
    </div>
  );
}

/** Las reglas con hallazgos en el ámbito, cortadas a las más pesadas. */
function RulesWithFindings({
  artifact,
  folder
}: {
  artifact: LintArtifact;
  folder: string;
}) {
  const rules = lintRules(artifact, folder);
  if (rules.length === 0) {
    // «Cero» sin decir cuántos se miraron es lo que hacía dudar de la medida
    // (ADR 0098): con la cobertura, el mismo cero es un dato.
    const measured = artifact.summary.measured;
    const scope = folder === "" ? "el proyecto" : "este subárbol";

    return (
      <p className="muted tiny">
        {folder === "" && measured !== undefined
          ? `Sin hallazgos en ${scope}: se midieron ${formatCompact(measured)} ficheros.`
          : `Sin hallazgos en ${scope}.`}
      </p>
    );
  }

  const shown = rules.slice(0, RULE_ROWS);
  return (
    <div className="lint-findings">
      <GroupHead
        label="Hallazgos por regla"
        summary={plural(rules.length, "regla", "reglas")}
      />
      <div className="lint-rule-head" aria-hidden="true">
        <span>Regla</span>
        <span>Err.</span>
        <span>Avis.</span>
        <span>Info</span>
      </div>
      <div
        className="lint-rule-list"
        role="group"
        aria-label="Hallazgos por regla"
      >
        {shown.map((entry) => (
          <FindingRow key={entry.rule} entry={entry} />
        ))}
      </div>
      {rules.length > shown.length ? (
        <p className="muted tiny">
          y {plural(rules.length - shown.length, "regla", "reglas")} más.
        </p>
      ) : null}
    </div>
  );
}

/** Lo que hay que hacer cuando no se midió, con el mínimo por lenguaje. */
function NotMeasured({
  advice,
  kind
}: {
  advice: readonly LintAdvice[];
  kind: "lint" | "rules";
}) {
  if (kind === "rules") {
    return (
      <div className="lint-advice">
        <p className="muted small">
          Las reglas del resto no se midieron. Ejecuta{" "}
          <code>codarch analyze</code> —las mide en la misma pasada que el mapa
          del resto—.
        </p>
      </div>
    );
  }
  return (
    <div className="lint-advice">
      <p className="muted small">
        El lint no se midió. Ejecuta <code>codarch analyze</code> —lo mide con
        el linter que el repo ya tiene, en la misma pasada que el resto de
        lentes— o <code>codarch lint</code> para medirlo suelto.
      </p>
      {advice.length > 0 ? (
        <>
          <GroupHead label="Mínimo recomendable" />
          <ul>
            {advice.map((entry) => (
              <li key={entry.language}>
                <div className="lint-advice-head">
                  <span>{entry.language}</span>
                  <span className="mono">{entry.tool}</span>
                </div>
                <p className="muted tiny">{entry.config}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/**
 * La sección **Lint** de las fichas de código, o **Reglas** en el mapa del
 * resto (ADR 0104 · ADR 0105).
 *
 * El fichero pasa `filePath` y, en código, su `risk`; carpeta y proyecto, solo
 * el ámbito. El catálogo de reglas activas no se enseña: es configuración.
 * En el resto no hay peso en el riesgo: las reglas no lo miran.
 */
export function LintSection({
  id,
  artifact,
  folder,
  advice = [],
  filePath,
  risk,
  title = "Lint",
  kind = "lint"
}: {
  id: string;
  artifact: LintArtifact | null;
  folder: string;
  advice?: readonly LintAdvice[];
  /** El fichero, cuando la ficha es de uno: enseña sus mensajes. */
  filePath?: string;
  /** La composición del riesgo, cuando la ficha es de un fichero de código. */
  risk?: RiskParts;
  /** «Lint» en el código; «Reglas» en el mapa del resto (ADR 0105). */
  title?: string;
  /** `rules` omite el peso en el riesgo y cambia el texto sin medir. */
  kind?: "lint" | "rules";
}) {
  const totals = artifact ? lintTotals(artifact, folder) : null;
  const findings = totals?.findings ?? 0;
  const rules = artifact ? lintRules(artifact, folder).length : 0;
  const summary = !totals
    ? "sin medir"
    : findings === 0
      ? "sin hallazgos"
      : kind === "lint" && risk && risk.lint.weight > 0
        ? `${formatWeight(risk.lint.weight)} del riesgo`
        : plural(rules, "regla con hallazgos", "reglas con hallazgos");

  return (
    <CollapsibleSection
      id={id}
      title={title}
      className="section-lint"
      count={findings}
      summary={summary}
    >
      {artifact && totals ? (
        <>
          {kind === "lint" && risk ? <RiskLine risk={risk} /> : null}
          {filePath ? (
            <FileFindings artifact={artifact} path={filePath} />
          ) : (
            <RulesWithFindings artifact={artifact} folder={folder} />
          )}
        </>
      ) : (
        <NotMeasured advice={advice} kind={kind} />
      )}
    </CollapsibleSection>
  );
}
