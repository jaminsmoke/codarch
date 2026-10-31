import { useState } from "react";
import {
  formatCompact,
  type RenderFile,
  type RenderModel
} from "@codarch/render/browser";
import {
  duplicationPairs,
  type DuplicationStatusFilter
} from "../duplication";

/**
 * La lista de pares de un subárbol, con su estado y su filtro (M70, ADR 0102).
 *
 * Es la vista que convierte la cifra del proyecto en trabajo: qué dos ficheros
 * comparten bloques, cuánto se parecen y cuántas líneas son. El estado tiene
 * nombre —`copy` o `diverging`—, y el filtro deja quedarse solo con los que se
 * están separando, que son los que piden una decisión.
 */

/** Cuántos pares enseña la lista antes de recortar. */
const PAIR_ROWS = 12;

const FILTERS: Array<{ value: DuplicationStatusFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "copy", label: "Copias" },
  { value: "diverging", label: "Divergentes" }
];

export function DuplicationPairs({
  model,
  files,
  onSelectPath
}: {
  model: RenderModel;
  /** Los ficheros del sujeto: el subárbol de la carpeta o el proyecto entero. */
  files: readonly RenderFile[];
  /** Abre la ficha de un extremo del par. */
  onSelectPath?: (path: string) => void;
}) {
  const [status, setStatus] = useState<DuplicationStatusFilter>("all");
  const { rows, counts } = duplicationPairs(model, files, status);

  // Sin ningún par no hay lista: la sección ya dice que no hay líneas
  // compartidas, y una tabla vacía solo añadiría ruido.
  if (counts.all === 0) return null;

  const shown = rows.slice(0, PAIR_ROWS);

  return (
    <div className="duplication-list-block">
      <div
        className="duplication-filters"
        role="group"
        aria-label="Filtrar pares por estado"
      >
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className="duplication-filter"
            aria-pressed={status === filter.value}
            disabled={filter.value !== "all" && counts[filter.value] === 0}
            onClick={() => setStatus(filter.value)}
          >
            {filter.label}{" "}
            <span className="mono">{formatCompact(counts[filter.value])}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="muted tiny card-note">
          Ningún par en este estado: cambia el filtro para ver los demás.
        </p>
      ) : (
        <>
          <div
            className="duplication-list"
            role="list"
            aria-label="Pares de ficheros que comparten bloques"
          >
            {shown.map((pair) => (
              <div
                key={`${pair.from}->${pair.to}`}
                role="listitem"
                className={`duplication-pair-row duplication-${pair.status}`}
              >
                <span className="duplication-ends">
                  <button
                    type="button"
                    className="mono duplication-end"
                    title={`Abrir ${pair.from}`}
                    onClick={() => onSelectPath?.(pair.from)}
                  >
                    {pair.from}
                  </button>
                  <span className="duplication-arrow" aria-hidden="true">
                    →
                  </span>
                  <button
                    type="button"
                    className="mono duplication-end"
                    title={`Abrir ${pair.to}`}
                    onClick={() => onSelectPath?.(pair.to)}
                  >
                    {pair.to}
                  </button>
                </span>
                <span className="mono duplication-pair-meta">
                  {pair.status === "copy" ? "copia" : `${pair.similarity}%`}
                  {" · "}
                  {formatCompact(pair.lines)} líneas
                </span>
              </div>
            ))}
          </div>
          {rows.length > shown.length ? (
            <p className="muted tiny card-note">
              {rows.length - shown.length} pares más, fuera de la lista.
            </p>
          ) : null}
        </>
      )}

      <p className="muted tiny card-note">
        Un par cuenta en el subárbol cuando sus dos ficheros están dentro; el que
        cruza la frontera es de la carpeta padre. Pulsa una ruta para abrir su
        ficha.
      </p>
    </div>
  );
}
