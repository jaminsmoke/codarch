import {
  scopeHealth,
  type HealthScope,
  type HealthSnapshot,
  type LintArtifact,
  type LintSeverity
} from "@codarch/lint/browser";
import { formatCompact } from "@codarch/render/browser";
import { CollapsibleSection, GroupHead } from "./CollapsibleSection";
import {
  originBadge,
  readSelection,
  type ScopeHealthMerged,
  type TaggedFile,
  type TaggedFinding
} from "./lintAdapter";
import { healthCopy, originHealthCopy } from "./lintHealth";
import { SEVERITIES, severityCount, severityText } from "./lintRollup";

/**
 * El lint de una ficha (ADR 0104).
 *
 * Un solo bloque de salud por ámbito. Los mensajes del código y los de docs
 * entran juntos, cada uno con su dominio y su herramienta, y la cobertura se
 * lee por origen. No enseña el catálogo de reglas activas: eso vive en la
 * hoja de docs y config.
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

function OriginMark({
  domain,
  tool,
  tools
}: {
  domain: TaggedFinding["domain"];
  tool: string | null;
  tools: readonly string[];
}) {
  const label = originBadge(domain, tool, tools);
  return (
    <span className={`lint-origin lint-origin-${domain}`} title={label}>
      {label}
    </span>
  );
}

/** Los mensajes de un fichero, con su origen, su regla y su posición. */
function FileFindings({ messages }: { messages: readonly TaggedFinding[] }) {
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
          const badge = originBadge(message.domain, message.tool, message.tools);
          return (
            <div
              key={`${message.domain}-${message.rule}-${message.line ?? 0}-${message.column ?? 0}-${index}`}
              className="lint-message"
              title={`${badge} · ${message.rule} · ${where} · ${message.message}`}
            >
              <SeverityDot severity={message.severity} />
              <OriginMark domain={message.domain} tool={message.tool} tools={message.tools} />
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
  files: readonly TaggedFile[];
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
          const counts = {
            errors: file.errors,
            warnings: file.warnings,
            info: file.info
          };
          const badge = originBadge(file.domain, file.tool, file.tools);
          const spoken = SEVERITIES.map((severity) =>
            severityText(severityCount(counts, severity), severity)
          ).join(" · ");
          const body = (
            <>
              <span className="lint-file-main">
                <OriginMark domain={file.domain} tool={file.tool} tools={file.tools} />
                <span className="mono lint-file-path" title={file.path}>
                  {file.path}
                </span>
              </span>
              <SeverityCounts counts={counts} />
            </>
          );
          const key = `${file.domain}:${file.path}`;
          if (!onSelectPath) {
            return (
              <div key={key} className="lint-file-row" title={`${badge} · ${spoken}`}>
                {body}
              </div>
            );
          }
          return (
            <button
              key={key}
              type="button"
              className="lint-file-row"
              title={`${badge} · ${file.path} · ${spoken} · pulsa para abrir el fichero`}
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
function NotMeasured({ detail }: { detail: string }) {
  return (
    <div className="lint-advice">
      <p className="muted small">{detail}</p>
      <p className="muted small">
        Ejecuta <code>codarch analyze</code> —lo mide con el linter que el repo
        ya tiene— o <code>codarch lint</code> para medirlo suelto.
      </p>
    </div>
  );
}

function selectionSummary(merged: ScopeHealthMerged): string {
  if (merged.clean) return "limpio y al día";
  if (merged.counts.findings > 0) return countsSummary(merged.counts);
  if (!merged.origins.some((origin) => origin.applicable)) return "sin medir";
  return "cobertura por origen";
}

/**
 * La sección Lint de las fichas.
 *
 * El fichero pasa `filePath` y enseña sus mensajes. Carpeta y proyecto pasan
 * el ámbito y, si hay navegación, `onSelectPath` para abrir un fichero de la
 * lista. El título no cambia con el mapa.
 */
export function LintSection({
  id,
  artifact = null,
  code,
  docs,
  folder,
  filePath,
  snapshot,
  codeSnapshot,
  docsSnapshot,
  title = "Lint",
  onSelectPath
}: {
  id: string;
  /**
   * Un solo artefacto, el de los tests y las fichas que aún no pasan los dos.
   * Si su dominio es `docs`, cuenta como docs; si no, como código.
   */
  artifact?: LintArtifact | null;
  code?: LintArtifact | null;
  docs?: LintArtifact | null;
  folder: string;
  /** El fichero, cuando la ficha es de uno: enseña sus mensajes. */
  filePath?: string;
  /** El árbol del artefacto único, para `fresh`. */
  snapshot?: HealthSnapshot;
  codeSnapshot?: HealthSnapshot;
  docsSnapshot?: HealthSnapshot;
  title?: string;
  /** Abre la ficha de un fichero de la lista. */
  onSelectPath?: (path: string) => void;
}) {
  const explicit = code !== undefined || docs !== undefined;
  const codeArtifact = explicit
    ? code ?? null
    : artifact?.domain === "docs"
      ? null
      : artifact;
  const docsArtifact = explicit
    ? docs ?? null
    : artifact?.domain === "docs"
      ? artifact
      : null;
  const scope: HealthScope = filePath
    ? { kind: "file", path: filePath }
    : folder === ""
      ? { kind: "project", path: "" }
      : { kind: "folder", path: folder };
  const resolvedCodeSnapshot =
    codeSnapshot ?? (artifact?.domain === "docs" ? undefined : snapshot);
  const resolvedDocsSnapshot =
    docsSnapshot ?? (artifact?.domain === "docs" ? snapshot : undefined);
  if (!codeArtifact && !docsArtifact) {
    const absent = scopeHealth(
      null,
      scope,
      resolvedCodeSnapshot ?? resolvedDocsSnapshot
    );
    return (
      <CollapsibleSection
        id={id}
        title={title}
        className="section-lint"
        count={0}
        summary="sin medir"
      >
        <NotMeasured detail={healthCopy(absent)} />
      </CollapsibleSection>
    );
  }
  const merged = readSelection({
    code: codeArtifact,
    docs: docsArtifact,
    scope,
    codeSnapshot: resolvedCodeSnapshot,
    docsSnapshot: resolvedDocsSnapshot
  });
  const findings = merged.counts.findings;
  const visible = merged.origins.filter(
    (origin) => origin.health !== null && origin.tools.length > 0
  );
  const summary = selectionSummary(merged);

  return (
    <CollapsibleSection
      id={id}
      title={title}
      className="section-lint"
      count={findings}
      summary={summary}
    >
      {visible.length > 0 ? (
        <div className="lint-health">
          {findings > 0 || visible.some((origin) => origin.applicable) ? (
            <p className="lint-health-counts">
              <SeverityCounts counts={merged.counts} />
            </p>
          ) : null}
          <div className="lint-origins">
            {visible.map((origin) =>
              origin.health ? (
                <p key={origin.domain} className="muted tiny lint-scope-note">
                  <OriginMark
                    domain={origin.domain}
                    tool={origin.tools.length === 1 ? origin.tools[0] ?? null : null}
                    tools={origin.tools}
                  />{" "}
                  {originHealthCopy(origin.health, merged.clean)}
                </p>
              ) : null
            )}
          </div>
        </div>
      ) : (
        <NotMeasured detail="Sin medir." />
      )}
      {merged.origins.some((origin) => origin.health?.fresh === false) ? (
        <p className="muted tiny lint-stale">
          Este análisis es de otro árbol: los hallazgos se conservan y pueden
          estar desfasados.
        </p>
      ) : null}
      {findings > 0 && scope.kind === "file" ? (
        <FileFindings messages={merged.findings} />
      ) : null}
      {findings > 0 && scope.kind !== "file" ? (
        <AffectedFiles files={merged.affectedFiles} onSelectPath={onSelectPath} />
      ) : null}
    </CollapsibleSection>
  );
}
