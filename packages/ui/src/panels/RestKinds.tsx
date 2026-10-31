import {
  formatCompact,
  KIND_COLOR,
  type RenderModel
} from "@codarch/render/browser";
import type { CcRestKind } from "@codarch/schema/browser";
import { CollapsibleSection } from "../CollapsibleSection";
import { KIND_LABEL } from "../labels";

/** El orden de los tipos, el mismo de la leyenda del mapa (ADR 0093). */
const KINDS: CcRestKind[] = ["doc", "config", "asset", "other"];

/**
 * El reparto del resto por tipo (M64).
 *
 * La leyenda ya decía cuántos ficheros hay de cada tipo cuando el color es
 * `kind`; el raíl lo dice siempre, sin cambiar de color: una barra, su leyenda y
 * la cuenta. Es la lectura de qué hay en el mapa de lo que no es código.
 */
export function RestKinds({ model }: { model: RenderModel | null }) {
  const files = model?.files ?? [];
  const counts = new Map<CcRestKind, number>();
  for (const file of files) {
    if (!file.kind) continue;
    counts.set(file.kind, (counts.get(file.kind) ?? 0) + 1);
  }

  const kinds = KINDS.filter((kind) => (counts.get(kind) ?? 0) > 0);
  if (kinds.length === 0) return null;
  const total = kinds.reduce((sum, kind) => sum + (counts.get(kind) ?? 0), 0);

  return (
    <CollapsibleSection
      id="rail-rest-kinds"
      title="Estratos"
      className="panel-block"
      count={kinds.length}
      summary={`${formatCompact(total)} ficheros`}
    >
      <div className="strata" aria-label="Reparto por tipo">
        {kinds.map((kind) => (
          <i
            key={kind}
            title={`${KIND_LABEL[kind]}: ${formatCompact(counts.get(kind) ?? 0)} ficheros`}
            style={{
              width: `${((counts.get(kind) ?? 0) / total) * 100}%`,
              background: KIND_COLOR[kind]
            }}
          />
        ))}
      </div>
      <div className="strata-legend">
        {kinds.map((kind) => (
          <div key={kind} className="strata-row">
            <i style={{ background: KIND_COLOR[kind] }} />
            <span>{KIND_LABEL[kind]}</span>
            <span className="mono">{formatCompact(counts.get(kind) ?? 0)}</span>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}
