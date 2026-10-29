import { fileFill, inkFor } from "./color";
import { layoutMap, VIEW_HEIGHT, VIEW_WIDTH, type PlacedNode } from "./layout";
import type { RenderMetric, RenderModel } from "./model";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Los atributos no necesitan escapar `>` ni `'`, pero el coste es despreciable. */
export function escapeAttr(value: string): string {
  return escapeHtml(value);
}

export function formatInt(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(".0", "").replace(".", ",")}M`;
  }
  if (absolute >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(".0", "").replace(".", ",")}k`;
  }
  return formatInt(value);
}

function coord(value: number): string {
  const rounded = Math.round(value);
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function span(value: number): string {
  return String(Math.max(1, Math.round(value)));
}

function truncate(value: string, maxWidth: number, fontSize: number): string {
  const maxChars = Math.floor(maxWidth / (fontSize * 0.56));
  if (maxChars <= 0) return "";
  if (value.length <= maxChars) return value;
  if (maxChars === 1) return "…";
  return `${value.slice(0, maxChars - 1)}…`;
}

function labelFor(
  nodeName: string,
  rect: { x: number; y: number; w: number; h: number },
  out: string[],
  ink: string
): void {
  if (rect.w < 44 || rect.h < 13) return;

  const available = rect.w - 8;
  const dot = nodeName.lastIndexOf(".");
  const twoLines = rect.h >= 27 && rect.w >= 64 && dot > 0 && dot < nodeName.length - 1;

  if (twoLines) {
    const base = truncate(nodeName.slice(0, dot), available, 12.5);
    const extension = truncate(nodeName.slice(dot), available, 10);
    if (base) {
      out.push(
        `<text class="a" x="${coord(rect.x + 4)}" y="${coord(rect.y + 12)}" fill="${ink}">${escapeHtml(base)}</text>`
      );
    }
    if (extension) {
      out.push(
        `<text class="b" x="${coord(rect.x + 4)}" y="${coord(rect.y + 22.5)}" fill="${ink}">${escapeHtml(extension)}</text>`
      );
    }
    return;
  }

  const label = truncate(nodeName, available, 12.5);
  if (!label) return;
  out.push(
    `<text class="a" x="${coord(rect.x + 4)}" y="${coord(rect.y + 13)}" fill="${ink}">${escapeHtml(label)}</text>`
  );
}

function renderPlaced(
  placed: PlacedNode,
  out: string[],
  model: RenderModel,
  metricIndex: number,
  metric: RenderMetric | undefined
): void {
  const node = placed.node;
  const rect = placed.rect;

  if (node.kind === "file") {
    const index = node.fileIndex;
    if (index === undefined) return;
    const file = model.files[index];
    if (!file) return;

    const fill = fileFill(model, file, metricIndex, metric);
    const ink = inkFor(fill);

    out.push(
      `<rect data-i="${index}" x="${coord(rect.x)}" y="${coord(rect.y)}" width="${span(rect.w)}" height="${span(rect.h)}" fill="${fill}"/>`
    );
    labelFor(file.name, rect, out, ink);
    return;
  }

  const folder = node;
  out.push(
    `<g class="folder" data-nm="${escapeAttr(folder.name)}" data-n="${folder.fileCount}" data-a="${coord(folder.value)}">`
  );
  out.push(
    `<rect class="fr" x="${coord(rect.x)}" y="${coord(rect.y)}" width="${span(rect.w)}" height="${span(rect.h)}"/>`
  );

  if (placed.headerHeight >= 13 && rect.w >= 30) {
    const headerHeight = placed.headerHeight;
    out.push(
      `<rect class="fh" x="${coord(rect.x + 1)}" y="${coord(rect.y + 1)}" width="${span(rect.w - 2)}" height="${span(headerHeight - 1)}"/>`
    );

    const count = formatCompact(folder.value);
    const showCount = rect.w >= 86;
    const countWidth = showCount ? count.length * 5.8 + 12 : 0;
    const name = truncate(folder.name, Math.max(8, rect.w - 12 - countWidth), 11.5);
    if (name) {
      out.push(
        `<text class="ft" x="${coord(rect.x + 6)}" y="${coord(rect.y + headerHeight / 2 + 4)}">${escapeHtml(name)}</text>`
      );
    }
    if (showCount) {
      out.push(
        `<text class="fn" x="${coord(rect.x + rect.w - 6)}" y="${coord(rect.y + headerHeight / 2 + 3.6)}">${escapeHtml(count)}</text>`
      );
    }
  }

  for (const child of placed.children) {
    renderPlaced(child, out, model, metricIndex, metric);
  }
  out.push("</g>");
}

export function renderSvg(model: RenderModel): string {
  const metricIndex = model.initialMetric
    ? model.metrics.findIndex((metric) => metric.key === model.initialMetric)
    : -1;
  const metric = metricIndex >= 0 ? model.metrics[metricIndex] : undefined;

  const out: string[] = [];
  out.push(
    `<svg id="map" viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa de arquitectura de ${escapeAttr(model.meta.project)}">`
  );
  out.push(
    `<rect class="canvas" x="0" y="0" width="${VIEW_WIDTH}" height="${VIEW_HEIGHT}"/>`
  );
  out.push(`<g id="cells">`);
  for (const placed of layoutMap(model.roots)) {
    renderPlaced(placed, out, model, metricIndex, metric);
  }
  out.push(`</g><g id="edges"></g></svg>`);
  return out.join("");
}
