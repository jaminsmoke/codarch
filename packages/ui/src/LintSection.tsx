import type {
  LintArtifact,
  LintMessage,
  LintSeverity
} from "@codarch/lint/browser";
import type { HealthScope, HealthSnapshot } from "@codarch/lint/browser";
import { formatCompact } from "@codarch/render/browser";
import { CollapsibleSection, GroupHead } from "./CollapsibleSection";
import { healthCopy, healthOf, healthSummary, isClean, systemNotes } from "./lintHealth";
import { SEVERITIES, severityCount, severityText } from "./lintRollup";

/**
 * El lint de una ficha (ADR 0104).
 *
 * Un solo bloque de salud por ámbito. Errores, avisos e info, contados desde
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

function countsSummary(totals: {
  errors: number;
  warnings: number;
  info: number;
}): string {
  return SEVERITIES.map((severity) =>
    severityText(severityCount(totals, severity), severity)
  ).join(" · ");
}

/** Dónde está un mensaje, visible: línea o línea:columna. */
function messageWhere(line: number | undefined, column: number | undefined): string {
  if (line == null) return "sin línea";
  if (column == null) return String(line);
  return `${line}:${column}`;
}

/** Los mensajes de un fichero, con su regla y su posición. */
function FileFindings({ messages }: { messages: readonly LintMessage[] }) {
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
  files,
  onSelectPath
}: {
  files: ReadonlyArray<{
    path: string;
    counts: { errors: number; warnings: number; info: number };
    rules?: readonly string[];
    preview?: string;
  }>;
  onSelectPath?: (path: string) => void;
}) {
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
            severityText(severityCount(file.counts, severity), severity)
          ).join(" · ");
          const body = (
            <>
              <span className="lint-file-main">
                <span className="mono lint-file-path" title={file.path}>
                  {file.path}
                </span>
                {file.rules?.map((rule) => (
                  <span key={rule} className="lint-message-rule" title={rule}>
                    {rule}
                  </span>
                ))}
                {file.preview ? (
                  <span className="lint-message-text">{file.preview}</span>
                ) : null}
              </span>
              <SeverityCounts counts={file.counts} />
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
function NotMeasured({
  kind,
  detail
}: {
  kind: "lint" | "rules";
  detail: string;
}) {
  return (
    <div className="lint-advice">
      <p className="muted small">{detail}</p>
      {kind === "rules" ? (
        <p className="muted small">
          Ejecuta <code>codarch analyze</code> —mide las reglas del resto en la
          misma pasada que el mapa—.
        </p>
      ) : (
        <p className="muted small">
          Ejecuta <code>codarch analyze</code> —lo mide con el linter que el
          repo ya tiene— o <code>codarch lint</code> para medirlo suelto.
        </p>
      )}
    </div>
  );
}

/** Las notas que cualifican la medida; no el catálogo de reglas. */
function SystemNotes({
  notes
}: {
  notes: ReadonlyArray<{ name: string; note: string }>;
}) {
  if (notes.length === 0) return null;
  return (
    <ul className="muted tiny lint-system-notes">
      {notes.map((item) => (
        <li key={item.name}>
          <span className="mono">{item.name}</span> · {item.note}
        </li>
      ))}
    </ul>
  );
}

/**
 * La sección Lint de las fichas del mapa de código.
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
  snapshot,
  title = "Lint",
  kind = "lint",
  onSelectPath
}: {
  id: string;
  /** Solo el lint de código. El artefacto de documentos no entra aquí. */
  artifact: LintArtifact | null;
  folder: string;
  /** El fichero, cuando la ficha es de uno: enseña sus mensajes. */
  filePath?: string;
  /** El árbol del mapa abierto, para saber si la pasada está al día. */
  snapshot?: HealthSnapshot;
  title?: string;
  /** `rules` cambia el texto sin medir. */
  kind?: "lint" | "rules";
  /** Abre la ficha de un fichero de la lista. */
  onSelectPath?: (path: string) => void;
}) {
  const scope: HealthScope = filePath
    ? { kind: "file", path: filePath }
    : folder === ""
      ? { kind: "project", path: "" }
      : { kind: "folder", path: folder };
  const health = healthOf(artifact, scope, snapshot);
  const findings = health.counts.findings;
  const clean = isClean(health);
  const summary = healthSummary(health) || countsSummary(health.counts);
  const showCounts = health.coverage.state !== "unmeasured" || findings > 0;
  const notes = scope.kind === "project" ? systemNotes(artifact) : [];
  const files = health.affectedFiles.map((file) => {
    const messages = artifact?.files[file.path]?.messages ?? [];
    const rules = [...new Set(messages.map((message) => message.rule))];
    return {
      path: file.path,
      counts: file.counts,
      rules,
      ...(messages[0]?.message ? { preview: messages[0].message } : {})
    };
  });

  return (
    <CollapsibleSection
      id={id}
      title={title}
      className="section-lint"
      count={findings}
      summary={summary}
    >
      {clean ? (
        <div className="lint-health">
          <p className="lint-health-clean">{healthCopy(health)}</p>
          <SystemNotes notes={notes} />
        </div>
      ) : showCounts ? (
        <div className="lint-health">
          <p className="lint-health-counts">
            <SeverityCounts counts={health.counts} />
          </p>
          <p className="muted tiny lint-scope-note">{healthCopy(health)}</p>
          <SystemNotes notes={notes} />
        </div>
      ) : (
        <>
          <NotMeasured kind={kind} detail={healthCopy(health)} />
          <SystemNotes notes={notes} />
        </>
      )}
      {health.fresh === false ? (
        <p className="muted tiny lint-stale">
          Este análisis es de otro árbol: los hallazgos se conservan y pueden
          estar desfasados.
        </p>
      ) : null}
      {findings > 0 && scope.kind === "file" ? (
        <FileFindings messages={health.messages} />
      ) : null}
      {findings > 0 && scope.kind !== "file" ? (
        <AffectedFiles files={files} onSelectPath={onSelectPath} />
      ) : null}
    </CollapsibleSection>
  );
}
