import type { LintArtifact, LintSeverity } from "@codarch/lint/browser";
import { formatCompact } from "@codarch/render/browser";
import { CollapsibleSection, GroupHead } from "./CollapsibleSection";
import {
  SEVERITIES,
  affectedLintFiles,
  lintTotals,
  severityCount,
  severityText,
  type LintTotals
} from "./lintRollup";

/**
 * El lint de una ficha (ADR 0104).
 *
 * Un solo bloque de salud por ámbito: errores, avisos e info, contados desde
 * los mensajes. En el fichero, los mensajes con regla y línea:columna. En
 * carpeta y proyecto, el resumen y los ficheros que el artefacto lista en ese
 * ámbito. No enseña el catálogo de reglas activas ni los sistemas: eso es
 * configuración y vive en la hoja de docs y config.
 *
 * Sin artefacto no se enseñan ceros: se dice que no se midió. La cobertura por
 * carpeta o fichero no está en el artefacto; cuando se cita `measured`, se
 * dice que es de la pasada entera.
 */

/** Cuántos mensajes de un fichero se listan antes de cortar. */
const FINDING_ROWS = 10;

function plural(value: number, one: string, many: string): string {
  return `${formatCompact(value)} ${value === 1 ? one : many}`;
}

/** La tinta de la severidad, solo para un hallazgo. */
function SeverityDot({ severity }: { severity: LintSeverity }) {
  return <span className={`lint-dot lint-dot-${severity}`} aria-hidden="true" />;
}

/** Las tres cuentas del ámbito, cada una con su tinta. */
function SeverityCounts({
  counts
}: {
  counts: { errors: number; warnings: number; info: number };
}) {
  return (
    <span className="lint-counts">
      {SEVERITIES.map((severity, index) => {
        const value = severityCount(counts, severity);
        return (
          <span key={severity}>
            {index > 0 ? <span className="lint-counts-sep"> · </span> : null}
            <span
              className={`lint-count${
                value > 0 ? ` lint-count-${severity}` : " is-zero"
              }`}
            >
              {severityText(value, severity)}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function countsSummary(totals: LintTotals): string {
  return SEVERITIES.map((severity) =>
    severityText(severityCount(totals, severity), severity)
  ).join(" · ");
}

/**
 * Qué se puede decir de la cobertura sin inventarla.
 *
 * `summary.measured` es de la pasada entera. El proyecto puede decir «medido
 * y limpio» solo con artefacto, cero hallazgos y esa cifra. Carpeta y fichero
 * no la presentan como suya.
 */
function scopeNote(
  artifact: LintArtifact,
  folder: string,
  filePath: string | undefined,
  totals: LintTotals
): string {
  const measured = artifact.summary.measured;
  const pass =
    measured === undefined
      ? "Esta pasada no trae cuántos ficheros se midieron."
      : `La pasada entera midió ${formatCompact(measured)} ficheros; no es la cobertura de este ámbito.`;

  if (filePath) {
    if (totals.findings === 0) {
      return `Sin hallazgos en lo que el artefacto lista para este fichero. ${pass}`;
    }
    return "Estas cuentas salen de los mensajes de este fichero.";
  }

  if (folder === "") {
    if (totals.findings === 0) {
      return measured === undefined
        ? `Sin hallazgos en los ficheros que lista el artefacto. ${pass}`
        : `Medido y limpio: ${formatCompact(measured)} ficheros mirados, ninguno con hallazgos.`;
    }
    const files = plural(totals.files, "fichero con hallazgos", "ficheros con hallazgos");
    return measured === undefined
      ? `${files}.`
      : `${files}. La pasada midió ${formatCompact(measured)} ficheros.`;
  }

  if (totals.findings === 0) {
    return `Sin hallazgos en los ficheros que el artefacto lista en este subárbol. ${pass}`;
  }
  return `Estas cuentas salen de los mensajes del artefacto en este subárbol. ${pass}`;
}

/** Dónde está un mensaje, visible: línea o línea:columna. */
function messageWhere(line: number | undefined, column: number | undefined): string {
  if (!line) return "sin línea";
  return column ? `${line}:${column}` : String(line);
}

/** Los mensajes de un fichero, con su regla y su posición. */
function FileFindings({
  artifact,
  path
}: {
  artifact: LintArtifact;
  path: string;
}) {
  const messages = artifact.files[path]?.messages ?? [];
  if (messages.length === 0) return null;

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
          const where = messageWhere(message.line, message.column);
          return (
            <div
              key={`${message.rule}-${message.line ?? 0}-${message.column ?? 0}-${index}`}
              className="lint-message"
              title={`${message.rule} · ${where} · ${message.message}`}
            >
              <SeverityDot severity={message.severity} />
              <span className="lint-message-rule" title={message.rule}>
                {message.rule}
              </span>
              <span className="mono lint-message-line">{where}</span>
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

/** Los ficheros del ámbito que el artefacto lista con mensajes. */
function AffectedFiles({
  artifact,
  folder,
  onSelectPath
}: {
  artifact: LintArtifact;
  folder: string;
  onSelectPath?: (path: string) => void;
}) {
  const files = affectedLintFiles(artifact, folder);
  if (files.length === 0) return null;

  return (
    <div className="lint-findings">
      <GroupHead
        label="Ficheros con hallazgos"
        summary={plural(files.length, "fichero", "ficheros")}
      />
      <div
        className="lint-file-list"
        role="group"
        aria-label="Ficheros con hallazgos"
      >
        {files.map((file) => {
          const spoken = SEVERITIES.map((severity) =>
            severityText(severityCount(file, severity), severity)
          ).join(" · ");
          const body = (
            <>
              <span className="mono lint-file-path" title={file.path}>
                {file.path}
              </span>
              <SeverityCounts counts={file} />
            </>
          );
          if (!onSelectPath) {
            return (
              <div key={file.path} className="lint-file-row" title={spoken}>
                {body}
              </div>
            );
          }
          return (
            <button
              key={file.path}
              type="button"
              className="lint-file-row"
              title={`${file.path} · ${spoken} · pulsa para abrir el fichero`}
              onClick={() => onSelectPath(file.path)}
            >
              {body}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Lo que hay que decir cuando no se midió. Sin consejo de configuración. */
function NotMeasured({ kind }: { kind: "lint" | "rules" }) {
  if (kind === "rules") {
    return (
      <div className="lint-advice">
        <p className="muted small">
          Sin medir. Las reglas del resto no se midieron. Ejecuta{" "}
          <code>codarch analyze</code> —las mide en la misma pasada que el mapa
          del resto—.
        </p>
      </div>
    );
  }
  return (
    <div className="lint-advice">
      <p className="muted small">
        Sin medir. El lint no se midió. Ejecuta <code>codarch analyze</code>{" "}
        —lo mide con el linter que el repo ya tiene, en la misma pasada que el
        resto de lentes— o <code>codarch lint</code> para medirlo suelto.
      </p>
    </div>
  );
}

/**
 * La sección **Lint** de las fichas, o **Reglas** en el mapa del resto.
 *
 * El fichero pasa `filePath` y enseña sus mensajes. Carpeta y proyecto pasan
 * el ámbito y, si hay navegación, `onSelectPath` para abrir un fichero de la
 * lista.
 */
export function LintSection({
  id,
  artifact,
  folder,
  filePath,
  title = "Lint",
  kind = "lint",
  stale = false,
  onSelectPath
}: {
  id: string;
  artifact: LintArtifact | null;
  folder: string;
  /** El fichero, cuando la ficha es de uno: enseña sus mensajes. */
  filePath?: string;
  /** «Lint» en el código; «Reglas» en el mapa del resto (ADR 0105). */
  title?: string;
  /** `rules` cambia el texto sin medir. */
  kind?: "lint" | "rules";
  /** El artefacto es de otro árbol que el mapa que se está mirando. */
  stale?: boolean;
  /** Abre la ficha de un fichero de la lista. */
  onSelectPath?: (path: string) => void;
}) {
  const totals = artifact ? lintTotals(artifact, filePath ?? folder) : null;
  const findings = totals?.findings ?? 0;
  const summary = !totals
    ? "sin medir"
    : findings === 0
      ? !filePath && folder === "" && artifact?.summary.measured !== undefined
        ? "medido y limpio"
        : "sin hallazgos en el artefacto"
      : countsSummary(totals);

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
          <div className="lint-health">
            <p className="lint-health-counts">
              <SeverityCounts counts={totals} />
            </p>
            <p className="muted tiny lint-scope-note">
              {scopeNote(artifact, folder, filePath, totals)}
            </p>
          </div>
          {stale ? (
            <p className="muted tiny lint-stale">
              Este lint es de otro árbol: se midió antes del último análisis. Se
              vuelve a medir al guardar con el live; si no, con{" "}
              <code>codarch analyze</code>.
            </p>
          ) : null}
          {findings > 0 && filePath ? (
            <FileFindings artifact={artifact} path={filePath} />
          ) : null}
          {findings > 0 && !filePath ? (
            <AffectedFiles
              artifact={artifact}
              folder={folder}
              onSelectPath={onSelectPath}
            />
          ) : null}
        </>
      ) : (
        <NotMeasured kind={kind} />
      )}
    </CollapsibleSection>
  );
}
