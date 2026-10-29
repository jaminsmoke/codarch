import { memo, useMemo, type ReactNode } from "react";
import type { CcMigrationLens } from "@codarch/schema/browser";
import {
  formatCompact,
  inkFor,
  type PlacedNode,
  type RenderFile,
  type RenderModel
} from "@codarch/render/browser";
import { labelFor, STATUS_LABEL } from "./labels";
import { mapColorFor, metricIndexOf } from "./map";

/**
 * Las celdas del mapa.
 *
 * El mapa es un treemap: cada nodo es un bloque de color con su nombre dentro.
 * Aquí vive cómo se pinta un bloque —fichero o carpeta—; el tamaño del marco,
 * el zoom, el pan y el teclado son de `MapCanvas`. Separarlo deja piezas que se
 * leen enteras de un vistazo en vez de una función recursiva que hace de todo.
 *
 * El gesto es el mismo para un fichero y para una carpeta (ADR 0092): un clic
 * selecciona —la ficha cambia de sujeto— y un doble clic entra, que en un
 * fichero es abrir su código y en una carpeta es el zoom.
 */

/** Lo que una celda necesita para pintarse; baja igual por todo el árbol. */
interface CellContext {
  model: RenderModel;
  colorMode: string;
  migration: CcMigrationLens | null;
  query: string;
  selectedIndex: number | null;
  selectedFolder: string | null;
  activeKey: string | null;
  showLabels: boolean;
  metricIndex: Map<string, number>;
  onSelect: (index: number) => void;
  onSelectFolder: (path: string) => void;
  onOpenFile: (index: number) => void;
  onFocusFolder: (path: string) => void;
  onCursor: (key: string) => void;
}

interface CellProps {
  placed: PlacedNode;
  context: CellContext;
}

interface MapContentProps {
  placed: PlacedNode[];
  model: RenderModel;
  colorMode: string;
  migration: CcMigrationLens | null;
  query: string;
  selectedIndex: number | null;
  selectedFolder: string | null;
  activeKey: string | null;
  showLabels: boolean;
  onSelect: (index: number) => void;
  /** Clic en una carpeta: su ficha ocupa el panel (ADR 0092). */
  onSelectFolder: (path: string) => void;
  /** Doble clic en un fichero: su código ocupa el escenario (ADR 0087). */
  onOpenFile: (index: number) => void;
  /** Doble clic en una carpeta: el mapa la enfoca. */
  onFocusFolder: (path: string) => void;
  onCursor: (key: string) => void;
}

/** La clave con la que se mueve el foco y se marca el cursor. */
function cellKey(index: number): string {
  return `f:${index}`;
}

/** El fichero de una celda, si el layout lo dejó a la vista. */
function fileFor(
  placed: PlacedNode,
  model: RenderModel
): RenderFile | null {
  const index = placed.node.fileIndex;
  if (index === undefined) return null;
  return model.files[index] ?? null;
}

/** Si la celda entra en la búsqueda; sin búsqueda, todas. */
function matchesQuery(path: string, query: string): boolean {
  return query === "" || path.toLowerCase().includes(query);
}

/**
 * El tooltip de una celda: ruta, área y, si hay lente, su deuda.
 *
 * El tooltip solo se pide en las celdas con área legible: en un mapa grande
 * cada nodo cuenta, y 20.000 `<title>` son 20.000 nodos DOM de más.
 */
function fileTitle(
  file: RenderFile,
  model: RenderModel,
  migration: CcMigrationLens | null
): string {
  const head = `${file.path}\n${model.areaTitle}: ${formatCompact(file.actualArea)}`;
  const node = migration?.nodes[file.nodeId];
  if (!node) return head;
  return `${head}\n${STATUS_LABEL[node.status]} · deuda ${node.debt ?? 0} · FFI ${node.crossings}`;
}

/**
 * El nombre de una celda, dentro de su bloque.
 *
 * Va en un `<foreignObject>` porque el SVG no envuelve texto: así el nombre se
 * recorta con el bloque en vez de salirse. El de una carpeta es el mismo, en
 * mayúsculas y sin tinta propia.
 */
function CellLabel({
  rect,
  variant,
  vertical,
  size,
  colour,
  children
}: {
  rect: PlacedNode["rect"];
  variant: "file" | "folder";
  vertical: boolean;
  size: number;
  colour?: string;
  children: ReactNode;
}) {
  const className = `map-label${variant === "folder" ? " is-folder" : ""}${
    vertical ? " is-vertical" : ""
  }`;
  return (
    <foreignObject
      x={rect.x}
      y={rect.y}
      width={Math.max(1, rect.w)}
      height={Math.max(1, rect.h)}
      pointerEvents="none"
    >
      <div className={className} style={{ fontSize: size, color: colour }}>
        {children}
      </div>
    </foreignObject>
  );
}

/** Un fichero: su bloque, su nombre dentro y, si cabe, su tooltip. */
function FileCell({ placed, context }: CellProps) {
  const { rect } = placed;
  const file = fileFor(placed, context.model);
  if (!file) return null;

  const key = cellKey(file.index);
  const selected = context.selectedIndex === file.index;
  const matched = matchesQuery(file.path, context.query);
  // El nombre va DENTRO del bloque: el SVG envuelve y recorta y no puede
  // salirse por diseño.
  const label = context.showLabels ? labelFor(rect.w, rect.h) : null;
  const withTitle = rect.w > 24 && rect.h > 10;
  const fill = mapColorFor(
    file,
    context.colorMode,
    context.model,
    context.migration,
    context.metricIndex
  );

  // El texto va FUERA del rect: en SVG un <rect> no admite hijos, y dentro se
  // dibuja con tamaño cero (o sea: nunca se ve).
  return (
    <g>
      <rect
        className={`cell${context.activeKey === key ? " is-cursor" : ""}`}
        x={rect.x}
        y={rect.y}
        width={Math.max(1, rect.w)}
        height={Math.max(1, rect.h)}
        fill={fill}
        stroke={selected ? "var(--cell-ink)" : "var(--cell-edge)"}
        strokeWidth={selected ? 2 : 0.55}
        opacity={matched ? 1 : 0.13}
        role="button"
        data-cell-key={key}
        data-file-index={file.index}
        tabIndex={context.activeKey === key ? 0 : -1}
        aria-label={file.path}
        onFocus={() => context.onCursor(key)}
        onClick={(event) => {
          event.stopPropagation();
          context.onSelect(file.index);
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          context.onOpenFile(file.index);
        }}
      >
        {withTitle ? (
          <title>{fileTitle(file, context.model, context.migration)}</title>
        ) : null}
      </rect>
      {label ? (
        <CellLabel
          rect={rect}
          variant="file"
          vertical={label.vertical}
          size={label.size}
          colour={inkFor(fill)}
        >
          {file.name}
        </CellLabel>
      ) : null}
    </g>
  );
}

/** Una carpeta: su marco, su cabecera y, dentro, sus celdas. */
function FolderCell({ placed, context }: CellProps) {
  const { node, rect, headerHeight } = placed;
  // El nombre de la carpeta va dentro de su bloque, como el de un fichero.
  const label =
    headerHeight > 0 || context.showLabels ? labelFor(rect.w, rect.h) : null;
  const selected = context.selectedFolder === node.path;

  const selectFolder = (event: { stopPropagation: () => void }): void => {
    event.stopPropagation();
    context.onSelectFolder(node.path);
  };

  const focusFolder = (event: { stopPropagation: () => void }): void => {
    event.stopPropagation();
    context.onFocusFolder(node.path);
  };

  return (
    <g>
      <rect
        className={`folder-block${
          context.activeKey === node.key ? " is-cursor" : ""
        }${selected ? " is-selected" : ""}`}
        x={rect.x}
        y={rect.y}
        width={Math.max(1, rect.w)}
        height={Math.max(1, rect.h)}
        fill="var(--folder-fill)"
        stroke={selected ? "var(--cell-ink)" : "var(--folder-edge)"}
        strokeWidth={selected ? 2.5 : 0.7}
        role="button"
        data-cell-key={node.key}
        tabIndex={context.activeKey === node.key ? 0 : -1}
        aria-label={`Seleccionar ${node.path}`}
        onFocus={() => context.onCursor(node.key)}
        onClick={selectFolder}
        onDoubleClick={focusFolder}
      />
      {label ? (
        <CellLabel
          rect={rect}
          variant="folder"
          vertical={label.vertical}
          size={label.size}
        >
          {node.name.toUpperCase()}
        </CellLabel>
      ) : null}
      {headerHeight > 0 && rect.w > 34 ? (
        <rect
          x={rect.x}
          y={rect.y}
          width={Math.max(1, rect.w)}
          height={headerHeight}
          fill="transparent"
          className="folder-hit"
          aria-label={`Seleccionar ${node.path}`}
          onClick={selectFolder}
          onDoubleClick={focusFolder}
        />
      ) : null}
      {placed.children.map((child) => (
        <MapCell key={child.node.key} placed={child} context={context} />
      ))}
    </g>
  );
}

/** Un nodo dibujado: fichero o carpeta, según lo que traiga el layout. */
function MapCell({ placed, context }: CellProps) {
  return placed.node.kind === "file" ? (
    <FileCell placed={placed} context={context} />
  ) : (
    <FolderCell placed={placed} context={context} />
  );
}

/**
 * El contenido del mapa, memoizado.
 *
 * `zoom` y `center` no entran aquí: acercar o mover el mapa solo cambia el
 * `viewBox` del SVG. Si el contenido dependiera del zoom, cada paso volvería a
 * reconciliar cientos de `<rect>` y `<foreignObject>` y el mapa se atascaría
 * en repos grandes.
 */
export const MapContent = memo(function MapContent({
  placed,
  model,
  colorMode,
  migration,
  query,
  selectedIndex,
  selectedFolder,
  activeKey,
  showLabels,
  onSelect,
  onSelectFolder,
  onOpenFile,
  onFocusFolder,
  onCursor
}: MapContentProps) {
  const metricIndex = useMemo(() => metricIndexOf(model), [model]);
  const context: CellContext = {
    model,
    colorMode,
    migration,
    query,
    selectedIndex,
    selectedFolder,
    activeKey,
    showLabels,
    metricIndex,
    onSelect,
    onSelectFolder,
    onOpenFile,
    onFocusFolder,
    onCursor
  };

  return (
    <>
      {placed.map((child) => (
        <MapCell key={child.node.key} placed={child} context={context} />
      ))}
    </>
  );
});
