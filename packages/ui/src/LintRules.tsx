import type {
  LintAdvice,
  LintArtifact,
  LintRule,
  LintSeverity
} from "@codarch/lint/browser";
import { formatCompact } from "@codarch/render/browser";
import { CollapsibleSection, GroupHead } from "./CollapsibleSection";
import {
  SEVERITIES,
  SEVERITY_WORDS,
  lintRules,
  severityText
} from "./lintRollup";

/**
 * El lint dentro de **Reglas** (ADR 0096).
 *
 * Reglas habla de **reglas**: qué sistemas declara el proyecto, con qué
 * configuración, cuáles midieron, cuántas reglas activas resolvieron y qué
 * reglas tienen hallazgos en este ámbito. Los totales de errores, avisos e info
 * viven en Métricas; repetirlos aquí era la manera de que las dos hojas dijeran
 * cifras distintas con las mismas palabras.
 *
 * La tinta de la severidad es de los **hallazgos**: el rojo de la deuda, el ocre
 * del aviso y el azul del `info` son los mismos que la pestaña Cambios usa para
 * una violación de lint. La configuración no la lleva: una regla activa dice
 * cómo está configurada y todavía no ha producido nada, así que se cuenta en
 * palabras («372 como error») y en gris. Pintarla como deuda hacía que Reglas
 * pareciera contradecir el cero de Métricas.
 *
 * Sin artefacto no se enseñan ceros: se dice que no se midió y, si se conoce
 * el stack, cuál sería el lint mínimo recomendable. Nunca se escribe config.
 */

/** Cuántas reglas con hallazgos se listan antes de cortar. */
const RULE_ROWS = 12;

/** Cuántas reglas activas se listan por sistema antes de cortar. */
const ACTIVE_ROWS = 80;

interface SeverityCounts {
  error: number;
  warn: number;
  info: number;
}

function plural(value: number, one: string, many: string): string {
  return `${formatCompact(value)} ${value === 1 ? one : many}`;
}

function tally(rules: readonly LintRule[]): SeverityCounts {
  const counts: SeverityCounts = { error: 0, warn: 0, info: 0 };
  for (const rule of rules) counts[rule.severity] += 1;
  return counts;
}

/**
 * La configuración de un sistema, en palabras y sin la tinta de la deuda.
 *
 * Una regla activa no es un hallazgo: `no-console` configurada como error no
 * ha producido nada todavía. Contarla con el rojo de la deuda —o rotularla
 * «errores»— hacía que Reglas pareciera contradecir a Métricas, que cuenta
 * mensajes (ADR 0096). Aquí se dice «configurada como».
 */
function ConfigCounts({ counts }: { counts: SeverityCounts }) {
  const parts = SEVERITIES.filter((severity) => counts[severity] > 0).map(
    (severity) =>
      `${formatCompact(counts[severity])} como ${SEVERITY_WORDS[severity][0]}`
  );
  if (parts.length === 0) return null;
  return (
    <p className="lint-config">Configuración · {parts.join(" · ")}</p>
  );
}

/** Las reglas activas de un sistema, plegadas: a veces son cientos. */
function ActiveRules({ rules }: { rules: readonly LintRule[] }) {
  const shown = rules.slice(0, ACTIVE_ROWS);
  return (
    <details className="lint-active">
      <summary>
        <span className="lint-active-label">
          {plural(rules.length, "regla activa", "reglas activas")}
        </span>
      </summary>
      <p className="muted tiny lint-active-note">
        Cada regla, con la severidad que le da la configuración.
      </p>
      <ul>
        {shown.map((rule, index) => (
          <li key={`${rule.id}-${index}`} title={rule.id}>
            <span className="lint-dot" aria-hidden="true" />
            <span className="lint-rule-id">{rule.id}</span>
            <span className="lint-sev">
              {SEVERITY_WORDS[rule.severity][0]}
            </span>
          </li>
        ))}
      </ul>
      {rules.length > shown.length ? (
        <p className="muted tiny">
          y {plural(rules.length - shown.length, "regla", "reglas")} más.
        </p>
      ) : null}
    </details>
  );
}

/** Los sistemas que declara el proyecto, con su config y su estado. */
function Systems({ artifact }: { artifact: LintArtifact }) {
  return (
    <>
      <p className="muted tiny lint-systems-note">
        La severidad de una regla activa es su configuración; los hallazgos que
        produce se cuentan en Métricas.
      </p>
      <ul className="lint-systems" aria-label="Sistemas de lint del proyecto">
      {artifact.meta.systems.map((system) => {
        const measured = artifact.meta.tools.includes(system.name);
        const rules = system.rules ?? [];
        return (
          <li
            key={system.name}
            className={`lint-system${measured ? " is-on" : ""}`}
          >
            <div className="lint-system-head">
              <span className="lint-system-name">{system.name}</span>
              <span
                className={`lint-state${measured ? " is-on" : ""}`}
                title={
                  measured
                    ? "Dejó su JSON: sus hallazgos están en el artefacto."
                    : "No llegó a medir: ni sus hallazgos ni sus reglas cuentan."
                }
              >
                {measured ? "medido" : "sin medir"}
              </span>
            </div>
            <span
              className={`lint-system-config${system.config ? "" : " is-none"}`}
              title={system.config ?? "sin config"}
            >
              {system.config ?? "sin config"}
            </span>
            <ConfigCounts counts={tally(rules)} />
            {rules.length > 0 ? (
              <ActiveRules rules={rules} />
            ) : (
              <p className="muted tiny lint-system-note">
                {system.note ?? "reglas sin enumerar"}
              </p>
            )}
            {rules.length > 0 && system.note ? (
              <p className="muted tiny lint-system-note">{system.note}</p>
            ) : null}
          </li>
        );
      })}
      </ul>
    </>
  );
}

/** Lo que hay que hacer cuando no se midió, con el mínimo por lenguaje. */
function NotMeasured({ advice }: { advice: readonly LintAdvice[] }) {
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
        label="Reglas con hallazgos"
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
        aria-label="Reglas con hallazgos"
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

/**
 * El bloque de lint de una hoja.
 *
 * `showSystems` solo en el proyecto: los sistemas son del repo y repetirlos en
 * cada carpeta y cada fichero sería ruido. En carpeta y fichero se leen sus
 * hallazgos, que es lo que cambia.
 */
export function LintGroup({
  artifact,
  folder,
  advice = [],
  showSystems = false
}: {
  artifact: LintArtifact | null;
  /** La carpeta del subárbol; en un fichero, su ruta. */
  folder: string;
  advice?: readonly LintAdvice[];
  showSystems?: boolean;
}) {
  if (!artifact) return <NotMeasured advice={advice} />;

  return (
    <div className="lint-group">
      {showSystems && artifact.meta.systems.length > 0 ? (
        <Systems artifact={artifact} />
      ) : null}
      <RulesWithFindings artifact={artifact} folder={folder} />
    </div>
  );
}

/** La sección **Reglas** de la ficha de proyecto y de carpeta. */
export function LintRulesSection({
  id,
  artifact,
  folder,
  advice = [],
  showSystems = false
}: {
  id: "project-rules" | "folder-rules";
  artifact: LintArtifact | null;
  folder: string;
  advice?: readonly LintAdvice[];
  showSystems?: boolean;
}) {
  const withFindings = lintRules(artifact, folder).length;
  // En el proyecto el número cuenta las reglas activas: decir «0» en un repo
  // con veinte reglas y ningún hallazgo se lee como que no hay reglas.
  const active = artifact
    ? artifact.meta.systems.reduce(
        (count, system) => count + (system.rules?.length ?? 0),
        0
      )
    : 0;
  const count = showSystems && active > 0 ? active : withFindings;
  // El resumen dice cuántas reglas, no cuántos hallazgos: los totales de
  // errores, avisos e info son de Métricas y repetirlos aquí los contaba dos
  // veces con las mismas palabras (ADR 0096). En carpeta y fichero, el número
  // de la cabecera ya es el de reglas con hallazgos y no se repite al cerrar.
  const summary = !artifact
    ? "lint sin medir"
    : withFindings === 0
      ? "sin hallazgos"
      : showSystems
        ? plural(withFindings, "regla con hallazgos", "reglas con hallazgos")
        : undefined;

  return (
    <CollapsibleSection
      id={id}
      title="Reglas"
      className="section-rules"
      count={count}
      summary={summary}
    >
      <LintGroup
        artifact={artifact}
        folder={folder}
        advice={advice}
        showSystems={showSystems}
      />
    </CollapsibleSection>
  );
}
