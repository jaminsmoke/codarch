import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode
} from "react";
import {
  defaultMetric,
  getStats,
  parseCcJson,
  type CcJson,
  type CcMigrationLanguageStats,
  type CcMigrationLens,
  type CcMigrationNode,
  type CcMigrationStatus
} from "@codarch/schema/browser";
import type { DiffReport } from "@codarch/metrics/browser";
import {
  buildRenderModel,
  formatCompact,
  inkFor,
  layoutMap,
  metricColor,
  riskColor,
  sectionColor,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  type PlacedNode,
  type RenderFile,
  type RenderModel,
  type TreeNode
} from "@codarch/render/browser";
import PrPanel from "./PrPanel";
import {
  readRepositoryFromFiles,
  readRepositoryFromPicker
} from "./repository";

const STATUS_LABEL: Record<CcMigrationStatus, string> = {
  js: "JS / TS",
  rust: "Rust",
  bridge: "Puente",
  native: "Nativo"
};

const STATUS_COLOR: Record<CcMigrationStatus, string> = {
  js: "#2f6fed",
  rust: "#d95d39",
  bridge: "#7b61ff",
  native: "#3f8f7a"
};

const LANGUAGE_COLOR: Record<string, string> = {
  ts: "#2f6fed",
  js: "#d9a21b",
  rust: "#d95d39",
  wasm: "#7b61ff",
  node: "#3f8f7a"
};

const PREFERRED_METRICS = [
  "rloc",
  "loc",
  "migrationDebt",
  "ffiCrossings",
  "maxComplexity",
  "maxFunctionLength",
  "functions",
  "fanIn",
  "fanOut",
  "number_of_commits",
  "number_of_authors"
];

interface ViewState {
  model: RenderModel | null;
  error: string | null;
}

export default function App() {
  const [cc, setCc] = useState<CcJson | null>(null);
  const [source, setSource] = useState("demo.cc.json");
  const [areaMetric, setAreaMetric] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState("risk");
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [report, setReport] = useState<DiffReport | null>(null);
  const [reportSource, setReportSource] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [tab, setTab] = useState<"file" | "pr">("file");
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const [serverMode, setServerMode] = useState<"demo" | "local" | "served" | "live">(
    "demo"
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);
  const repositoryInputRef = useRef<HTMLInputElement>(null);
  const openMenuRef = useRef<HTMLDetailsElement>(null);
  const manualLoadRef = useRef(false);

  const stats = useMemo(() => (cc ? getStats(cc) : null), [cc]);
  const migration = useMemo(() => readMigration(cc), [cc]);

  const loadSnapshot = useCallback(
    (raw: unknown, label: string, preserveView = false) => {
      try {
        const parsed = parseCcJson(raw);
        const nextStats = getStats(parsed);
        const coverage = new Set(nextStats.metricCoverage.map((entry) => entry.name));
        const nextArea = coverage.has("rloc")
          ? "rloc"
          : defaultMetric(nextStats) ?? nextStats.metricCoverage[0]?.name ?? null;

        setCc(parsed);
        setSource(label);
        setAreaMetric((current) =>
          preserveView && current && coverage.has(current) ? current : nextArea
        );
        setColorMode((current) => {
          if (preserveView) {
            if (current === "risk" || current === "structure" || current === "status") {
              return current;
            }
            return coverage.has(current) ? current : "risk";
          }
          return parsed.lenses?.migration && coverage.has("migrationDebt")
            ? "migrationDebt"
            : "risk";
        });
        if (!preserveView) {
          setQuery("");
          setSelectedIndex(null);
          setFocusPath(null);
        }
        setError(null);
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadReport = useCallback((raw: unknown, label: string, focus = true) => {
    const next = readReport(raw);
    if (!next) {
      setReportError(`El fichero ${label} no parece un report.json de CodArch.`);
      return;
    }
    setReport(next);
    setReportSource(label);
    setReportError(null);
    if (focus) setTab("pr");
  }, []);

  useEffect(() => {
    let cancelled = false;

    const boot = async (): Promise<void> => {
      const meta = await fetchJson("data/meta.json");
      const servedSnapshot = await fetchJson("data/snapshot.cc.json");

      if (manualLoadRef.current) return;

      if (servedSnapshot) {
        if (cancelled) return;
        loadSnapshot(servedSnapshot, "servidor local");
        const watch =
          typeof meta === "object" &&
          meta !== null &&
          (meta as { watch?: unknown }).watch === true;
        setServerMode(watch ? "live" : "served");
        const servedReport = await fetchJson("data/report.json");
        if (servedReport && !cancelled) loadReport(servedReport, "servidor local");
        return;
      }

      const demoSnapshot = await fetchJson("demo.cc.json");
      if (demoSnapshot && !cancelled && !manualLoadRef.current) {
        loadSnapshot(demoSnapshot, "demo.cc.json");
      }
      const demoReport = await fetchJson("demo.report.json");
      if (demoReport && !cancelled && !manualLoadRef.current) {
        loadReport(demoReport, "demo.report.json");
      }
      if (!demoSnapshot && !cancelled) {
        setError("No se pudo cargar la demo. Abre un cc.json para empezar.");
        setLoading(false);
      }
    };

    boot().catch((cause: Error) => {
      if (!cancelled) {
        setError(cause.message);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadReport, loadSnapshot]);

  useEffect(() => {
    if (serverMode !== "live" || typeof EventSource === "undefined") return;

    const events = new EventSource("/events");
    events.addEventListener("update", async () => {
      const snapshot = await fetchJson("data/snapshot.cc.json");
      if (snapshot) loadSnapshot(snapshot, "servidor local", true);
      const report = await fetchJson("data/report.json");
      if (report) loadReport(report, "servidor local", false);
    });
    return () => events.close();
  }, [serverMode, loadReport, loadSnapshot]);

  const view = useMemo<ViewState>(() => {
    if (!cc || !areaMetric) return { model: null, error: null };
    try {
      return {
        model: buildRenderModel(cc, {
          areaMetric,
          color: colorMode === "status" ? "risk" : colorMode,
          title: cc.meta.projectName
        }),
        error: null
      };
    } catch (cause) {
      return { model: null, error: (cause as Error).message };
    }
  }, [cc, areaMetric, colorMode]);

  const mapRoots = useMemo(() => {
    if (!view.model) return [];
    if (!focusPath) return view.model.roots;
    const folder = findFolder(view.model.roots, focusPath);
    return folder ? [folder] : view.model.roots;
  }, [view.model, focusPath]);

  useEffect(() => {
    setSelectedIndex(view.model?.defaultSelection ?? null);
  }, [view.model]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setFocusPath(null);
      setSelectedIndex(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const metricOptions = useMemo(() => {
    if (!stats) return [];
    const coverage = new Set(stats.metricCoverage.map((entry) => entry.name));
    const preferred = PREFERRED_METRICS.filter((key) => coverage.has(key));
    const rest = [...coverage]
      .filter((key) => !preferred.includes(key))
      .sort((left, right) => left.localeCompare(right));
    return [...preferred, ...rest];
  }, [stats]);

  const descriptors = cc?.lenses?.metrics?.attributeDescriptors as
    | Record<string, { title?: string }>
    | undefined;

  const metricTitle = useCallback(
    (key: string): string => descriptors?.[key]?.title ?? key,
    [descriptors]
  );

  const selectedFile =
    view.model && selectedIndex !== null
      ? view.model.files[selectedIndex] ?? null
      : null;
  const selectedMigration = selectedFile
    ? migration?.nodes[selectedFile.nodeId] ?? null
    : null;

  const matches = useMemo(() => {
    if (!view.model || query.trim() === "") return view.model?.fileCount ?? 0;
    const needle = query.trim().toLowerCase();
    return view.model.files.filter((file) => file.path.toLowerCase().includes(needle))
      .length;
  }, [view.model, query]);

  const onFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      manualLoadRef.current = true;
      try {
        loadSnapshot(JSON.parse(await file.text()), file.name);
        setServerMode("local");
        setReport(null);
        setReportSource(null);
        setReportError(null);
        setTab("file");
      } catch (cause) {
        setError(`JSON inválido en ${file.name}: ${(cause as Error).message}`);
      }
    },
    [loadSnapshot]
  );

  const onDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      manualLoadRef.current = true;
      try {
        loadSnapshot(JSON.parse(await file.text()), file.name);
        setServerMode("local");
        setReport(null);
        setReportSource(null);
        setReportError(null);
        setTab("file");
      } catch (cause) {
        setError(`JSON inválido en ${file.name}: ${(cause as Error).message}`);
      }
    },
    [loadSnapshot]
  );

  const onReportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      try {
        loadReport(JSON.parse(await file.text()), file.name);
      } catch (cause) {
        setReportError(`JSON inválido en ${file.name}: ${(cause as Error).message}`);
      }
    },
    [loadReport]
  );

  const closeOpenMenu = useCallback(() => {
    openMenuRef.current?.removeAttribute("open");
  }, []);

  const resetReport = useCallback(() => {
    setReport(null);
    setReportSource(null);
    setReportError(null);
    setTab("file");
  }, []);

  const openRepository = useCallback(async () => {
    closeOpenMenu();
    manualLoadRef.current = true;
    setError(null);
    if (!("showDirectoryPicker" in window)) {
      repositoryInputRef.current?.click();
      return;
    }
    setLoading(true);
    try {
      const artifacts = await readRepositoryFromPicker();
      loadSnapshot(artifacts.snapshot, artifacts.label);
      setServerMode("local");
      if (artifacts.report !== null) {
        loadReport(artifacts.report, artifacts.reportLabel ?? "report.json");
      } else {
        resetReport();
      }
    } catch (cause) {
      if ((cause as DOMException).name !== "AbortError") {
        setError((cause as Error).message);
      }
      setLoading(false);
    }
  }, [closeOpenMenu, loadReport, loadSnapshot, resetReport]);

  const onRepositoryFiles = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      closeOpenMenu();
      if (files.length === 0) return;
      manualLoadRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const artifacts = await readRepositoryFromFiles(files);
        loadSnapshot(artifacts.snapshot, artifacts.label);
        setServerMode("local");
        if (artifacts.report !== null) {
          loadReport(artifacts.report, artifacts.reportLabel ?? "report.json");
        } else {
          resetReport();
        }
      } catch (cause) {
        setError((cause as Error).message);
        setLoading(false);
      }
    },
    [closeOpenMenu, loadReport, loadSnapshot, resetReport]
  );

  const selectPath = useCallback(
    (path: string) => {
      const index =
        view.model?.files.findIndex((candidate) => candidate.path === path) ?? -1;
      if (index >= 0) {
        setSelectedIndex(index);
        setTab("file");
      }
    },
    [view.model]
  );

  const reloadDemo = useCallback(async () => {
    manualLoadRef.current = true;
    setLoading(true);
    try {
      const [snapshotResponse, reportResponse] = await Promise.all([
        fetch("demo.cc.json"),
        fetch("demo.report.json")
      ]);
      if (!snapshotResponse.ok) {
        throw new Error(`no se pudo cargar la demo (${snapshotResponse.status})`);
      }
      loadSnapshot(await snapshotResponse.json(), "demo.cc.json");
      setServerMode("demo");
      if (reportResponse.ok) {
        loadReport(await reportResponse.json(), "demo.report.json");
      } else {
        resetReport();
      }
    } catch (cause) {
      setError((cause as Error).message);
      setLoading(false);
    }
  }, [loadReport, loadSnapshot, resetReport]);

  return (
    <div
      className={`app${dragging ? " is-dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">CODARCH</span>
          <span className="brand-sub">atlas de arquitectura</span>
        </div>
        <div className="snapshot-meta">
          <span className="project">{cc?.meta.projectName ?? "sin proyecto"}</span>
          <span className="mono">
            {source}
            {view.model?.meta.checksum ? ` · ${view.model.meta.checksum.slice(0, 8)}` : ""}
            {view.model?.meta.commit ? ` · ${view.model.meta.commit.slice(0, 8)}` : ""}
          </span>
          <span
            className={`server-mode server-mode-${serverMode}`}
            title={
              serverMode === "demo"
                ? "Datos de ejemplo. Para tu repo: codarch serve <ruta>"
                : serverMode === "local"
                  ? "Archivo o carpeta cargada manualmente"
                  : serverMode === "live"
                    ? "Servidor local con watch activo"
                    : "Servidor local sin watch"
            }
          >
            <i />
            {serverMode === "live"
              ? "live"
              : serverMode === "served"
                ? "servido"
                : serverMode}
          </span>
        </div>
        <div className="topbar-actions">
          <button className="button ghost" type="button" onClick={reloadDemo}>
            Demo
          </button>
          <details className="open-menu" ref={openMenuRef}>
            <summary className="button">
              <span className="button-label-long">Abrir repositorio o archivo</span>
              <span className="button-label-short">Abrir</span>
            </summary>
            <div className="open-menu-panel">
              <button type="button" onClick={openRepository}>
                Carpeta con .codarch…
              </button>
              <button
                type="button"
                onClick={() => {
                  closeOpenMenu();
                  inputRef.current?.click();
                }}
              >
                Archivo cc.json…
              </button>
              <p>
                Carga artefactos ya generados. Para datos en vivo: ejecuta
                <code>codarch serve .</code> en la raíz del repo.
              </p>
            </div>
          </details>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".json,application/json"
            onChange={onFile}
          />
          <input
            ref={repositoryInputRef}
            className="sr-only"
            type="file"
            multiple
            onChange={onRepositoryFiles}
            {...({ webkitdirectory: "true", directory: "true" } as Record<string, string>)}
          />
        </div>
      </header>

      <div className="shell">
        <aside className="rail">
          <section className="panel-block">
            <div className="eyebrow">Vista</div>
            <label className="field">
              <span>Área</span>
              <select
                value={areaMetric ?? ""}
                onChange={(event) => setAreaMetric(event.target.value)}
              >
                {metricOptions.map((key) => (
                  <option key={key} value={key}>
                    {metricTitle(key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Color</span>
              <select value={colorMode} onChange={(event) => setColorMode(event.target.value)}>
                <option value="risk">Riesgo</option>
                <option value="structure">Estructura</option>
                {migration ? <option value="status">Estado de migración</option> : null}
                {metricOptions.map((key) => (
                  <option key={key} value={key}>
                    {metricTitle(key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field search-field">
              <span>Buscar</span>
              <input
                type="search"
                placeholder="ruta o fichero…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            {query ? (
              <div className="muted tiny">
                {matches} de {view.model?.fileCount ?? 0} ficheros
              </div>
            ) : null}
          </section>

          <LanguageSample model={view.model} migration={migration} />

          <Legend colorMode={colorMode} migration={migration} model={view.model} />

          <DebtList
            model={view.model}
            migration={migration}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
          />
        </aside>

        <main className="stage">
          <div className="stage-head">
            <div>
              <div className="eyebrow">Mapa</div>
              <h1>{view.model?.meta.title ?? "Sin snapshot"}</h1>
              {focusPath ? (
                <div className="breadcrumb">
                  <button type="button" onClick={() => setFocusPath(null)}>
                    Todo
                  </button>
                  <span>/</span>
                  <span>{focusPath}</span>
                </div>
              ) : null}
            </div>
            <div className="stage-kpis">
              <Kpi label="ficheros" value={view.model?.fileCount ?? 0} />
              <Kpi label="carpetas" value={view.model?.folderCount ?? 0} />
              <Kpi label={view.model?.areaTitle ?? "área"} value={view.model?.totalArea ?? 0} />
              <Kpi
                label="deuda"
                value={migration?.summary.migrationDebt ?? 0}
                accent={migration ? "debt" : undefined}
              />
            </div>
          </div>

          {serverMode === "demo" ? (
            <div className="demo-banner">
              <strong>Demo.</strong>
              <span>
                Para monitorizar tu repositorio, ejecuta <code>codarch serve .</code> en su
                raíz y abre la URL que imprime.
              </span>
            </div>
          ) : null}

          <div className="map-frame">
            {loading ? (
              <div className="empty">Cargando snapshot…</div>
            ) : view.error || error ? (
              <div className="empty error">
                <strong>No se pudo dibujar el mapa.</strong>
                <span>{view.error ?? error}</span>
              </div>
            ) : view.model ? (
              <MapCanvas
                model={view.model}
                roots={mapRoots}
                colorMode={colorMode}
                migration={migration}
                query={query.trim().toLowerCase()}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                onFocusFolder={setFocusPath}
              />
            ) : (
              <div className="empty">Abre un cc.json para empezar.</div>
            )}
            {dragging ? <div className="drop-hint">Suelta un cc.json</div> : null}
          </div>

          <div className="stage-foot">
            <span>
              {view.model
                ? `${view.model.fileCount} ficheros · ${view.model.folderCount} carpetas · ${view.model.meta.apiVersion}`
                : "—"}
            </span>
            <span className="mono">
              {view.model?.warnings[0] ?? "clic en una celda para inspeccionar"}
            </span>
          </div>
        </main>

        <aside className="inspector">
          <div className="tabs" role="tablist" aria-label="Panel derecho">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "file"}
              className={`tab${tab === "file" ? " is-active" : ""}`}
              onClick={() => setTab("file")}
            >
              Fichero
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "pr"}
              className={`tab${tab === "pr" ? " is-active" : ""}`}
              onClick={() => setTab("pr")}
            >
              PR {report ? <i className="tab-dot" title="Reporte cargado" /> : null}
            </button>
          </div>
          {tab === "file" ? (
            <Inspector
              model={view.model}
              file={selectedFile}
              migrationNode={selectedMigration}
              areaMetric={areaMetric}
              metricTitle={metricTitle}
            />
          ) : (
            <PrPanel
              report={report}
              source={reportSource}
              error={reportError}
              onLoad={() => reportInputRef.current?.click()}
              onSelectPath={selectPath}
            />
          )}
          <input
            ref={reportInputRef}
            className="sr-only"
            type="file"
            accept=".json,application/json"
            onChange={onReportFile}
          />
        </aside>
      </div>
    </div>
  );
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function findFolder(nodes: readonly TreeNode[], path: string): TreeNode | null {
  for (const node of nodes) {
    if (node.kind === "folder" && node.path === path) return node;
    if (node.children) {
      const found = findFolder(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

function readReport(value: unknown): DiffReport | null {
  if (typeof value !== "object" || value === null) return null;
  const report = value as Partial<DiffReport>;
  if (
    report.schemaVersion !== "1.0" ||
    typeof report.summary !== "object" ||
    report.summary === null ||
    typeof report.base !== "object" ||
    report.base === null ||
    typeof report.head !== "object" ||
    report.head === null ||
    typeof report.files !== "object" ||
    report.files === null ||
    typeof report.rules !== "object" ||
    report.rules === null
  ) {
    return null;
  }
  return report as DiffReport;
}

function readMigration(cc: CcJson | null): CcMigrationLens | null {
  const value = cc?.lenses?.migration;
  if (!value || typeof value !== "object") return null;
  const lens = value as Partial<CcMigrationLens>;
  if (!lens.nodes || !lens.summary) return null;
  return lens as CcMigrationLens;
}

function Kpi({
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

function LanguageSample({
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

function Legend({
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

function DebtList({
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

function MapCanvas({
  model,
  roots,
  colorMode,
  migration,
  query,
  selectedIndex,
  onSelect,
  onFocusFolder
}: {
  model: RenderModel;
  roots: TreeNode[];
  colorMode: string;
  migration: CcMigrationLens | null;
  query: string;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onFocusFolder: (path: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: VIEW_WIDTH, height: VIEW_HEIGHT });
  const placed = useMemo(
    () => layoutMap(roots, size.width, size.height),
    [roots, size.width, size.height]
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const metricIndex = useMemo(
    () => new Map(model.metrics.map((metric, index) => [metric.key, index])),
    [model.metrics]
  );

  const fillFor = (file: RenderFile): string => {
    if (colorMode === "status") {
      const status = migration?.nodes[file.nodeId]?.status ?? "js";
      return STATUS_COLOR[status];
    }
    if (colorMode === "structure") {
      const section = model.sections[file.section];
      return section ? sectionColor(section) : "#d5d2ca";
    }
    if (colorMode === "risk") return riskColor(file.risk);
    const index = metricIndex.get(colorMode);
    if (index === undefined) return riskColor(file.risk);
    const metric = model.metrics[index];
    if (!metric) return riskColor(file.risk);
    return metricColor(file.values[index] ?? null, metric);
  };

  const renderNode = (placedNode: PlacedNode): ReactNode => {
    const { node, rect } = placedNode;

    if (node.kind === "file") {
      const file = node.fileIndex === undefined ? null : model.files[node.fileIndex];
      if (!file) return null;
      const fill = fillFor(file);
      const selected = selectedIndex === file.index;
      const matched = query === "" || file.path.toLowerCase().includes(query);
      const label =
        rect.w > 38 && rect.h > 14
          ? truncate(file.name, Math.max(4, Math.floor((rect.w - 10) / 6.1)))
          : "";
      const migrationNode = migration?.nodes[file.nodeId];

      return (
        <g
          key={node.key}
          className="cell"
          opacity={matched ? 1 : 0.13}
          role="button"
          tabIndex={0}
          aria-label={file.path}
          onClick={() => onSelect(file.index)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(file.index);
            }
          }}
        >
          <rect
            x={rect.x}
            y={rect.y}
            width={Math.max(1, rect.w)}
            height={Math.max(1, rect.h)}
            fill={fill}
            stroke={selected ? "#121a20" : "rgba(18,26,32,.26)"}
            strokeWidth={selected ? 2 : 0.55}
          />
          {label ? (
            <text
              x={rect.x + 5}
              y={rect.y + 13}
              fill={inkFor(fill)}
              fontSize={10.5}
              fontFamily="IBM Plex Sans, system-ui, sans-serif"
              pointerEvents="none"
            >
              {label}
            </text>
          ) : null}
          <title>
            {`${file.path}\n${model.areaTitle}: ${formatCompact(file.actualArea)}` +
              (migrationNode
                ? `\n${STATUS_LABEL[migrationNode.status]} · deuda ${migrationNode.debt ?? 0} · FFI ${migrationNode.crossings}`
                : "")}
          </title>
        </g>
      );
    }

    return (
      <g key={node.key}>
        <rect
          x={rect.x}
          y={rect.y}
          width={Math.max(1, rect.w)}
          height={Math.max(1, rect.h)}
          fill="rgba(18,26,32,.022)"
          stroke="rgba(18,26,32,.25)"
          strokeWidth={0.7}
          pointerEvents="none"
        />
        {placedNode.headerHeight > 0 && rect.w > 34 ? (
          <>
            <text
              x={rect.x + 4}
              y={rect.y + 11.5}
              fill="rgba(18,26,32,.58)"
              fontSize={9}
              letterSpacing=".08em"
              fontFamily="IBM Plex Mono, ui-monospace, monospace"
              pointerEvents="none"
            >
              {truncate(node.name.toUpperCase(), Math.floor((rect.w - 8) / 5.6))}
            </text>
            <rect
              x={rect.x}
              y={rect.y}
              width={Math.max(1, rect.w)}
              height={placedNode.headerHeight}
              fill="transparent"
              className="folder-hit"
              role="button"
              tabIndex={0}
              aria-label={`Enfocar ${node.path}`}
              onClick={(event) => {
                event.stopPropagation();
                onFocusFolder(node.path);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onFocusFolder(node.path);
                }
              }}
            >
              <title>{`Enfocar ${node.path}`}</title>
            </rect>
          </>
        ) : null}
        {placedNode.children.map(renderNode)}
      </g>
    );
  };

  return (
    <div className="map-inner" ref={containerRef}>
      <svg
        className="map"
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="group"
        aria-label={`Mapa de arquitectura de ${model.meta.project}`}
      >
        <defs>
          <pattern id="map-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="rgba(18,26,32,.045)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={size.width} height={size.height} fill="url(#map-grid)" />
        {placed.map(renderNode)}
      </svg>
    </div>
  );
}

function Inspector({
  model,
  file,
  migrationNode,
  areaMetric,
  metricTitle
}: {
  model: RenderModel | null;
  file: RenderFile | null;
  migrationNode: CcMigrationNode | null;
  areaMetric: string | null;
  metricTitle: (key: string) => string;
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

  const areaMetricIndex = areaMetric
    ? model?.metrics.findIndex((metric) => metric.key === areaMetric) ?? -1
    : -1;
  const areaValue =
    areaMetricIndex >= 0 ? file.values[areaMetricIndex] ?? file.actualArea : file.actualArea;

  const rows = model
    ? model.metrics
        .map((metric, index) => ({
          key: metric.key,
          title: metricTitle(metric.key),
          value: file.values[index]
        }))
        .filter((row): row is { key: string; title: string; value: number } =>
          row.value !== null && row.value !== undefined
        )
        .slice(0, 10)
    : [];

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

      <div className="metric-grid">
        <Metric label={areaMetric ? metricTitle(areaMetric) : "Área"} value={formatCompact(areaValue)} />
        <Metric label="Riesgo" value={formatCompact(file.risk * 100)} />
        <Metric label="Complejidad" value={formatCompact(file.complexity)} />
        <Metric label="Churn" value={formatCompact(file.churn)} />
        {migrationNode ? (
          <>
            <Metric label="Deuda" value={formatCompact(migrationNode.debt ?? 0)} />
            <Metric label="Cruces FFI" value={formatCompact(migrationNode.crossings)} />
          </>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <div className="metric-table">
          <div className="eyebrow">Métricas</div>
          {rows.map((row) => (
            <div key={row.key}>
              <span>{row.title}</span>
              <span className="mono">{formatCompact(row.value)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function truncate(value: string, max: number): string {
  if (max <= 0) return "";
  if (value.length <= max) return value;
  if (max === 1) return "…";
  return `${value.slice(0, max - 1)}…`;
}
