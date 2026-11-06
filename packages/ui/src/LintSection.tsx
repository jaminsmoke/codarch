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
 * Sin artefacto no se enseñan ceros: se dice que no se midió. Cero hallazgos
 * no es un ámbito limpio: no hay dato de cobertura completa. `measured`, si
 * viene, se cita como el total de la pasada.
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
 * Cero hallazgos no es un ámbito sano.
 *
 * No hay un `scopeHealth` que pruebe cobertura completa y frescura. Con
 * artefacto y cero mensajes se dice que no se observaron hallazgos y que la
 * cobertura no está verificada, en los tres ámbitos. `summary.measured`, si
 * viene, es de la pasada entera y se nombra así; un cero también.
 */
const UNOBSERVED = "Sin hallazgos observados; cobertura no verificada";

function globalMeasured(measured: number | undefined): string {
  if (measured === undefined) return "";
  return ` La pasada miró ${formatCompact(measured)} ficheros en total.`;
}

function scopeNote(
  artifact: LintArtifact,
  folder: string,
  filePath: string | undefined,
  totals: LintTotals
): string {
  const measured = globalMeasured(artifact.summary.measured);
  if (totals.findings === 0) return `${UNOBSERVED}.${measured}`;
  if (filePath) {
    return `Estas cuentas salen de los mensajes de este fichero.${measured}`;
  }
  if (folder === "") {
    const files = plural(totals.files, "fichero con hallazgos", "ficheros con hallazgos");
    return `${files}.${measured}`;
  }
  return `Estas cuentas salen de los mensajes del artefacto en este subárbol.${measured}`;
}

/** Dónde está un mensaje, visible: línea o línea:columna. */
function messageWhere(line: number | undefined, column: number | undefined): string {
  if (line == null) return "sin línea";
  if (column == null) return String(line);
  return `${line}:${column}`;
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
      ? stale
        ? "puede estar desfasado"
        : "cobertura no verificada"
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
              Este lint es de otro árbol: lo que se enseña es de una pasada
              anterior y puede estar desfasado. No es un ámbito limpio.
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
