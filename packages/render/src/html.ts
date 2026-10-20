import { readFileSync } from "node:fs";
import {
  METRIC_GRADIENT,
  RISK_GRADIENT,
  riskColor
} from "./color";
import type { RenderModel } from "./model";
import {
  escapeAttr,
  escapeHtml,
  formatCompact,
  formatInt,
  renderSvg
} from "./svg";

const STYLES = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const CLIENT = readFileSync(new URL("./client.js", import.meta.url), "utf8").replace(
  /<\/script/gi,
  "<\\/script"
);

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function serialise(model: RenderModel): unknown {
  const directoryIndex = new Map<string, number>();
  const directories: string[] = [];
  const fileRows = model.files.map((file) => {
    const slash = file.path.lastIndexOf("/");
    const directory = slash >= 0 ? file.path.slice(0, slash) : "";
    let dirIndex = -1;
    if (directory) {
      const known = directoryIndex.get(directory);
      if (known === undefined) {
        dirIndex = directories.length;
        directoryIndex.set(directory, dirIndex);
        directories.push(directory);
      } else {
        dirIndex = known;
      }
    }
    const name = slash >= 0 ? file.path.slice(slash + 1) : file.path;
    return [
      dirIndex,
      name,
      file.section,
      round(file.area, 1),
      round(file.actualArea, 1),
      round(file.risk, 4),
      round(file.complexity, 1),
      round(file.churn, 1),
      ...file.values.map((value) => (value === null ? null : round(value, 2)))
    ];
  });

  return {
    v: 1,
    meta: {
      project: model.meta.project,
      commit: model.meta.commit,
      checksum: model.meta.checksum,
      api: model.meta.apiVersion,
      root: model.meta.rootName
    },
    area: {
      key: model.areaMetric,
      title: model.areaTitle,
      total: round(model.totalArea, 1)
    },
    lens: model.initialLens,
    metric: model.initialMetric,
    metrics: model.metrics.map((metric) => ({
      key: metric.key,
      title: metric.title,
      min: round(metric.min, 2),
      max: round(metric.max, 2),
      mode: metric.mode,
      dir: metric.direction,
      coverage: metric.coverage
    })),
    sections: model.sections.map((section) => ({
      key: section.key,
      color: section.color,
      files: section.files,
      area: round(section.area, 1)
    })),
    dirs: directories,
    files: fileRows,
    edges: model.edges.flatMap((edge) => [edge.from, edge.to]),
    cycles: model.cycles.flatMap((edge) => [edge.from, edge.to]),
    hot: model.hotspotCount,
    default: model.defaultSelection,
    fileCount: model.fileCount,
    folderCount: model.folderCount,
    totalArea: round(model.totalArea, 1)
  };
}

function renderLensButtons(model: RenderModel): string {
  const lenses: Array<{ id: string; label: string }> = [
    { id: "structure", label: "Estructura" },
    { id: "risk", label: "Riesgo" }
  ];
  if (model.metrics.length > 0) lenses.push({ id: "metric", label: "Métrica" });

  return lenses
    .map(
      (lens) =>
        `<button type="button" class="lens" role="tab" data-lens="${lens.id}" aria-selected="${String(
          model.initialLens === lens.id
        )}">${lens.label}</button>`
    )
    .join("");
}

function renderFindings(model: RenderModel): string {
  const chips: string[] = [];

  if (model.hotspotCount > 0) {
    chips.push(
      `<button type="button" class="finding" data-focus="hotspot"><i class="dot info"></i><b>${formatInt(
        model.hotspotCount
      )}</b> hotspots</button>`
    );
  }
  if (model.cycles.length > 0) {
    chips.push(
      `<button type="button" class="finding" data-focus="cycle"><i class="dot warn"></i><b>${formatInt(
        model.cycles.length
      )}</b> aristas cíclicas</button>`
    );
  }
  chips.push(
    `<span class="finding static"><i class="dot neutral"></i><b>${formatInt(
      model.fileCount
    )}</b> ficheros</span>`
  );
  chips.push(
    `<span class="finding static"><i class="dot neutral"></i><b>${formatInt(
      model.edges.length
    )}</b> dependencias</span>`
  );

  return `${chips.join("")}<span class="spacer"></span><span id="search-status" class="search-status" aria-live="polite"></span><span class="run-meta">${escapeHtml(
    model.areaTitle
  )} · ${formatInt(model.metrics.length)} métricas · cc.json ${escapeHtml(
    model.meta.apiVersion
  )}</span>`;
}

function metricByKey(model: RenderModel, key: string | null) {
  return key ? model.metrics.find((metric) => metric.key === key) : undefined;
}

function renderLegend(model: RenderModel): string {
  if (model.initialLens === "structure") {
    const items = model.sections
      .slice(0, 6)
      .map(
        (section) =>
          `<span><i style="background:${section.color}"></i>${escapeHtml(section.key)}</span>`
      )
      .join("");
    return `<span>Carpeta</span><span class="sws">${items}</span>`;
  }

  if (model.initialLens === "metric" && model.initialMetric) {
    const metric = metricByKey(model, model.initialMetric);
    if (metric) {
      const direction =
        metric.direction === -1
          ? " · menos es mejor"
          : metric.direction === 1
            ? " · más es mejor"
            : "";
      return `<span>${escapeHtml(metric.title)}${direction}</span><span class="mono">${escapeHtml(
        formatCompact(metric.min)
      )}</span><span class="bar" style="background:${METRIC_GRADIENT}"></span><span class="mono">${escapeHtml(
        formatCompact(metric.max)
      )}</span>`;
    }
  }

  return `<span>Riesgo (0–100)</span><span class="mono">0</span><span class="bar" style="background:${RISK_GRADIENT}"></span><span class="mono">100</span>`;
}

function renderMetricOptions(model: RenderModel): string {
  return model.metrics
    .map(
      (metric) =>
        `<option value="${escapeAttr(metric.key)}"${
          metric.key === model.initialMetric ? " selected" : ""
        }>${escapeHtml(metric.title)}</option>`
    )
    .join("");
}

function renderInspectorSummary(model: RenderModel): string {
  const hotspots = [...model.files]
    .sort((a, b) => b.risk - a.risk || a.path.localeCompare(b.path))
    .slice(0, 5);

  return `<div class="summary">
  <div class="sub">Proyecto</div>
  <div class="big">${formatInt(model.fileCount)}</div>
  <div class="sub">ficheros · ${formatInt(model.folderCount)} carpetas</div>
  <p>${formatInt(model.totalArea)} de ${escapeHtml(
    model.areaTitle.toLowerCase()
  )} · ${formatInt(model.metrics.length)} métricas · ${formatInt(
    model.hotspotCount
  )} hotspots.</p>
  <h4>Mayor riesgo</h4>
  <ul class="deps">${hotspots
    .map(
      (file) =>
        `<li data-file="${file.index}"><i class="sw" style="background:${riskColor(
          file.risk
        )}"></i><span>${escapeHtml(file.path)}</span><em>${Math.round(
          file.risk * 100
        )}</em></li>`
    )
    .join("")}</ul>
  <p>Selecciona un bloque para ver sus métricas y sus dependencias. Clic en la cabecera de una carpeta para enfocarla.</p>
</div>`;
}

export function renderHtml(model: RenderModel): string {
  const project = escapeHtml(model.meta.project);
  const title = escapeHtml(model.meta.title);
  const commit = model.meta.commit ? model.meta.commit.slice(0, 7) : "";
  const checksum = model.meta.checksum ? model.meta.checksum.slice(0, 8) : "";
  const badge = commit || checksum || `cc.json ${model.meta.apiVersion}`;
  const payload = jsonForScript(serialise(model));
  const metricPicker =
    model.metrics.length > 0
      ? `<label class="metric-pick" id="metric-pick"${
          model.initialLens === "metric" ? "" : " hidden"
        }><span>Métrica</span><select id="metric-select">${renderMetricOptions(
          model
        )}</select></label>`
      : "";
  const crumbs = model.meta.rootName
    ? `${project} <span class="sep">/</span> ${escapeHtml(model.meta.rootName)}`
    : project;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="generator" content="CodArch">
<title>CodArch · ${title}</title>
<style>${STYLES}</style>
</head>
<body>
<div class="app">
  <header>
    <div class="brand">CodArch</div>
    <div class="repo">
      <b>${project}</b>
      ${model.meta.rootName ? `<span>${escapeHtml(model.meta.rootName)}</span>` : ""}
      <span class="commit">${escapeHtml(badge)}</span>
    </div>
    <div class="spacer"></div>
    <nav class="lenses" role="tablist" aria-label="Lentes">${renderLensButtons(model)}</nav>
    ${metricPicker}
    <label class="search">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" stroke="#8d877d" stroke-width="1.4"/>
        <path d="M10.5 10.5 14 14" stroke="#8d877d" stroke-width="1.4"/>
      </svg>
      <input id="q" type="search" placeholder="Buscar fichero…" autocomplete="off" aria-label="Buscar fichero">
    </label>
  </header>

  <div class="findings">${renderFindings(model)}</div>

  <main class="map-wrap">
    <div class="map" id="map">${renderSvg(model)}</div>
    <div class="tooltip" id="tooltip"></div>
  </main>

  <aside id="inspector">${renderInspectorSummary(model)}</aside>

  <footer>
    <span class="crumbs" id="crumbs">${crumbs}</span>
    <span class="hint">clic para fijar · esc para limpiar</span>
    <span class="legend" id="legend">${renderLegend(model)}</span>
  </footer>
</div>
<script id="codarch-data" type="application/json">${payload}</script>
<script>${CLIENT}</script>
</body>
</html>`;
}
