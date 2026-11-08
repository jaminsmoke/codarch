import {
  isCurrentClean,
  scopeHealth,
  type CoverageState,
  type HealthScope,
  type HealthSnapshot,
  type LintArtifact,
  type Reason,
  type ReasonCode,
  type ScopeHealth
} from "@codarch/lint/browser";
import { formatCompact, type RenderModel } from "@codarch/render/browser";

/**
 * La frase de la ficha, a partir de `scopeHealth`.
 *
 * Limpio y al día solo cuando el contrato lo dice (`isCurrentClean`): cobertura
 * completa, árbol al día, cero hallazgos y algo elegible. El resto de estados
 * no se presenta como sano. Los códigos de motivo se traducen aquí; no se
 * inventa un DTO.
 */

const REASON_TEXT: Record<ReasonCode, string> = {
  "legacy-global":
    "El artefacto es anterior a la cobertura por herramienta: no se sabe qué se midió.",
  "legacy-version": "Medido con una versión anterior.",
  "tool-failed": "Una herramienta falló y no llegó a medir.",
  "tool-missing": "Falta una herramienta declarada: no se midió.",
  "unknown-eligibility": "No se sabe qué ficheros eran elegibles.",
  "unknown-paths": "No se sabe si esta ruta entraba en la medida.",
  "not-eligible": "Esta ruta no entra en el universo medible.",
  "not-found": "Esta ruta no está en el árbol del snapshot.",
  "no-eligible": "No hay ficheros elegibles en este ámbito.",
  "freshness-unverified":
    "No se puede comprobar si el análisis es del árbol actual."
};

/** El snapshot que pide el contrato: el checksum del mapa y sus rutas. */
export function healthSnapshot(model: RenderModel | null): HealthSnapshot | undefined {
  if (!model) return undefined;
  return {
    treeHash: model.meta.checksum.length > 0 ? model.meta.checksum : null,
    paths: model.files.map((file) => file.path)
  };
}

export function healthOf(
  artifact: LintArtifact | null,
  scope: HealthScope,
  snapshot?: HealthSnapshot
): ScopeHealth {
  return scopeHealth(artifact, scope, snapshot);
}

/** El ámbito está limpio y al día: cobertura completa, fresco y sin hallazgos. */
export function isClean(health: ScopeHealth): boolean {
  return isCurrentClean(health);
}

/** Una herramienta de la medida, con lo que la ficha necesita para contarla. */
export interface ToolRow {
  name: string;
  state: CoverageState;
  measured: number | null;
  eligible: number | null;
  /** Reglas activas enumeradas; `null` si no se pudieron enumerar. */
  rules: number | null;
  config: string | null;
  note: string | null;
  /** El primer motivo de la herramienta, ya traducido. */
  reason: string | null;
}

/**
 * Las herramientas que participaron en la medida del artefacto.
 *
 * No es el catálogo: es la fila de cada una con su estado y lo que aportó
 * —config, reglas y ficheros medidos— para que la ficha pueda decir cuál está
 * ok y cuál no (ADR 0110). Una herramienta que falló también está: su estado
 * lo dice.
 */
export function toolHealthRows(
  artifact: LintArtifact | null,
  health: ScopeHealth
): ToolRow[] {
  if (!artifact) return [];
  const systems = new Map(
    artifact.meta.systems.map((system) => [system.name, system])
  );
  return Object.keys(health.coverage.byTool)
    .sort()
    .map((name) => {
      const tool = health.coverage.byTool[name];
      const system = systems.get(name);
      const first = tool?.reasons[0];
      return {
        name,
        state: tool?.state ?? "unknown",
        measured: tool?.measured ?? null,
        eligible: tool?.eligible ?? null,
        rules: system?.rules?.length ?? null,
        config: system?.config ?? null,
        note: system?.note ?? null,
        reason: first ? reasonText(first) : null
      };
    });
}

export function reasonText(reason: Reason): string {
  const base = REASON_TEXT[reason.code];
  return reason.text ? `${base} (${reason.text})` : base;
}

function reasonSentence(reasons: readonly Reason[]): string {
  return reasons.map(reasonText).join(" ");
}

/**
 * La frase de un origen.
 *
 * Si otro origen aplicable es heredado o desconocido, ni este se dice limpio.
 * `fresh === false` es un árbol viejo: no entra en «al día». `fresh === null`
 * con cobertura completa y cero hallazgos es actualidad no verificada.
 */
export function originHealthCopy(health: ScopeHealth, allowClean: boolean): string {
  if (isCurrentClean(health) && !allowClean) {
    return "Cobertura completa y sin hallazgos. No se da por limpio: otro origen aplicable no lo está.";
  }
  return healthCopy(health);
}

export function healthCopy(health: ScopeHealth): string {
  if (isCurrentClean(health)) return "Limpio y al día.";

  const { coverage, fresh, counts } = health;
  const state: CoverageState = coverage.state;

  if (state === "complete" && fresh === null && counts.findings === 0) {
    return "Sin hallazgos, no verificado.";
  }

  if (
    state === "unknown" &&
    coverage.measured !== null &&
    counts.findings === 0 &&
    coverage.reasons.some((item) => item.code === "unknown-eligibility")
  ) {
    return `Medidos ${formatCompact(coverage.measured)}, sin hallazgos, universo no verificado.`;
  }

  switch (state) {
    case "unmeasured":
      return unmeasuredCopy(health);
    case "partial":
      return counts.findings === 0
        ? `Cobertura parcial: sin hallazgos observados en lo medido. ${reasonSentence(coverage.reasons)}`.trim()
        : `Cobertura parcial: se muestran los hallazgos observados. ${reasonSentence(coverage.reasons)}`.trim();
    case "unknown":
      return counts.findings === 0
        ? `Cobertura no verificada. ${reasonSentence(coverage.reasons)}`.trim()
        : `Cobertura no verificada: se muestran los hallazgos observados. ${reasonSentence(coverage.reasons)}`.trim();
    case "complete":
      if (fresh === false && counts.findings === 0) {
        return "Sin hallazgos observados en una pasada anterior; puede estar desfasado.";
      }
      return fresh === false
        ? "Estos hallazgos son de una pasada anterior y pueden estar desfasados."
        : "Estos son los hallazgos observados.";
    default: {
      const unexpected: never = state;
      return unexpected;
    }
  }
}

function unmeasuredCopy(health: ScopeHealth): string {
  const reasons = reasonSentence(health.coverage.reasons);
  return reasons ? `Sin medir. ${reasons}` : "Sin medir.";
}

/** El resumen de la sección cerrada. Nunca «limpio» si el contrato no lo es. */
export function healthSummary(health: ScopeHealth): string {
  if (isCurrentClean(health)) return "limpio y al día";
  if (health.fresh === false) return "puede estar desfasado";
  if (health.coverage.state === "unmeasured" && health.counts.findings === 0) {
    return "sin medir";
  }
  if (health.counts.findings === 0) return "cobertura no verificada";
  return "";
}
