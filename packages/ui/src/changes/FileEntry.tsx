import { useEffect, useState } from "react";
import type { FileDiffView } from "../platform";
import {
  deltaLabel,
  deltaTone,
  rowTitle,
  type ChangeFileRow,
  type ChangeFileSymbols,
  type ChangeSymbol
} from "../changeFiles";
import { Caret } from "../CollapsibleSection";

/** Lo que se dice de un símbolo que apareció, se fue o cambió. */
const SYMBOL_STATUS = {
  added: "nuevo",
  removed: "eliminado",
  changed: "cambió"
} as const;

/** La letra de un símbolo en el desplegable, como la de un fichero. */
const SYMBOL_LETTER = {
  added: "A",
  removed: "D",
  changed: "~"
} as const;

/** Cuántos símbolos del desplegable se pintan antes de contar el resto. */
const SYMBOL_ROWS = 12;

/** Lo que el tooltip del galón cuenta: cuántos símbolos hay detrás. */
function symbolTitle(path: string, symbols: ChangeFileSymbols): string {
  return `${path} · ${symbols.items.length} símbolos tocados`;
}

/**
 * Una fila de **Ficheros**: la letra del estado, la ruta y el delta (ADR 0070).
 *
 * El eliminado no es un botón: no está en el snapshot del head y no hay ficha
 * que abrir. La fila lo dice en el tooltip en vez de fingir que lleva a algo.
 */
export function FileChangeRow({
  file,
  letter,
  open,
  loadDiff,
  onToggle,
  onSelectPath
}: {
  file: ChangeFileRow;
  letter: "A" | "M" | "D";
  open: boolean;
  loadDiff?: (path: string) => Promise<FileDiffView | null>;
  onToggle: () => void;
  onSelectPath: (path: string) => void;
}) {
  // La fila lleva **un** total: el delta de su métrica. Los parciales
  // (`+38 −27`) y el código que los explica viven en el desplegable: mezclarlos
  // en 60 px de columna dejaba las tres cifras ilegibles (ADR 0070).
  const body = (
    <>
      <span className={`change-status is-${file.status}`} aria-hidden="true">
        {letter}
      </span>
      <span className="change-path">{file.path}</span>
      <span className={`mono change-delta${deltaTone(file.delta)}`}>
        {deltaLabel(file)}
      </span>
    </>
  );

  // La fila entera lleva el color de su estado, no solo la letra: así el grupo
  // se lee de un vistazo sin contar letras (ADR 0070).
  const symbols = file.symbols;
  const hasInside = Boolean(symbols) || Boolean(loadDiff);

  return (
    <div className={`file-entry is-${file.status}`}>
      <div className="change-row file-row">
        {file.status === "removed" ? (
          // Un eliminado no está en el head: no hay ficha que abrir.
          <div className="file-open is-static" title={rowTitle(file)}>
            {body}
          </div>
        ) : (
          <button
            type="button"
            className="file-open"
            title={rowTitle(file)}
            onClick={() => onSelectPath(file.path)}
          >
            {body}
          </button>
        )}

        {/* El galón es hermano de la ruta, no hijo: un botón no se anida en
            otro. Solo aparece cuando hay interior que enseñar. */}
        {hasInside ? (
          <button
            type="button"
            className="file-ahead"
            aria-expanded={open}
            aria-label={`${open ? "Ocultar" : "Ver"} el interior de ${file.path}`}
            title={
              symbols ? symbolTitle(file.path, symbols) : `Ver el diff de ${file.path}`
            }
            onClick={onToggle}
          >
            <Caret open={open} />
          </button>
        ) : (
          // El hueco se reserva siempre: sin él, el delta de las filas que no
          // tienen interior se desalinea del resto.
          <span className="file-ahead is-empty" aria-hidden="true" />
        )}
      </div>

      {open && symbols ? <FileSymbolRows symbols={symbols} /> : null}
      {open && loadDiff ? <FileDiffRows path={file.path} load={loadDiff} /> : null}
    </div>
  );
}

/**
 * El interior de un fichero: sus símbolos con lo que suma y resta cada uno.
 *
 * Es lo que antes era la sección **Símbolos**, pero pegado al fichero al que
 * pertenece: allí una lista global no decía en cuál estaba cada cambio.
 */
function FileSymbolRows({ symbols }: { symbols: ChangeFileSymbols }) {
  const shown = symbols.items.slice(0, SYMBOL_ROWS);
  const rest = symbols.items.length - shown.length;

  return (
    <div className="file-symbols">
      {/* Solo lo que hay: un `−0` en la cabecera es ruido, no información. */}
      <div className="file-symbols-head">
        <span className="muted tiny">Símbolos</span>
        {symbols.added > 0 ? (
          <span className="mono symbol-delta is-positive">+{symbols.added}</span>
        ) : null}
        {symbols.removed > 0 ? (
          <span className="mono symbol-delta is-negative">−{symbols.removed}</span>
        ) : null}
        {symbols.changed > 0 ? (
          <span className="mono symbol-delta is-changed">~{symbols.changed}</span>
        ) : null}
      </div>
      <ul className="file-symbols-list">
        {shown.map((symbol, index) => (
          <li className="file-symbol" key={`${symbol.name}:${index}`}>
            <span
              className={`symbol-letter is-${symbol.status}`}
              aria-hidden="true"
            >
              {SYMBOL_LETTER[symbol.status]}
            </span>
            <span
              className="symbol-name"
              title={`${symbol.name} · ${SYMBOL_STATUS[symbol.status]}`}
            >
              {symbol.name}
            </span>
            <SymbolLines symbol={symbol} />
          </li>
        ))}
      </ul>
      {rest > 0 ? <p className="muted tiny">+{rest} más</p> : null}
    </div>
  );
}

/**
 * Lo que suma y resta un símbolo: `+10 −4`.
 *
 * Sin las fuentes con las que medir el cuerpo, el reporte trae el tamaño de
 * cada lado y se enseña eso: `22 → 26`. Nunca un cero de relleno.
 */
function SymbolLines({ symbol }: { symbol: ChangeSymbol }) {
  // Un reporte viejo puede traerlos sin definir: eso es «no medido», `null`.
  const added = symbol.addedLines ?? null;
  const removed = symbol.removedLines ?? null;

  if (added !== null || removed !== null) {
    if (!added && !removed) return <span className="mono symbol-delta">±0</span>;
    return (
      <span className="symbol-lines">
        {added ? (
          <span className="mono symbol-delta is-positive">+{added}</span>
        ) : null}
        {removed ? (
          <span className="mono symbol-delta is-negative">−{removed}</span>
        ) : null}
      </span>
    );
  }

  const before = symbol.base?.lines ?? null;
  const after = symbol.head?.lines ?? null;
  if (before === null && after === null) return null;
  return (
    <span className="mono symbol-delta">
      {before ?? "?"} → {after ?? "?"}
    </span>
  );
}

/**
 * La vista de diferencias de un fichero, pedida al abrir.
 *
 * No viaja en el reporte: el diff entero de cada fichero lo inflaría para
 * alguien que no lo abre. Se pide una vez y se queda montada mientras la fila
 * esté abierta.
 */
function FileDiffRows({
  path,
  load
}: {
  path: string;
  load: (path: string) => Promise<FileDiffView | null>;
}) {
  const [diff, setDiff] = useState<FileDiffView | null | "error">(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await load(path);
        if (!cancelled) setDiff(loaded ?? "error");
      } catch {
        if (!cancelled) setDiff("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, load]);

  if (diff === "error") {
    return (
      <div className="file-diff-view">
        <p className="muted tiny">No se pudo leer el diff de este fichero.</p>
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="file-diff-view">
        <p className="muted tiny">Leyendo el diff…</p>
      </div>
    );
  }

  return (
    <div className="file-diff-view">
      <div className="file-symbols-head">
        <span className="muted tiny">Diffs</span>
        {/* Un fichero sin medir no enseña cifras: el tamaño del fichero no es
            lo que cambió. La nota de abajo dice por qué. */}
        {diff.added !== null && diff.added > 0 ? (
          <span className="mono symbol-delta is-positive">+{diff.added}</span>
        ) : null}
        {diff.removed !== null && diff.removed > 0 ? (
          <span className="mono symbol-delta is-negative">−{diff.removed}</span>
        ) : null}
      </div>

      <div className="diff-body">
        {diff.rows.map((row, index) =>
          row.type === "gap" ? (
            <div className="diff-gap" key={`gap-${index}`}>
              ⋯
            </div>
          ) : (
            <div className={`diff-line is-${row.type}`} key={index}>
              <span className="diff-num">{row.baseLine ?? ""}</span>
              <span className="diff-num">{row.headLine ?? ""}</span>
              <span className="diff-sign">
                {row.type === "add" ? "+" : row.type === "del" ? "−" : ""}
              </span>
              <span className="diff-text">{row.text}</span>
            </div>
          )
        )}
      </div>

      {diff.truncated ? (
        <p className="muted tiny">El fichero es demasiado grande: la vista va recortada.</p>
      ) : null}
    </div>
  );
}
