import { useEffect, useState } from "react";
import { formatCompact } from "@codarch/render/browser";
import type {
  CcMigrationLanguageStats,
  CcMigrationLens,
  CcMigrationNode,
  CcMigrationStatus,
  CcStructureNode,
  CcSymbol,
  HistoryEntry,
  SymbolChain,
  SymbolHeat
} from "@codarch/schema/browser";
import type { RenderFile, RenderModel } from "@codarch/render/browser";
import { CollapsibleSection } from "./CollapsibleSection";
import { fileMetricRows } from "./metrics";
import { groupSymbols, symbolSummary } from "./symbols";
import {
  groupMembers,
  memberSummary,
  surfaceCount,
  surfaceSummary
} from "./structure";
import {
  CHURN_METRIC,
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

export function HotList({
  model,
  selectedIndex,
  onSelect
}: {
  model: RenderModel | null;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const index = model
    ? model.metrics.findIndex((metric) => metric.key === CHURN_METRIC)
    : -1;
  if (!model || index < 0) return null;

  const rows = model.files
    .map((file) => ({ file, commits: file.values[index] ?? 0 }))
    .filter((row) => row.commits > 0)
    .sort((left, right) => right.commits - left.commits)
    .slice(0, 8);
  if (rows.length === 0) return null;

  const max = rows[0]?.commits ?? 1;

  return (
    <section className="panel-block">
      <div className="eyebrow">Más tocados</div>
      <div className="debt-list">
        {rows.map(({ file, commits }) => (
          <button
            key={file.nodeId}
            type="button"
            className={`debt-row${selectedIndex === file.index ? " is-selected" : ""}`}
            onClick={() => onSelect(file.index)}
            title={file.path}
          >
            <span className="debt-name">{file.path}</span>
            <span className="debt-track">
              <i
                style={{
                  width: `${Math.max(4, (commits / max) * 100)}%`,
                  background: "var(--rust)"
                }}
              />
            </span>
            <span className="mono">{commits}</span>
          </button>
        ))}
      </div>
    </section>
  );
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
      <div className="debt-list">
        {heat.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="debt-row"
            onClick={() => onSelectSymbol(entry.name, entry.path)}
            title={`${entry.path} · ${entry.changes} cambios · ${entry.moves} mudanzas`}
          >
            <span className="debt-name">{entry.name}</span>
            <span className="debt-track">
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

export function DebtList({
  model,
  migration,
  selectedIndex,
  onSelect
}: {
  model: RenderModel | null;
  migration: CcMigrationLens | null;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  if (!model || !migration) return null;

  const rows = model.files
    .map((file) => ({
      file,
      node: migration.nodes[file.nodeId]
    }))
    .filter((row): row is { file: RenderFile; node: CcMigrationNode } =>
      Boolean(row.node?.debt)
    )
    .sort((left, right) => (right.node.debt ?? 0) - (left.node.debt ?? 0))
    .slice(0, 8);
  const max = rows[0]?.node.debt ?? 1;

  if (rows.length === 0) return null;

  return (
    <section className="panel-block">
      <div className="eyebrow">Deuda de migración</div>
      <div className="debt-list">
        {rows.map(({ file, node }) => (
          <button
            key={file.nodeId}
            type="button"
            className={`debt-row${selectedIndex === file.index ? " is-selected" : ""}`}
            onClick={() => onSelect(file.index)}
            title={file.path}
          >
            <span className="debt-name">{file.path}</span>
            <span className="debt-track">
              <i
                style={{
                  width: `${Math.max(4, ((node.debt ?? 0) / max) * 100)}%`,
                  background: STATUS_COLOR[node.status]
                }}
              />
            </span>
            <span className="mono">{formatCompact(node.debt ?? 0)}</span>
          </button>
        ))}
      </div>
    </section>
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
  onSelectSymbol,
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
  onSelectSymbol: (name: string) => void;
  /** Pinta el mapa por una métrica (o por el riesgo). */
  onColorMode: (mode: string) => void;
}) {
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
  const lastChainVersion = chain?.versions[chain.versions.length - 1];

  return (
    <section className="inspector-file">
      <div className="inspector-path" title={file.path}>
        {file.path}
      </div>
      <h2>{file.name}</h2>

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
                    active ? " is-active" : ""
                  }${row.value === null ? " is-empty" : ""}`}
                  aria-pressed={active}
                  title={`${row.hint}. Pulsa para pintar el mapa.`}
                  onClick={() => onColorMode(row.risk ? "risk" : row.key)}
                >
                  <span className="metrics-label">
                    {row.title}
                    {row.area ? (
                      <em
                        className="metrics-area"
                        title="Esta métrica decide el área del mapa"
                      >
                        área
                      </em>
                    ) : null}
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
        </div>
      </CollapsibleSection>

      {symbols.length > 0 ? (
        <CollapsibleSection
          id="file-symbols"
          title="Símbolos"
          count={symbols.length}
          summary={symbolSummary(symbols)}
        >
          <div className="symbol-list">
            {groupSymbols(symbols).map((group) => (
              <div key={group.kind} className="symbol-group">
                <div className="symbol-group-head">
                  <span>{group.title}</span>
                  <span className="symbol-group-line" aria-hidden="true" />
                  <span className="mono symbol-group-count">
                    {group.symbols.length}
                  </span>
                </div>
                {group.symbols.map((symbol) => (
                  <button
                    key={`${symbol.name}-${symbol.line}`}
                    type="button"
                    className={`symbol-row${
                      chain?.name === symbol.name ? " is-selected" : ""
                    }`}
                    onClick={() => onSelectSymbol(symbol.name)}
                    title={`${SYMBOL_LABEL[symbol.kind]} ${symbol.name} · línea ${
                      symbol.line
                    }${
                      symbol.complexity !== undefined
                        ? ` · complejidad ${symbol.complexity}`
                        : ""
                    }. Ver la vida de este símbolo.`}
                  >
                    <span className={`symbol-kind symbol-${symbol.kind}`}>
                      {SYMBOL_LABEL[symbol.kind]}
                    </span>
                    <span className="symbol-name" title={symbol.name}>
                      {symbol.name}
                    </span>
                    {symbol.complexity !== undefined ? (
                      <span
                        className="mono symbol-complexity"
                        title="Complejidad ciclomática"
                      >
                        {symbol.complexity}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ))}
            <p className="muted tiny symbol-note">
              Agrupados por tipo y ordenados por complejidad. Pulsa uno para
              seguir su vida.
            </p>
          </div>
        </CollapsibleSection>
      ) : null}

      {structure && surfaceCount(structure) > 0 ? (
        <CollapsibleSection
          id="file-surface"
          title="Superficie"
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
                    className="surface-row"
                  >
                    <span className="mono surface-source" title={entry.source}>
                      {entry.source}
                    </span>
                    <span className="surface-names">
                      {entry.names.length > 0 ? (
                        entry.names.map((name) => (
                          <span key={name} className="surface-name">
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="muted tiny">efecto secundario</span>
                      )}
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
                    className="surface-row"
                  >
                    <span className="surface-name">{entry.name}</span>
                    {entry.local ? (
                      <span className="muted tiny">desde {entry.local}</span>
                    ) : null}
                    {entry.source ? (
                      <span className="mono surface-source">← {entry.source}</span>
                    ) : null}
                    {entry.typeOnly ? (
                      <span className="surface-badge">type</span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            <p className="muted tiny symbol-note">
              Lo que el fichero importa y exporta. No son símbolos: no tienen
              cadena.
            </p>
          </div>
        </CollapsibleSection>
      ) : null}

      {structure && structure.members.length > 0 ? (
        <CollapsibleSection
          id="file-members"
          title="Miembros"
          count={structure.members.length}
          summary={memberSummary(structure.members)}
        >
          <div className="member-list">
            {groupMembers(structure.members).map((group) => (
              <div key={group.owner} className="member-group">
                <div className="symbol-group-head">
                  <span>{group.owner}</span>
                  <span className="symbol-group-line" aria-hidden="true" />
                  <span className="mono symbol-group-count">
                    {group.members.length}
                  </span>
                </div>
                {group.members.map((member) => (
                  <div
                    key={`${member.name}-${member.line}`}
                    className="member-row"
                    title={`${member.name} · línea ${member.line}`}
                  >
                    <span className="symbol-kind member-kind">
                      {member.from === "parameter" ? "par" : "campo"}
                    </span>
                    <span className="symbol-name" title={member.name}>
                      {member.name}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            <p className="muted tiny symbol-note">
              Campos y propiedades del constructor. No son símbolos: viven
              dentro de su clase.
            </p>
          </div>
        </CollapsibleSection>
      ) : null}

      {chain ? (
        <CollapsibleSection
          id="file-chain"
          title={`La vida de ${chain.name}`}
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

