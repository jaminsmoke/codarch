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
