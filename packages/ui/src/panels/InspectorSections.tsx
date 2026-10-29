import { formatCompact, type RenderFile, type RenderModel } from "@codarch/render/browser";
import type {
  CcMember,
  CcMigrationNode,
  CcStructureNode,
  CcSymbol,
  SymbolChain
} from "@codarch/schema/browser";
import type { EditorRequest } from "../platform";
import { Caret, CollapsibleSection } from "../CollapsibleSection";
import { splitFileName } from "../fileName";
import { RiskBreakdown } from "../FileSections";
import { fileMetricRows } from "../metrics";
import { groupSymbols, symbolSummary } from "../symbols";
import {
  groupMembers,
  memberSummary,
  surfaceCount,
  surfaceSummary
} from "../structure";
import { EVENT_LABEL, STATUS_COLOR, STATUS_LABEL, SYMBOL_LABEL } from "../labels";
import { complexityShare, type CodeState } from "../inspector";
import {
  InlineCode,
  memberTarget,
  symbolTarget,
  type CodeTarget
} from "./CodePeek";

/**
 * Los tramos de la ficha del fichero (ADR 0079).
 *
 * Cada sección es una pieza con sus props resueltas: qué filas tiene Métricas,
 * qué símbolos hay, qué ficheros tocan las Dependencias. El inspector se queda
 * con el orden y con lo que hay que cargar al pulsar.
 */

/** La ficha sin fichero: qué hay que hacer y de qué snapshot sale. */
export function EmptyInspector({ model }: { model: RenderModel | null }) {
  return (
    <section className="inspector-empty">
      <h2>Selecciona un fichero</h2>
      <p className="muted small">
        Un clic en un fichero del mapa abre su ficha; un doble clic lo abre en el
        escenario. Las carpetas tienen su propia hoja, en la entrada
        <strong> Carpeta</strong>: un clic en una la selecciona sin mover el zoom.
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

/** La cabecera: la ruta, el nombre partido y el estado de migración. */
export function FileHeader({
  file,
  migrationNode
}: {
  file: RenderFile;
  migrationNode: CcMigrationNode | null;
}) {
  const name = splitFileName(file.name);

  return (
    <>
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
    </>
  );
}

/**
 * Las métricas del fichero, con su barra y el riesgo desglosado.
 *
 * En el mapa del resto no hay riesgo que enseñar: un documento no tiene
 * complejidad ni churn, y el que saldría es su tamaño con otro nombre (ADR
 * 0093). Ahí solo queda la métrica.
 */
export function MetricsSection({
  model,
  file,
  areaMetric,
  colorMode,
  metricTitle,
  showRisk = true,
  onColorMode
}: {
  model: RenderModel | null;
  file: RenderFile;
  areaMetric: string | null;
  colorMode: string;
  metricTitle: (key: string) => string;
  /** `false` en el mapa del resto: no hay riesgo ni desglose. */
  showRisk?: boolean;
  onColorMode: (mode: string) => void;
}) {
  const rows = fileMetricRows(model, file, areaMetric, metricTitle).filter(
    (row) => showRisk || !row.risk
  );

  return (
    <CollapsibleSection
      id="file-metrics"
      title="Métricas"
      className="section-metrics"
      count={rows.length}
      summary={
        !showRisk || rows[0]?.value === null || rows[0]?.value === undefined
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
          {rows.map((row) => (
            <MetricRow
              key={row.key}
              row={row}
              colorMode={colorMode}
              onColorMode={onColorMode}
            />
          ))}
        </div>
        <p className="muted tiny metrics-note">
          {showRisk
            ? "La barra llega al p95 del proyecto; el riesgo, a 100. Pulsa una fila para pintar el mapa."
            : "La barra llega al p95 del proyecto. Pulsa una fila para pintar el mapa."}
        </p>
        {showRisk ? <RiskBreakdown file={file} /> : null}
      </div>
    </CollapsibleSection>
  );
}

/** Una fila de métrica: pulsa para pintar el mapa por ella. */
function MetricRow({
  row,
  colorMode,
  onColorMode
}: {
  row: ReturnType<typeof fileMetricRows>[number];
  colorMode: string;
  onColorMode: (mode: string) => void;
}) {
  const active = row.risk ? colorMode === "risk" : colorMode === row.key;
  const why = row.area ? " Esta métrica decide el área del mapa." : "";

  return (
    <button
      type="button"
      className={`metrics-row metrics-${row.state}${
        row.area ? " is-area" : ""
      }${active ? " is-active" : ""}${row.value === null ? " is-empty" : ""}`}
      aria-pressed={active}
      title={`${row.description} ${row.hint}.${why} Pulsa para pintar el mapa.`}
      aria-label={`${row.title}: ${row.description} ${row.hint}.${why} Pulsa para pintar el mapa.`}
      onClick={() => onColorMode(row.risk ? "risk" : row.key)}
    >
      <span className="metrics-label">
        <span className="metric-help" title={row.description} aria-hidden="true">
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
}

/** Los símbolos del fichero, agrupados por clase, con su código debajo. */
export function SymbolsSection({
  file,
  symbols,
  chain,
  code,
  maxComplexity,
  onSelectSymbol,
  onOpenCode,
  onOpenEditor
}: {
  file: RenderFile;
  symbols: CcSymbol[];
  chain: SymbolChain | null;
  code: CodeState | null;
  maxComplexity: number;
  onSelectSymbol: (name: string) => void;
  onOpenCode: (target: CodeTarget) => void;
  onOpenEditor: (request: EditorRequest) => Promise<boolean>;
}) {
  if (symbols.length === 0) return null;

  return (
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
            {group.symbols.map((symbol) => (
              <SymbolRow
                key={`${symbol.name}-${symbol.line}`}
                file={file}
                symbol={symbol}
                chain={chain}
                code={code}
                maxComplexity={maxComplexity}
                onSelectSymbol={onSelectSymbol}
                onOpenCode={onOpenCode}
                onOpenEditor={onOpenEditor}
              />
            ))}
          </CollapsibleSection>
        ))}
      </div>
    </CollapsibleSection>
  );
}

/** Una fila de símbolo: al pulsarla se abre su código y su vida. */
function SymbolRow({
  file,
  symbol,
  chain,
  code,
  maxComplexity,
  onSelectSymbol,
  onOpenCode,
  onOpenEditor
}: {
  file: RenderFile;
  symbol: CcSymbol;
  chain: SymbolChain | null;
  code: CodeState | null;
  maxComplexity: number;
  onSelectSymbol: (name: string) => void;
  onOpenCode: (target: CodeTarget) => void;
  onOpenEditor: (request: EditorRequest) => Promise<boolean>;
}) {
  const target = symbolTarget(file, symbol);
  const open = code?.target.id === target.id;
  const weight =
    symbol.complexity !== undefined ? ` · complejidad ${symbol.complexity}` : "";

  return (
    <div className="symbol-entry">
      <button
        type="button"
        className={`symbol-row${
          chain?.name === symbol.name ? " is-selected" : ""
        }${open ? " is-open" : ""}`}
        aria-expanded={open}
        onClick={() => {
          onSelectSymbol(symbol.name);
          onOpenCode(target);
        }}
        title={`${SYMBOL_LABEL[symbol.kind]} ${symbol.name} · línea ${symbol.line}${weight}. Pulsa para ver su código y su vida.`}
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
                width: `${complexityShare(symbol.complexity, maxComplexity)}%`
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
}

/** Imports y exports: lo que entra y sale sin ser símbolo. */
export function SurfaceSection({ structure }: { structure: CcStructureNode | null }) {
  if (!structure || surfaceCount(structure) === 0) return null;

  return (
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
                    entry.names.length > 0 ? entry.names.join(", ") : undefined
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
  );
}

/** Los ficheros que importa y los que lo usan. */
export function DependenciesSection({
  outgoing,
  incoming,
  onSelectPath
}: {
  outgoing: readonly RenderFile[];
  incoming: readonly RenderFile[];
  onSelectPath: (path: string) => void;
}) {
  if (outgoing.length + incoming.length === 0) return null;

  return (
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
              <DependencyRow
                key={entry.path}
                path={entry.path}
                onSelectPath={onSelectPath}
              />
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
              <DependencyRow
                key={entry.path}
                path={entry.path}
                onSelectPath={onSelectPath}
              />
            ))}
          </div>
        ) : null}

        <p className="muted tiny card-note">
          Pulsa una ruta para abrir ese fichero.
        </p>
      </div>
    </CollapsibleSection>
  );
}

function DependencyRow({
  path,
  onSelectPath
}: {
  path: string;
  onSelectPath: (path: string) => void;
}) {
  return (
    <button
      type="button"
      className="dependency-row"
      onClick={() => onSelectPath(path)}
      title={`Abrir ${path}`}
    >
      <span className="mono dependency-path">{path}</span>
    </button>
  );
}

/** Los miembros de clase, con su código debajo. */
export function MembersSection({
  file,
  structure,
  code,
  onOpenCode,
  onOpenEditor
}: {
  file: RenderFile;
  structure: CcStructureNode | null;
  code: CodeState | null;
  onOpenCode: (target: CodeTarget) => void;
  onOpenEditor: (request: EditorRequest) => Promise<boolean>;
}) {
  if (!structure || structure.members.length === 0) return null;

  return (
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
            {group.members.map((member) => (
              <MemberRow
                key={`${member.name}-${member.line}`}
                file={file}
                owner={group.owner}
                member={member}
                code={code}
                onOpenCode={onOpenCode}
                onOpenEditor={onOpenEditor}
              />
            ))}
          </div>
        ))}
        <p className="muted tiny card-note">
          Campos y propiedades del constructor; viven dentro de su clase.
        </p>
      </div>
    </CollapsibleSection>
  );
}

function MemberRow({
  file,
  owner,
  member,
  code,
  onOpenCode,
  onOpenEditor
}: {
  file: RenderFile;
  owner: string;
  member: CcMember;
  code: CodeState | null;
  onOpenCode: (target: CodeTarget) => void;
  onOpenEditor: (request: EditorRequest) => Promise<boolean>;
}) {
  const target = memberTarget(file, owner, member);
  const open = code?.target.id === target.id;

  return (
    <div className="member-entry">
      <button
        type="button"
        className={`member-row${open ? " is-open" : ""}`}
        aria-expanded={open}
        onClick={() => onOpenCode(target)}
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
}

/** La vida del símbolo elegido: sus fotos y lo que le pasó en cada una. */
export function ChainSection({ chain }: { chain: SymbolChain | null }) {
  if (!chain) return null;

  const last = chain.versions[chain.versions.length - 1];

  return (
    <CollapsibleSection
      id="file-chain"
      title={`La vida de ${chain.name}`}
      className="section-chain"
      count={chain.versions.length}
      summary={last ? `última ${last.date.slice(0, 10)}` : undefined}
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
  );
}
