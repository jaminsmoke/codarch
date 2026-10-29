import { useMemo, useRef, type WheelEvent as ReactWheelEvent } from "react";
import type { CcMigrationLens } from "@codarch/schema/browser";
import {
  layoutMap,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  type RenderModel,
  type TreeNode
} from "@codarch/render/browser";
import { MapContent } from "./mapCells";
import { useMapCursor, useMapPan, useMapSize } from "./mapInteraction";
import { navigableCells } from "./navigation";

export interface MapCanvasProps {
  model: RenderModel;
  roots: TreeNode[];
  colorMode: string;
  migration: CcMigrationLens | null;
  query: string;
  selectedIndex: number | null;
  /** La carpeta seleccionada, si lo que está abierto es una (ADR 0092). */
  selectedFolder: string | null;
  onSelect: (index: number) => void;
  /** Clic en una carpeta: su ficha ocupa el panel. */
  onSelectFolder: (path: string) => void;
  /** Doble clic en un fichero del mapa (ADR 0087). */
  onOpenFile: (index: number) => void;
  /** Doble clic en una carpeta: el mapa la enfoca. */
  onFocusFolder: (path: string) => void;
  /** El zoom del mapa (1 = el mapa entero). */
  zoom: number;
  /** El centro del rectángulo visible (0..1). */
  center: { x: number; y: number };
  /** Acercar o alejar, centrado en un punto (0..1). */
  onZoomAt: (factor: number, at?: { x: number; y: number }) => void;
  /** Si los bloques muestran su nombre aunque no quepa entero. */
  showLabels: boolean;
  /** Mover el mapa, en fracciones de su tamaño. */
  onPan: (dx: number, dy: number) => void;
}

/**
 * El mapa: un treemap en SVG.
 *
 * El zoom no toca la distribución: el layout sigue siendo el del marco y lo que
 * cambia es el `viewBox`. Así acercar no recalcula nada y el contenido
 * memoizado no se vuelve a reconciliar en cada paso (eso vive en `mapCells`).
 *
 * Lo seleccionado puede ser un fichero o una carpeta (ADR 0092): el mapa pinta
 * las dos marcas y deja que el teclado entre y seleccione como el ratón.
 */
export function MapCanvas({
  model,
  roots,
  colorMode,
  migration,
  query,
  selectedIndex,
  selectedFolder,
  onSelect,
  onSelectFolder,
  onOpenFile,
  onFocusFolder,
  zoom,
  center,
  onZoomAt,
  showLabels,
  onPan
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useMapSize(containerRef, {
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT
  });

  const viewBox = useMemo(() => {
    const width = size.width / zoom;
    const height = size.height / zoom;
    return {
      x: (size.width - width) * center.x,
      y: (size.height - height) * center.y,
      width,
      height
    };
  }, [size, zoom, center]);

  const placed = useMemo(
    () => layoutMap(roots, size.width, size.height),
    [roots, size.width, size.height]
  );

  const { targets, targetMeta } = useMemo(() => navigableCells(placed), [placed]);

  const cursor = useMapCursor({
    containerRef,
    targets,
    targetMeta,
    selectedIndex,
    selectedFolder,
    onSelect,
    onSelectFolder,
    onOpenFile,
    onFocusFolder
  });
  const pan = useMapPan(onPan);

  const onWheel = (event: ReactWheelEvent<SVGSVGElement>): void => {
    // La rueda acerca el mapa (la página ya no scrollea).
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    onZoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, {
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height
    });
  };

  return (
    <div className="map-inner" ref={containerRef} onBlur={cursor.onBlur}>
      <svg
        className="map"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        role="group"
        aria-label={`Mapa de arquitectura de ${model.meta.project}`}
        onKeyDown={cursor.onKeyDown}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={pan.onPointerDown}
        onPointerMove={pan.onPointerMove}
        onPointerUp={pan.onPointerUp}
        onWheel={onWheel}
      >
        <defs>
          <pattern id="map-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="var(--grid-line)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={size.width} height={size.height} fill="url(#map-grid)" />
        <MapContent
          placed={placed}
          model={model}
          colorMode={colorMode}
          migration={migration}
          query={query}
          selectedIndex={selectedIndex}
          selectedFolder={selectedFolder}
          activeKey={cursor.activeKey}
          showLabels={showLabels}
          onSelect={onSelect}
          onSelectFolder={onSelectFolder}
          onOpenFile={onOpenFile}
          onFocusFolder={onFocusFolder}
          onCursor={cursor.onCursor}
        />
      </svg>
    </div>
  );
}
