import type { CcJson, CcRestNode } from "@codarch/schema/browser";
import { walkFiles } from "@codarch/schema/browser";
import { riskBreakdown } from "@codarch/metrics/browser";
import { valueOf } from "./model-metrics";
import type {
  MetricAttributes,
  RenderFile,
  RenderOptions,
  RiskParts
} from "./model-types";

/**
 * Los ficheros del mapa: uno por nodo, con su área, su tipo y sus señales.
 *
 * El riesgo se aplica después de tenerlos todos porque necesita los p95 del
 * conjunto: un fichero solo no sabe cuánto pesa su complejidad.
 */

/** El desglose de un fichero sin señales: el mapa lo rellena después. */
const NO_SIGNAL = {
  value: 0,
  p95: 0,
  norm: 0,
  weight: 0,
  share: 0
};
const NO_RISK_PARTS: RiskParts = {
  complexity: NO_SIGNAL,
  churn: NO_SIGNAL,
  size: NO_SIGNAL,
  lint: NO_SIGNAL
};

/** Un fichero del snapshot, con su área real y sus señales de riesgo en cero. */
export function collectFiles(
  cc: CcJson,
  attributes: MetricAttributes,
  context: {
    areaMetric: string | null;
    complexityKey: string | null;
    churnKey: string | null;
    prefix: string;
    warnings: string[];
    /** El tipo de cada fichero del resto, por id (ADR 0093). */
    restKinds: Record<string, CcRestNode>;
    /** La deuda del lint por ruta, si el proyecto tiene artefacto (ADR 0094). */
    lintByPath: Readonly<Record<string, number>>;
  }
): RenderFile[] {
  const files: RenderFile[] = [];

  walkFiles(cc.files, (entry) => {
    const fullPath = entry.path;
    const path =
      context.prefix && fullPath.startsWith(context.prefix)
        ? fullPath.slice(context.prefix.length)
        : fullPath;
    const values = attributes[entry.node.id];
    const rawArea = valueOf(values, context.areaMetric);

    files.push({
      index: files.length,
      nodeId: entry.node.id,
      path,
      name: entry.node.name,
      section: -1,
      area: Math.max(1, rawArea ?? 0),
      actualArea: rawArea ?? 0,
      risk: 0,
      riskParts: NO_RISK_PARTS,
      complexity: valueOf(values, context.complexityKey) ?? 0,
      churn: valueOf(values, context.churnKey) ?? 0,
      // Con carpeta raíz el snapshot lleva su nombre delante; el lint, no.
      lint: context.lintByPath[fullPath] ?? context.lintByPath[path] ?? 0,
      values: [],
      kind: context.restKinds[entry.node.id]?.kind ?? null
    });
  });

  return files;
}

/** Un fichero sin la métrica de área se dibuja con el mínimo: se dice, no se esconde. */
export function warnAboutArea(
  files: readonly RenderFile[],
  areaMetric: string | null,
  options: RenderOptions,
  warnings: string[]
): void {
  if (!areaMetric || files.length === 0) return;

  const missing = files.filter((file) => file.actualArea === 0).length;
  if (missing > 0) {
    warnings.push(
      `${missing} ficheros sin "${areaMetric}"; se dibujan con área mínima para no desaparecer`
    );
  }
  if (!options.areaMetric && areaMetric !== "rloc") {
    warnings.push(`"rloc" no está presente; se usa "${areaMetric}" como área`);
  }
}

/**
 * Riesgo compuesto: complejidad, churn y tamaño, más el lint cuando lo hay.
 *
 * Si falta una señal, los pesos se renormalizan: un proyecto sin historial
 * git no debe quedar con un máximo artificial de 68/100, y un proyecto sin
 * lint se queda con la cuenta de siempre (ADR 0094).
 */
export function applyRisk(files: RenderFile[], hasLint: boolean): void {
  const risks = riskBreakdown(
    files.map((file) => ({
      complexity: file.complexity,
      churn: file.churn,
      size: file.actualArea,
      lint: file.lint
    })),
    { lint: hasLint }
  );

  for (const [index, file] of files.entries()) {
    const breakdown = risks[index];
    if (!breakdown) continue;
    file.risk = breakdown.risk;
    file.riskParts = breakdown.parts;
  }
}
