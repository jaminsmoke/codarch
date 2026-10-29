import type { CcRestKind } from "@codarch/schema/browser";
import type {
  Lens,
  RenderFile,
  RenderMetric,
  RenderModel,
  RenderSection
} from "./model";

/**
 * El color de cada tipo de lo que no es código (ADR 0093).
 *
 * Son los tonos apagados del mapa: el color dice el tipo y el área el tamaño,
 * sin una tercera variable que competir con ellas.
 */
export const KIND_COLOR: Record<CcRestKind, string> = {
  doc: "#a9bfae",
  config: "#c9b8a8",
  asset: "#bfb6c9",
  other: "#d5d2ca"
};

/** El color de un tipo del resto; lo que no se reconoce sale como `other`. */
export function kindColor(kind: CcRestKind): string {
  return KIND_COLOR[kind] ?? KIND_COLOR.other;
}

type Stop = readonly [number, string];

const RISK_STOPS: readonly Stop[] = [
  [0, "#ebe7df"],
  [0.35, "#e9cd98"],
  [0.65, "#d68a54"],
  [1, "#a42e2c"]
];

const METRIC_STOPS: readonly Stop[] = [
  [0, "#ebe7df"],
  [0.5, "#b9c9cf"],
  [1, "#355b6b"]
];

export const RISK_GRADIENT =
  "linear-gradient(90deg, #ebe7df 0%, #e9cd98 35%, #d68a54 65%, #a42e2c 100%)";

export const METRIC_GRADIENT =
  "linear-gradient(90deg, #ebe7df 0%, #b9c9cf 50%, #355b6b 100%)";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16)
  ];
}

function rgbToHex(rgb: readonly [number, number, number]): string {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function mix(a: string, b: string, t: number): string {
  const from = hexToRgb(a);
  const to = hexToRgb(b);
  return rgbToHex([
    Math.round(from[0] + (to[0] - from[0]) * t),
    Math.round(from[1] + (to[1] - from[1]) * t),
    Math.round(from[2] + (to[2] - from[2]) * t)
  ]);
}

function ramp(stops: readonly Stop[], t: number): string {
  const value = clamp01(t);
  for (let index = 0; index < stops.length - 1; index++) {
    const from = stops[index] as Stop;
    const to = stops[index + 1] as Stop;
    if (value <= to[0]) {
      const span = to[0] - from[0] || 1;
      return mix(from[1], to[1], (value - from[0]) / span);
    }
  }
  return (stops[stops.length - 1] as Stop)[1];
}

export function riskColor(risk: number): string {
  return ramp(RISK_STOPS, risk);
}

export function metricColor(value: number | null, metric: RenderMetric): string {
  if (value === null) return METRIC_STOPS[0]![1];
  let t: number;
  if (metric.mode === "log") {
    const span = Math.max(1e-9, metric.max - metric.min);
    t = Math.log1p(Math.max(0, value - metric.min)) / Math.log1p(span);
  } else {
    const span = metric.max - metric.min;
    t = span > 0 ? (value - metric.min) / span : 0;
  }
  return ramp(METRIC_STOPS, t);
}

export function sectionColor(section: RenderSection): string {
  return section.color;
}

/** Contraste suficiente para etiquetas y cifras sobre el bloque. */
export function inkFor(color: string): string {
  const [r, g, b] = hexToRgb(color);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.52 ? "#1a1a1a" : "#f7f5f1";
}

export function colorForFile(
  lens: Lens,
  risk: number,
  section: RenderSection | undefined,
  value: number | null,
  metric: RenderMetric | undefined
): string {
  if (lens === "structure") return section?.color ?? "#ddd8cf";
  if (lens === "risk" || !metric) return riskColor(risk);
  return metricColor(value, metric);
}

/**
 * El color de un fichero del modelo, resuelto igual para el SVG y para el PNG.
 *
 * El índice de la métrica y la métrica salen del modelo ya construido; aquí solo
 * se decide qué valor se lee y con qué se pinta. Vive en un sitio para que el
 * mapa de la app y la captura no puedan pintar distinto.
 */
export function fileFill(
  model: RenderModel,
  file: RenderFile,
  metricIndex: number,
  metric: RenderMetric | undefined
): string {
  const value = metricIndex >= 0 ? file.values[metricIndex] ?? null : null;
  return colorForFile(
    model.initialLens,
    file.risk,
    model.sections[file.section],
    value,
    metric
  );
}
