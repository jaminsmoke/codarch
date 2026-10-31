import {
  formatCompact,
  type RenderFile,
  type RenderModel
} from "@codarch/render/browser";
import { CollapsibleSection } from "../CollapsibleSection";
import { duplicationRollup } from "../duplication";
import { DuplicationPairs } from "./DuplicationPairs";

/**
 * La duplicación del fichero, la carpeta o el proyecto (ADR 0102, M69 y M70).
 *
 * Enseña las líneas y la proporción sobre el `rloc` del sujeto, no un
 * porcentaje sumado: el porcentaje se calcula una vez, con el total del
 * subárbol. En el fichero, además, sus pares y el aviso de la copia que se está
 * separando; en la carpeta y el proyecto, la lista de pares con su filtro, que
 * es lo que convierte una cifra en una tarea.
 */

/** Cuántos pares enseña la ficha antes de recortar. */
const PAIR_ROWS = 8;

export function DuplicationSection({
  id,
  model,
  files,
  file = null,
  onSelectPath
}: {
  /** `file`, `folder` o `project`: da identidad a la sección plegable. */
  id: string;
  model: RenderModel;
  /** Los ficheros del sujeto: uno en la ficha del fichero. */
  files: readonly RenderFile[];
  /** El fichero del que se habla, si la hoja es suya. */
  file?: RenderFile | null;
  /** Abre la ficha del otro lado de un par. */
  onSelectPath?: (path: string) => void;
}) {
  const rollup = duplicationRollup(model, files);
  const sectionId = `${id}-duplication`;

  if (!rollup.measured) {
    return (
      <CollapsibleSection
        id={sectionId}
        title="Duplicación"
        className="section-duplication section-empty"
        summary="sin medir"
      >
        <p className="muted tiny card-note">
          Este snapshot no trae la lente de duplicación: el código copiado está
          sin medir, que no es lo mismo que no haberlo. Analiza con{" "}
          <code>codarch analyze</code> para medirlo.
        </p>
      </CollapsibleSection>
    );
  }

  const pairs = file ? model.duplication.pairsByNode[file.nodeId] ?? [] : [];
  const duplicateOf = file
    ? model.duplication.nodes[file.nodeId]?.duplicateOf ?? null
    : null;
  // El par que más se parece de los que ya se están separando: es el que pide
  // una decisión, y la ficha lo dice con nombre en vez de solo un porcentaje.
  const diverging = pairs.find((pair) => pair.status === "diverging") ?? null;
  const shown = pairs.slice(0, PAIR_ROWS);

  return (
    <CollapsibleSection
      id={sectionId}
      title="Duplicación"
      className="section-duplication"
      count={file ? pairs.length : rollup.files}
      summary={`${rollup.ratio}% del rloc`}
    >
      <div className="duplication-figures">
        <div className="duplication-figure">
          <span className="mono">{formatCompact(rollup.duplicatedLines)}</span>
          <span>líneas duplicadas</span>
        </div>
        <div className="duplication-figure">
          <span className="mono">{formatCompact(rollup.repeatedLines)}</span>
          <span>repetidas dentro del fichero</span>
        </div>
        <div className="duplication-figure">
          <span className="mono">{rollup.ratio}%</span>
          <span>de {formatCompact(rollup.rloc)} rloc</span>
        </div>
      </div>

      <p className="muted tiny card-note">
        {rollup.files === 0
          ? `${formatCompact(rollup.total)} ficheros medidos, ninguno con líneas compartidas.`
          : `${formatCompact(rollup.files)} de ${formatCompact(rollup.total)} ficheros con líneas compartidas.`}{" "}
        El porcentaje se calcula sobre el rloc del subárbol; no se suma entre
        carpetas.
      </p>

      {duplicateOf ? (
        <p className="duplication-copy">
          Copia literal de <code>{duplicateOf}</code>.
        </p>
      ) : null}

      {diverging ? (
        <p className="duplication-divergence">
          Comparte el {diverging.similarity} % con{" "}
          <code>{diverging.path}</code>: las dos copias se están separando.
        </p>
      ) : null}

      {pairs.length > 0 ? (
        <div className="duplication-pairs">
          <div className="rollup-head">Comparte con</div>
          <div role="group" aria-label="Ficheros que comparten bloques">
            {shown.map((pair) => (
              <button
                key={pair.path}
                type="button"
                className={`duplication-pair duplication-${pair.status}`}
                onClick={() => onSelectPath?.(pair.path)}
                title={
                  pair.status === "copy"
                    ? `${pair.path} · copia literal · ${pair.lines} líneas. Pulsa para abrir su ficha.`
                    : `${pair.path} · comparte el ${pair.similarity} % · ${pair.lines} líneas. Pulsa para abrir su ficha.`
                }
              >
                <span className="mono duplication-pair-path">{pair.path}</span>
                <span className="mono duplication-pair-meta">
                  {pair.status === "copy" ? "copia" : `${pair.similarity}%`}
                  {" · "}
                  {formatCompact(pair.lines)} líneas
                </span>
              </button>
            ))}
          </div>
          {pairs.length > shown.length ? (
            <p className="muted tiny card-note">
              {pairs.length - shown.length} pares más, fuera de la lista.
            </p>
          ) : null}
        </div>
      ) : null}

      {file ? null : (
        <DuplicationPairs
          model={model}
          files={files}
          onSelectPath={onSelectPath}
        />
      )}
    </CollapsibleSection>
  );
}
