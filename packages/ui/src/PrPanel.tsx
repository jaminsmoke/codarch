import type { DiffReport } from "@codarch/metrics/browser";
import { formatCompact } from "@codarch/render/browser";

interface PrPanelProps {
  report: DiffReport | null;
  source: string | null;
  error: string | null;
  onLoad: () => void;
  onSelectPath: (path: string) => void;
}

export default function PrPanel({
  report,
  source,
  error,
  onLoad,
  onSelectPath
}: PrPanelProps) {
  if (!report) {
    return (
      <section className="pr-panel">
        <div className="eyebrow">Pull request</div>
        <h2>Sin reporte</h2>
        <p className="muted small">
          Carga el <code>report.json</code> que genera <code>codarch diff</code> o la GitHub
          Action para ver los cambios del snapshot.
        </p>
        <button className="button dark" type="button" onClick={onLoad}>
          Abrir reporte
        </button>
        {error ? <p className="pr-error">{error}</p> : null}
      </section>
    );
  }

  const summary = report.summary;
  const changed = report.files.changed.slice(0, 6);
  const added = report.files.added.slice(0, 5);
  const cycles = report.cycles.introduced.slice(0, 4);
  const migration = report.migration;
  const increased = migration?.files.increased.slice(0, 6) ?? [];
  const decreased = migration?.files.decreased.slice(0, 6) ?? [];
  const symbols = report.symbols;
  const symbolFiles = symbols?.files.slice(0, 6) ?? [];

  return (
    <section className="pr-panel">
      <div className="eyebrow">Pull request · {source ?? "report.json"}</div>
      <h2>Cambios de arquitectura</h2>
      <div className="pr-checksums mono">
        {report.base.checksum.slice(0, 8) || "base"} →{" "}
        {report.head.checksum.slice(0, 8) || "head"}
      </div>

      <div className="pr-grid">
        <PrStat label="Ficheros" value={`+${summary.addedFiles} −${summary.removedFiles} ~${summary.changedFiles}`} />
        <PrStat label="Aristas" value={`+${summary.addedEdges} −${summary.removedEdges}`} />
        <PrStat label="Ciclos" value={`+${summary.introducedCycles} −${summary.fixedCycles}`} accent={summary.introducedCycles > 0 ? "bad" : undefined} />
        <PrStat label="Hotspots" value={formatCompact(summary.hotspots)} />
        {migration ? (
          <PrStat
            label="Deuda migración"
            value={formatCompact(migration.debt.head)}
            accent={migration.debt.delta > 0 ? "bad" : "good"}
          />
        ) : null}
        {symbols ? (
          <PrStat
            label="Símbolos"
            value={`+${symbols.summary.added} −${symbols.summary.removed} ~${symbols.summary.changed}`}
          />
        ) : null}
      </div>

      {migration ? (
        <div className="pr-section">
          <div className="eyebrow">Migración</div>
          <div className="pr-rule-summary">
            <span>
              deuda <b>{migration.debt.base}</b> → <b>{migration.debt.head}</b>
            </span>
            <span>
              cruces FFI <b>{migration.crossings.head}</b>
            </span>
            <span>
              nativos <b>{migration.status.head.native ?? 0}</b>
            </span>
          </div>
          {increased.length === 0 && decreased.length === 0 ? (
            <p className="muted small">La deuda de migración no ha cambiado.</p>
          ) : (
            <div className="violation-list">
              {increased.map((file) => (
                <MigrationRow
                  key={file.id}
                  path={file.path}
                  before={file.base}
                  after={file.head}
                  onSelectPath={onSelectPath}
                />
              ))}
              {decreased.map((file) => (
                <MigrationRow
                  key={file.id}
                  path={file.path}
                  before={file.base}
                  after={file.head}
                  onSelectPath={onSelectPath}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {symbols && symbolFiles.length > 0 ? (
        <div className="pr-section">
          <div className="eyebrow">Símbolos</div>
          <div className="violation-list">
            {symbolFiles.map((file) => (
              <div key={file.id} className="symbol-file">
                <button
                  type="button"
                  className="symbol-file-path"
                  onClick={() => onSelectPath(file.path)}
                  title="Ver el fichero en el mapa"
                >
                  {file.path}
                </button>
                {file.symbols.slice(0, 4).map((symbol) => (
                  <div key={`${symbol.name}-${symbol.status}`} className="symbol-change">
                    <span className={`symbol-kind symbol-${symbol.kind}`}>
                      {symbol.kind === "function" ? "fn" : symbol.kind.slice(0, 3)}
                    </span>
                    <span className="symbol-name">{symbol.name}</span>
                    <span className="mono">
                      {symbol.status === "added"
                        ? "nuevo"
                        : symbol.status === "removed"
                          ? "eliminado"
                          : symbol.complexityDelta === null
                            ? "cambió"
                            : `${symbol.complexityDelta > 0 ? "+" : ""}${symbol.complexityDelta}`}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {cycles.length > 0 ? (
        <div className="pr-section">
          <div className="eyebrow">Ciclos nuevos</div>
          <div className="pr-rows">
            {cycles.map((cycle, index) => (
              <div key={index} className="pr-cycle">
                <span className="mono">×{cycle.size}</span>
                <span className="pr-path" title={cycle.nodes.map((node) => node.path).join(" → ")}>
                  {cycle.nodes.map((node) => node.path).join(" → ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="pr-section">
        <div className="eyebrow">Ficheros modificados</div>
        {changed.length === 0 ? (
          <p className="muted small">Sin ficheros modificados.</p>
        ) : (
          <div className="pr-rows">
            {changed.map((file) => (
              <button
                key={file.id}
                type="button"
                className="pr-row"
                title={file.path}
                onClick={() => onSelectPath(file.path)}
              >
                <span className="pr-path">{file.path}</span>
                <span className="mono pr-delta">
                  {file.changes
                    .slice(0, 2)
                    .map((change) =>
                      `${change.metric} ${change.delta === null ? "±" : change.delta > 0 ? `+${formatCompact(change.delta)}` : formatCompact(change.delta)}`
                    )
                    .join(" · ")}
                </span>
              </button>
            ))}
          </div>
        )}
        {report.files.changed.length > changed.length ? (
          <p className="muted tiny">+{report.files.changed.length - changed.length} más</p>
        ) : null}
      </div>

      {added.length > 0 ? (
        <div className="pr-section">
          <div className="eyebrow">Ficheros nuevos</div>
          <div className="pr-rows">
            {added.map((file) => (
              <button
                key={file.id}
                type="button"
                className="pr-row"
                title={file.path}
                onClick={() => onSelectPath(file.path)}
              >
                <span className="pr-path">{file.path}</span>
                <span className="mono pr-delta">
                  +{formatCompact(file.metrics.rloc ?? file.metrics.loc ?? 0)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PrStat({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent?: "bad" | "good";
}) {
  return (
    <div className={`pr-stat${accent ? ` pr-stat-${accent}` : ""}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function MigrationRow({
  path,
  before,
  after,
  onSelectPath
}: {
  path: string;
  before: number | null;
  after: number | null;
  onSelectPath: (path: string) => void;
}) {
  const delta = (after ?? 0) - (before ?? 0);
  return (
    <button
      className="pr-row"
      type="button"
      onClick={() => onSelectPath(path)}
    >
      <span className="pr-path">{path}</span>
      <span className={`mono pr-delta${delta > 0 ? " is-worse" : " is-better"}`}>
        {before ?? 0} → {after ?? 0} ({delta > 0 ? `+${delta}` : delta})
      </span>
    </button>
  );
}
