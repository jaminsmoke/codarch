import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { formatCompact } from "@codarch/render/browser";
import type {
  CcMigrationLanguageStats,
  CcMigrationLens,
  CcMigrationNode,
  CcMigrationStatus,
  CcMember,
  CcStructureNode,
  CcSymbol,
  HistoryEntry,
  SymbolChain,
  SymbolHeat
} from "@codarch/schema/browser";
import type { DiffReport } from "@codarch/metrics/browser";
import type { RenderFile, RenderModel } from "@codarch/render/browser";
import type { CodeRequest, CodeSnippet, EditorRequest } from "./platform";
import { Caret, CollapsibleSection } from "./CollapsibleSection";
import { splitFileName } from "./fileName";
import { RiskBreakdown, RulesSection } from "./FileSections";
import { fileMetricRows } from "./metrics";
import { groupSymbols, symbolSummary } from "./symbols";
import {
  groupMembers,
  memberSummary,
  surfaceCount,
  surfaceSummary
} from "./structure";

/** El editor de la ficha va en su propio trozo: el mapa no lo paga (ADR 0086). */
const CodeEditor = lazy(() => import("./CodeEditor"));

import {
  EVENT_LABEL,
  LANGUAGE_COLOR,
  STATUS_COLOR,
  STATUS_LABEL,
  SYMBOL_LABEL
} from "./labels";

export function Kpi({
  label,
  value,
  accent
}: {
  label: string;
  value: number;
  accent?: "debt";
}) {
  return (
    <div className={`kpi${accent ? ` kpi-${accent}` : ""}`}>
      <span>{label}</span>
      <b>{formatCompact(value)}</b>
    </div>
  );
}

export function LanguageSample({
  model,
  migration
}: {
  model: RenderModel | null;
  migration: CcMigrationLens | null;
}) {
  if (!migration) {
    return (
      <section className="panel-block">
        <div className="eyebrow">Estratos</div>
        <p className="muted small">Este snapshot no trae lente de migración.</p>
      </section>
    );
  }

  const languages = Object.entries(migration.summary.languages).filter(
    (entry): entry is [string, CcMigrationLanguageStats] => entry[1] !== undefined
  );
  const total = languages.reduce((sum, [, stats]) => sum + stats.rloc, 0);

  return (
    <section className="panel-block">
      <div className="eyebrow">Estratos</div>
      <div className="strata" aria-label="Reparto por lenguaje">
        {languages.map(([language, stats]) => {
          if (stats.rloc === 0) return null;
          return (
            <i
              key={language}
              title={`${language}: ${formatCompact(stats.rloc)} rloc`}
              style={{
                width: `${(stats.rloc / total) * 100}%`,
                background: LANGUAGE_COLOR[language] ?? "#7b8790"
              }}
            />
          );
        })}
      </div>
      <div className="strata-legend">
        {languages.map(([language, stats]) => (
          <div key={language} className="strata-row">
            <i style={{ background: LANGUAGE_COLOR[language] ?? "#7b8790" }} />
            <span>{language}</span>
            <span className="mono">{formatCompact(stats.rloc)}</span>
          </div>
        ))}
      </div>
      <div className="status-row">
        {(["js", "rust", "bridge", "native"] as CcMigrationStatus[]).map((status) => (
          <span key={status} className="status-chip">
            <i style={{ background: STATUS_COLOR[status] }} />
            {STATUS_LABEL[status]} <b>{migration.summary.status[status]}</b>
          </span>
        ))}
      </div>
      <div className="muted tiny">
        {migration.summary.ffiEdges} aristas FFI · {migration.summary.bridgeFiles} puentes ·{" "}
        {model ? `${formatCompact(model.fileCount)} ficheros` : ""}
      </div>
    </section>
  );
}

export function Legend({
  colorMode,
  migration,
  model
}: {
  colorMode: string;
  migration: CcMigrationLens | null;
  model: RenderModel | null;
}) {
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

export function HistoryPanel({
  load,
  onOpenSnapshot
}: {
  load: () => Promise<HistoryEntry[] | null>;
  onOpenSnapshot: (entry: HistoryEntry) => void;
}) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await load();
      if (cancelled) return;
      setEntries(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (!entries || entries.length === 0) return null;

  return (
    <section className="panel-block">
      <div className="eyebrow">Historia</div>
      <div className="history-list">
        {entries
          .slice()
          .reverse()
          .map((entry) => (
            <button
              key={entry.checksum}
              type="button"
              className="history-row"
              onClick={() => onOpenSnapshot(entry)}
              title={`${entry.files} ficheros · ${entry.rloc} rloc`}
            >
              <span className="mono history-date">{entry.date.slice(0, 16).replace("T", " ")}</span>
              <span className="mono history-count">{entry.files} f.</span>
            </button>
          ))}
        </div>
    </section>
  );
}

/** El nombre del fichero de una foto del historial. */
export function historyFileName(entry: { date: string; checksum: string }): string {
  const stamp = entry.date.replace(/[:.]/g, "-").replace("Z", "");
  return `${stamp}-${entry.checksum.slice(0, 8)}.cc.json`;
}

/**
 * Los símbolos más reescritos.
 *
 * A nivel de fichero no existe esta señal: un fichero con veinte funciones
 * quietas y otro con una que se reescribe cada semana pesan igual ✓. Aquí
 * no ✓.
 */
export function HeatList({
  load,
  onSelectSymbol
}: {
  load: () => Promise<SymbolHeat[] | null>;
  onSelectSymbol: (name: string, path: string) => void;
}) {
  const [heat, setHeat] = useState<SymbolHeat[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await load();
      if (cancelled) return;
      setHeat(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (!heat || heat.length === 0) return null;

  const max = Math.max(1, heat[0]?.churn ?? 1);

  return (
    <section className="panel-block">
      <div className="eyebrow">Más reescritos</div>
      <div className="mini-list">
        {heat.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="mini-row"
            onClick={() => onSelectSymbol(entry.name, entry.path)}
            title={`${entry.path} · ${entry.changes} cambios · ${entry.moves} mudanzas`}
          >
            <span className="mini-name">{entry.name}</span>
            <span className="mini-track">
              <i
                style={{
                  width: `${Math.max(4, (entry.churn / max) * 100)}%`,
                  background: "var(--rust)"
                }}
              />
            </span>
            <span className="mono">{entry.churn}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Lo que se abre bajo una fila: un símbolo o un miembro de clase. */
interface CodeTarget {
  id: string;
  name: string;
  path: string;
  line: number;
  lines?: number;
}

function symbolTarget(file: RenderFile, symbol: CcSymbol): CodeTarget {
  return {
    id: `symbol:${symbol.kind}:${symbol.name}:${symbol.line}`,
    name: symbol.name,
    path: file.path,
    line: symbol.line,
    lines: symbol.lines
  };
}

function memberTarget(
  file: RenderFile,
  owner: string,
  member: CcMember
): CodeTarget {
  return {
    id: `member:${owner}:${member.name}:${member.line}`,
    name: `${owner}.${member.name}`,
    path: file.path,
    line: member.line,
    lines: member.lines
  };
}

/**
 * Quita la sangría común de una muestra de código.
 *
 * El símbolo se enseña desde la columna 0 aunque en el fichero viva dentro de
 * tres bloques: la muestra se lee mejor y las líneas largas caben en el panel
 * sin barra horizontal. Las líneas en blanco se quedan en blanco.
 */
export function dedentLines(lines: readonly string[]): string[] {
  let common = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    if (line.trim() === "") continue;
    const indent = line.length - line.trimStart().length;
    if (indent < common) common = indent;
  }
  if (!Number.isFinite(common) || common === 0) return lines.slice();
  return lines.map((line) => line.slice(common));
}

function InlineCode({
  state,
  onOpenEditor
}: {
  state: {
    target: CodeTarget;
    snippet: CodeSnippet | null;
    loading: boolean;
    error: string | null;
  };
  onOpenEditor: (request: EditorRequest) => Promise<boolean>;
}) {
  const { target, snippet, loading, error } = state;
  const [message, setMessage] = useState<string | null>(null);

  // La muestra va sin la sangría común: el símbolo empieza en la columna 0 y
  // las líneas largas caben en el panel sin barra horizontal.
  const codeLines = useMemo(
    () => (snippet ? dedentLines(snippet.lines) : []),
    [snippet]
  );

  const openEditor = async (): Promise<void> => {
    const ok = await onOpenEditor({ path: target.path, line: target.line });
    setMessage(
      ok
        ? null
        : "No se pudo abrir el editor. Copia la ruta y pégala en tu editor."
    );
  };

  const copyPath = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(`${target.path}:${target.line}`);
      setMessage("Ruta copiada.");
    } catch {
      setMessage(`No se pudo copiar. La ruta es ${target.path}:${target.line}`);
    }
  };

  return (
    <div className="symbol-code">
      <div className="symbol-code-head">
        <span>Código</span>
        <span className="mono">
          {snippet
            ? `líneas ${snippet.start}–${snippet.end}`
            : `línea ${target.line}`}
        </span>
        <span className="symbol-code-actions">
          <button type="button" onClick={() => void openEditor()}>
            Editor
          </button>
          <button type="button" onClick={() => void copyPath()}>
            Copiar ruta
          </button>
        </span>
      </div>
      {message ? (
        <p className="muted tiny" role="status">
          {message}
        </p>
      ) : null}
      {loading ? (
        <p className="muted small">Cargando el código…</p>
      ) : error ? (
        <p className="muted small">No se pudo leer el código: {error}</p>
      ) : snippet && codeLines.length > 0 ? (
        <>
          <div role="group" aria-label={`Código de ${target.name}`}>
            <Suspense
              fallback={<p className="muted small">Cargando el código…</p>}
            >
              <CodeEditor
                lines={codeLines}
                start={snippet.start}
                path={target.path}
              />
            </Suspense>
          </div>
          {snippet.end < snippet.total ? (
            <p className="muted tiny code-note">
              Se muestran las líneas {snippet.start}–{snippet.end} de{" "}
              {snippet.total}.
            </p>
          ) : null}
        </>
      ) : (
        <p className="muted small">
          El código no está disponible en esta plataforma.
        </p>
      )}
    </div>
  );
}

export function Inspector({
  model,
  file,
  migrationNode,
  areaMetric,
  colorMode,
  metricTitle,
  symbols,
  structure,
  chain,
  report,
  migration,
  onSelectSymbol,
  onLoadCode,
  onOpenEditor,
  onSelectPath,
  onColorMode
}: {
  model: RenderModel | null;
  file: RenderFile | null;
  migrationNode: CcMigrationNode | null;
  areaMetric: string | null;
  /** El modo de color activo: marca la fila que pinta el mapa. */
  colorMode: string;
  metricTitle: (key: string) => string;
  symbols: CcSymbol[];
  /** Miembros, imports y exports del fichero (ADR 0064). */
  structure: CcStructureNode | null;
  chain: SymbolChain | null;
  /** El reporte del diff: las reglas de dominio viven ahí (ADR 0069). */
  report: DiffReport | null;
  /** La lente de migración del snapshot, para los cruces FFI. */
  migration: CcMigrationLens | null;
  onSelectSymbol: (name: string) => void;
  /** El código del símbolo, si la plataforma lo sirve (ADR 0067). */
  onLoadCode: (request: CodeRequest) => Promise<CodeSnippet | null>;
  /** Abre el fichero en el editor del usuario (ADR 0068). */
  onOpenEditor: (request: EditorRequest) => Promise<boolean>;
  /** Abre otro fichero del grafo desde Dependencias. */
  onSelectPath: (path: string) => void;
  /** Pinta el mapa por una métrica (o por el riesgo). */
  onColorMode: (mode: string) => void;
}) {
  /**
   * El código del símbolo elegido (ADR 0067). Vive en el inspector y no en el
   * hook: es un detalle de la ficha, no del proyecto. Va pegado a su fila,
   * como un desplegable más.
   */
  const [code, setCode] = useState<{
    target: CodeTarget;
    snippet: CodeSnippet | null;
    loading: boolean;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    setCode(null);
  }, [file?.nodeId]);

  if (!file) {
    return (
      <section className="inspector-empty">
        <h2>Selecciona una celda</h2>
        <p className="muted small">
          El mapa conserva la jerarquía de carpetas. Pasa el cursor para ver la ruta y haz
          clic para abrir las métricas del fichero.
        </p>
        {model ? (
          <div className="inspector-note">
            <span className="mono">{model.meta.apiVersion}</span>
            <span>{model.meta.checksum.slice(0, 8) || "sin checksum"}</span>
          </div>
        ) : null}
      </section>
    );
  }

  const rows = fileMetricRows(model, file, areaMetric, metricTitle);
  const name = splitFileName(file.name);
  const lastChainVersion = chain?.versions[chain.versions.length - 1];

  /** La barra de complejidad, relativa al símbolo más pesado del fichero. */
  const maxComplexity = symbols.reduce(
    (max, symbol) => Math.max(max, symbol.complexity ?? 0),
    0
  );
  const complexityShare = (value: number | undefined): number => {
    if (!maxComplexity || value === undefined) return 0;
    return Math.round((value / maxComplexity) * 100);
  };

  const relatedFiles = (direction: "out" | "in"): RenderFile[] => {
    if (!model) return [];
    const found = new Map<string, RenderFile>();
    for (const edge of model.edges) {
      const owner = direction === "out" ? edge.from : edge.to;
      if (owner !== file.index) continue;
      const other = direction === "out" ? edge.to : edge.from;
      const target = model.files[other];
      if (target) found.set(target.path, target);
    }
    return [...found.values()].sort((left, right) =>
      left.path.localeCompare(right.path)
    );
  };
  const outgoing = relatedFiles("out");
  const incoming = relatedFiles("in");

  const openCode = async (target: CodeTarget): Promise<void> => {
    if (code?.target.id === target.id) {
      setCode(null);
      return;
    }
    const start = Math.max(1, target.line - 2);
    const end = target.line + Math.max(1, target.lines ?? 1) - 1 + 2;
    setCode({ target, snippet: null, loading: true, error: null });
    try {
      const snippet = await onLoadCode({ path: target.path, start, end });
      setCode((current) =>
        current?.target.id === target.id
          ? { ...current, snippet, loading: false }
          : current
      );
    } catch (cause) {
      setCode((current) =>
        current?.target.id === target.id
          ? {
              ...current,
              loading: false,
              error: cause instanceof Error ? cause.message : String(cause)
            }
          : current
      );
    }
  };

  return (
    <section className="inspector-file">
      <div className="inspector-path" title={file.path}>
        {file.path}
      </div>
      <h2>
        {name.base}
        {name.ext ? (
          <>
            <wbr />
            {name.ext}
          </>
        ) : null}
      </h2>

      {migrationNode ? (
        <div className="inspector-status">
          <span
            className="status-dot"
            style={{ background: STATUS_COLOR[migrationNode.status] }}
          />
          <span>{STATUS_LABEL[migrationNode.status]}</span>
          <span className="mono">{migrationNode.language}</span>
        </div>
      ) : null}

      <CollapsibleSection
        id="file-metrics"
        title="Métricas"
        className="section-metrics"
        count={rows.length}
        summary={
          rows[0]?.value === null || rows[0]?.value === undefined
            ? undefined
            : `Riesgo ${rows[0].value}/100`
        }
      >
        <div className="metrics-table">
          <div className="metrics-head" aria-hidden="true">
            <span>Métrica</span>
            <span>Escala</span>
            <span>Valor</span>
          </div>
          <div
            className="metrics-rows"
            role="group"
            aria-label="Métricas del fichero"
          >
            {rows.map((row) => {
              const active = row.risk
                ? colorMode === "risk"
                : colorMode === row.key;
              return (
                <button
                  key={row.key}
                  type="button"
                  className={`metrics-row metrics-${row.state}${
                    row.area ? " is-area" : ""
                  }${active ? " is-active" : ""}${
                    row.value === null ? " is-empty" : ""
                  }`}
                  aria-pressed={active}
                  title={`${row.description} ${row.hint}.${
                    row.area ? " Esta métrica decide el área del mapa." : ""
                  } Pulsa para pintar el mapa.`}
                  aria-label={`${row.title}: ${row.description} ${row.hint}.${
                    row.area ? " Esta métrica decide el área del mapa." : ""
                  } Pulsa para pintar el mapa.`}
                  onClick={() => onColorMode(row.risk ? "risk" : row.key)}
                >
                  <span className="metrics-label">
                    <span
                      className="metric-help"
                      title={row.description}
                      aria-hidden="true"
                    >
                      ?
                    </span>
                    {row.title}
                  </span>
                  <span className="metrics-bar" aria-hidden="true">
                    <i style={{ width: `${Math.round(row.share * 100)}%` }} />
                  </span>
                  <span className="metrics-value">
                    {row.value === null ? "—" : formatCompact(row.value)}
                    {row.risk && row.value !== null ? <em>/100</em> : null}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="muted tiny metrics-note">
            La barra llega al p95 del proyecto; el riesgo, a 100. Pulsa una fila
            para pintar el mapa.
          </p>
          <RiskBreakdown file={file} />
        </div>
      </CollapsibleSection>

      <RulesSection
        report={report}
        migration={migration}
        node={migrationNode}
        model={model}
        file={file}
        onSelectPath={onSelectPath}
      />

      {symbols.length > 0 ? (
        <CollapsibleSection
          id="file-symbols"
          title="Símbolos"
          className="section-symbols"
          count={symbols.length}
          summary={symbolSummary(symbols)}
        >
          <div className="symbol-list">
            <div className="card-head card-head-symbols" aria-hidden="true">
              <span>Símbolo</span>
              <span>Línea</span>
              <span>Compl.</span>
            </div>
            {groupSymbols(symbols).map((group) => (
              <CollapsibleSection
                key={group.kind}
                id={`file-symbols-${group.kind}`}
                title={group.title}
                count={group.symbols.length}
                className={`symbol-group symbol-group-${group.kind}`}
              >
                {group.symbols.map((symbol) => {
                  const target = symbolTarget(file, symbol);
                  const open = code?.target.id === target.id;
                  return (
                    <div key={`${symbol.name}-${symbol.line}`} className="symbol-entry">
                      <button
                        type="button"
                        className={`symbol-row${
                          chain?.name === symbol.name ? " is-selected" : ""
                        }${open ? " is-open" : ""}`}
                        aria-expanded={open}
                        onClick={() => {
                          onSelectSymbol(symbol.name);
                          void openCode(target);
                        }}
                        title={`${SYMBOL_LABEL[symbol.kind]} ${symbol.name} · línea ${
                          symbol.line
                        }${
                          symbol.complexity !== undefined
                            ? ` · complejidad ${symbol.complexity}`
                            : ""
                        }. Pulsa para ver su código y su vida.`}
                      >
                        <span className="symbol-name" title={symbol.name}>
                          {symbol.name}
                        </span>
                        <span className="mono symbol-line">{symbol.line}</span>
                        <span
                          className="symbol-score"
                          title={
                            symbol.complexity !== undefined
                              ? `Complejidad ciclomática ${symbol.complexity}`
                              : undefined
                          }
                        >
                          <span className="symbol-bar" aria-hidden="true">
                            <i
                              style={{
                                width: `${complexityShare(symbol.complexity)}%`
                              }}
                            />
                          </span>
                          <span className="mono symbol-complexity">
                            {symbol.complexity ?? "—"}
                          </span>
                        </span>
                        <Caret open={open} />
                      </button>
                      {open && code ? <InlineCode state={code} onOpenEditor={onOpenEditor} /> : null}
                    </div>
                  );
                })}
              </CollapsibleSection>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      {structure && surfaceCount(structure) > 0 ? (
        <CollapsibleSection
          id="file-surface"
          title="Superficie"
          className="section-surface"
          count={surfaceCount(structure)}
          summary={surfaceSummary(structure)}
        >
          <div className="surface-list">
            {structure.imports.length > 0 ? (
              <div className="surface-group">
                <div className="symbol-group-head">
                  <span>Importa</span>
                  <span className="symbol-group-line" aria-hidden="true" />
                  <span className="mono symbol-group-count">
                    {structure.imports.length}
                  </span>
                </div>
                {structure.imports.map((entry) => (
                  <div
                    key={`${entry.line}-${entry.source}`}
                    className="surface-row surface-row-imports"
                  >
                    <span className="surface-dir" aria-hidden="true">
                      →
                    </span>
                    <span className="mono surface-source" title={entry.source}>
                      {entry.source}
                    </span>
                    <span
                      className="surface-names"
                      title={
                        entry.names.length > 0
                          ? entry.names.join(", ")
                          : undefined
                      }
                    >
                      {entry.names.length > 0 ? (
                        entry.names.map((name) => (
                          <span key={name} className="surface-name">
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="muted tiny">efecto secundario</span>
                      )}
                    </span>
                    <span className="surface-tags">
                      {entry.typeOnly ? (
                        <span className="surface-badge">type</span>
                      ) : null}
                      {entry.kind !== "static" ? (
                        <span className="surface-badge">{entry.kind}</span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {structure.exports.length > 0 ? (
              <div className="surface-group">
                <div className="symbol-group-head">
                  <span>Exporta</span>
                  <span className="symbol-group-line" aria-hidden="true" />
                  <span className="mono symbol-group-count">
                    {structure.exports.length}
                  </span>
                </div>
                {structure.exports.map((entry) => (
                  <div
                    key={`${entry.line}-${entry.name}-${entry.source ?? ""}`}
                    className="surface-row surface-row-exports"
                  >
                    <span
                      className="surface-dir surface-dir-out"
                      aria-hidden="true"
                    >
                      ←
                    </span>
                    <span className="surface-name">{entry.name}</span>
                    <span className="surface-detail">
                      {entry.local ? (
                        <span className="muted tiny">desde {entry.local}</span>
                      ) : null}
                      {entry.source ? (
                        <span
                          className="mono surface-source"
                          title={entry.source}
                        >
                          {entry.source}
                        </span>
                      ) : null}
                    </span>
                    <span className="surface-tags">
                      {entry.typeOnly ? (
                        <span className="surface-badge">type</span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <p className="muted tiny card-note">
              No son símbolos: no tienen cadena.
            </p>
          </div>
        </CollapsibleSection>
      ) : null}

      {outgoing.length + incoming.length > 0 ? (
        <CollapsibleSection
          id="file-dependencies"
          title="Dependencias"
          className="section-deps"
          count={outgoing.length + incoming.length}
          summary={`${outgoing.length} salidas · ${incoming.length} entradas`}
        >
          <div className="dependency-list">
            {outgoing.length > 0 ? (
              <div className="dependency-group">
                <div className="symbol-group-head">
                  <span>Importa</span>
                  <span className="symbol-group-line" aria-hidden="true" />
                  <span className="mono symbol-group-count">
                    {outgoing.length}
                  </span>
                </div>
                {outgoing.map((entry) => (
                  <button
                    key={entry.path}
                    type="button"
                    className="dependency-row"
                    onClick={() => onSelectPath(entry.path)}
                    title={`Abrir ${entry.path}`}
                  >
                    <span className="mono dependency-path">{entry.path}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {incoming.length > 0 ? (
              <div className="dependency-group">
                <div className="symbol-group-head">
                  <span>Lo usan</span>
                  <span className="symbol-group-line" aria-hidden="true" />
                  <span className="mono symbol-group-count">
                    {incoming.length}
                  </span>
                </div>
                {incoming.map((entry) => (
                  <button
                    key={entry.path}
                    type="button"
                    className="dependency-row"
                    onClick={() => onSelectPath(entry.path)}
                    title={`Abrir ${entry.path}`}
                  >
                    <span className="mono dependency-path">{entry.path}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <p className="muted tiny card-note">
              Pulsa una ruta para abrir ese fichero.
            </p>
          </div>
        </CollapsibleSection>
      ) : null}



      {structure && structure.members.length > 0 ? (
        <CollapsibleSection
          id="file-members"
          title="Miembros"
          className="section-members"
          count={structure.members.length}
          summary={memberSummary(structure.members)}
        >
          <div className="member-list">
            <div className="card-head card-head-members" aria-hidden="true">
              <span />
              <span>Miembro</span>
              <span>Línea</span>
            </div>
            {groupMembers(structure.members).map((group) => (
              <div key={group.owner} className="member-group">
                <div className="symbol-group-head">
                  <span>{group.owner}</span>
                  <span className="symbol-group-line" aria-hidden="true" />
                  <span className="mono symbol-group-count">
                    {group.members.length}
                  </span>
                </div>
                {group.members.map((member) => {
                  const target = memberTarget(file, group.owner, member);
                  const open = code?.target.id === target.id;
                  return (
                    <div
                      key={`${member.name}-${member.line}`}
                      className="member-entry"
                    >
                      <button
                        type="button"
                        className={`member-row${open ? " is-open" : ""}`}
                        aria-expanded={open}
                        onClick={() => void openCode(target)}
                        title={`${member.name} · línea ${member.line}. Pulsa para ver su código.`}
                      >
                        <span className="symbol-kind member-kind">
                          {member.from === "parameter" ? "par" : "campo"}
                        </span>
                        <span className="symbol-name" title={member.name}>
                          {member.name}
                        </span>
                        <span className="mono member-line">{member.line}</span>
                        <Caret open={open} />
                      </button>
                      {open && code ? <InlineCode state={code} onOpenEditor={onOpenEditor} /> : null}
                    </div>
                  );
                })}
              </div>
            ))}
            <p className="muted tiny card-note">
              Campos y propiedades del constructor; viven dentro de su clase.
            </p>
          </div>
        </CollapsibleSection>
      ) : null}

      {chain ? (
        <CollapsibleSection
          id="file-chain"
          title={`La vida de ${chain.name}`}
          className="section-chain"
          count={chain.versions.length}
          summary={
            lastChainVersion
              ? `última ${lastChainVersion.date.slice(0, 10)}`
              : undefined
          }
        >
          <div className="chain-list">
            {chain.versions.map((version) => (
              <div key={version.entry} className="chain-row">
                <span className="mono chain-date">
                  {version.date.slice(0, 10)}
                </span>
                <span className="chain-events">
                  {version.events.map((event) => (
                    <span key={event.type} className={`chain-event chain-${event.type}`}>
                      {EVENT_LABEL[event.type]}
                    </span>
                  ))}
                </span>
                <span className="chain-path" title={version.path}>
                  {version.path}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}
    </section>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

