import { useEffect, useState } from "react";
import { formatCompact, type RenderFile, type RenderModel } from "@codarch/render/browser";
import type {
  CcMigrationLens,
  CcMigrationNode,
  CcStructureNode,
  CcSymbol,
  SymbolChain
} from "@codarch/schema/browser";
import type { DiffReport } from "@codarch/metrics/browser";
import type { CodeRequest, CodeSnippet, EditorRequest } from "../platform";
import { Caret, CollapsibleSection } from "../CollapsibleSection";
import { splitFileName } from "../fileName";
import { RiskBreakdown, RulesSection } from "../FileSections";
import { fileMetricRows } from "../metrics";
import { groupSymbols, symbolSummary } from "../symbols";
import {
  groupMembers,
  memberSummary,
  surfaceCount,
  surfaceSummary
} from "../structure";
import {
  EVENT_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  SYMBOL_LABEL
} from "../labels";
import {
  InlineCode,
  memberTarget,
  symbolTarget,
  type CodeTarget
} from "./CodePeek";

/**
 * La ficha del fichero: métricas, reglas, símbolos, superficie, dependencias,
 * miembros y la vida del símbolo elegido.
 *
 * Cada apartado es una sección plegable con su cuenta en el encabezado, así
 * que la ficha se lee de arriba abajo sin abrir nada (ADR 0079). El código de
 * un símbolo se abre pegado a su fila, no en otra vista.
 */
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
