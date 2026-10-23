import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode
} from "react";
import type { CcMigrationLens } from "@codarch/schema/browser";
import {
  formatCompact,
  inkFor,
  layoutMap,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  type PlacedNode,
  type RenderFile,
  type RenderModel,
  type TreeNode
} from "@codarch/render/browser";
import { labelFor, STATUS_LABEL } from "./labels";
import { mapColorFor } from "./map";
import { nextCell, type CellBox, type Direction } from "./navigation";

const ARROW_DIRECTIONS: Record<string, Direction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down"
};

export function MapCanvas({
  model,
  roots,
  colorMode,
  migration,
  query,
  selectedIndex,
  onSelect,
  onFocusFolder,
  zoom,
  center,
  onZoomAt,
  showLabels,
  onPan
}: {
  model: RenderModel;
  roots: TreeNode[];
  colorMode: string;
  migration: CcMigrationLens | null;
  query: string;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onFocusFolder: (path: string) => void;
  /** El zoom del mapa (1 = el mapa entero) ✓. */
  zoom: number;
  /** El centro del rectángulo visible (0..1) ✓. */
  center: { x: number; y: number };
  /** Acercar o alejar, centrado en un punto (0..1) ✓. */
  onZoomAt: (factor: number, at?: { x: number; y: number }) => void;
  /** Si los bloques muestran su nombre aunque no quepa entero ✓. */
  showLabels: boolean;
  /** Mover el mapa, en fracciones de su tamaño ✓. */
  onPan: (dx: number, dy: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: VIEW_WIDTH, height: VIEW_HEIGHT });
  /**
   * El rectángulo visible, en coordenadas del mapa ✓.
   *
   * La distribución no cambia ✓ (sigue siendo la del marco ✓): lo que cambia
   * es el rectángulo visible ✓. Así el mapa se puede acercar sin recalcular
   * nada ✓.
   */
  // El pan: con el botón derecho apretado ✓.
  const panRef = useRef<{ x: number; y: number } | null>(null);

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

  /**
   * Celdas navegables: ficheros y carpetas sin contenido dibujado.
   *
   * Una carpeta con hijos es un contenedor, no una celda: ocupa el área de sus
   * hijos y no se puede "entrar" moviéndose a un lado. Las carpetas hoja sí:
   * en un repositorio grande el mapa se dibuja a nivel de carpeta.
   */
  const { targets, targetMeta } = useMemo(() => {
    const boxes: CellBox[] = [];
    const meta = new Map<
      string,
      { kind: "file" | "folder"; fileIndex?: number; path?: string }
    >();
    const walk = (nodes: PlacedNode[]): void => {
      for (const placedNode of nodes) {
        const { node, rect } = placedNode;
        if (node.kind === "file") {
          if (node.fileIndex === undefined) continue;
          const key = `f:${node.fileIndex}`;
          boxes.push({ key, x: rect.x, y: rect.y, w: rect.w, h: rect.h });
          meta.set(key, { kind: "file", fileIndex: node.fileIndex });
          continue;
        }
        const children = placedNode.children ?? [];
        if (children.length === 0) {
          boxes.push({ key: node.key, x: rect.x, y: rect.y, w: rect.w, h: rect.h });
          meta.set(node.key, { kind: "folder", path: node.path });
          continue;
        }
        walk(children);
      }
    };
    walk(placed);
    return { targets: boxes, targetMeta: meta };
  }, [placed]);

  /** Cursor de teclado: por dónde va el usuario, al margen de la selección. */
  const [cursor, setCursor] = useState<string | null>(null);
  const selectedKey = selectedIndex !== null ? `f:${selectedIndex}` : null;
  // El fichero seleccionado puede no estar dibujado (nivel de carpeta), así que
  // el tab stop cae en la primera celda visible.
  const activeKey =
    cursor ??
    (selectedKey && targetMeta.has(selectedKey)
      ? selectedKey
      : targets[0]?.key ?? null);

  /**
   * El foco solo se mueve si el cambio vino de las flechas. Con el ratón no se
   * roba el foco: el clic ya lo dejó donde toca.
   */
  const pendingFocusRef = useRef(false);

  useEffect(() => {
    if (!pendingFocusRef.current || !cursor) return;
    pendingFocusRef.current = false;
    const node = containerRef.current?.querySelector(`[data-cell-key="${cursor}"]`);
    // Las celdas son elementos SVG: no son HTMLElement.
    if (node instanceof SVGElement) node.focus();
  }, [cursor, targets]);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGSVGElement>) => {
      const direction = ARROW_DIRECTIONS[event.key];
      if (direction) {
        // Si el cursor todavía no existe, se sale de la celda que tiene el foco.
        const from =
          cursor ??
          (event.target as Element | null)?.getAttribute?.("data-cell-key") ??
          null;
        const next = nextCell(targets, from, direction);
        if (next === null || next === from) return;
        event.preventDefault();
        pendingFocusRef.current = true;
        setCursor(next);
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = cursor ? targetMeta.get(cursor) : undefined;
      if (!target) return;
      event.preventDefault();
      if (target.kind === "file" && target.fileIndex !== undefined) {
        onSelect(target.fileIndex);
        return;
      }
      if (target.path) onFocusFolder(target.path);
    },
    [cursor, onFocusFolder, onSelect, targetMeta, targets]
  );

  // El tamaño del marco, medido.
  //
  // Se mide al montar (para que el primer dibujado ya sea del tamaño
  // correcto ✓), se observa el marco ✓ y se mide también al redimensionar la
  // ventana ✓. Con las tres, el mapa nunca se dibuja a la escala equivocada ✓.
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = (): void => {
      const rect = element.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (width > 0 && height > 0) setSize({ width, height });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const metricIndex = useMemo(
    () => new Map(model.metrics.map((metric, index) => [metric.key, index])),
    [model.metrics]
  );

  const fillFor = (file: RenderFile): string =>
    mapColorFor(
      file,
      colorMode,
      model,
      migration,
      metricIndex
    );

  const renderNode = (placedNode: PlacedNode): ReactNode => {
    const { node, rect } = placedNode;

    if (node.kind === "file") {
      const file = node.fileIndex === undefined ? null : model.files[node.fileIndex];
      if (!file) return null;
      const fill = fillFor(file);
      const selected = selectedIndex === file.index;
      const matched = query === "" || file.path.toLowerCase().includes(query);
      // El nombre va DENTRO del bloque: el SVG envuelve y recorta ✓ y no
      // puede salirse por diseño ✓.
      const label = showLabels ? labelFor(rect.w, rect.h) : null;
      const migrationNode = migration?.nodes[file.nodeId];
      // El tooltip solo en las celdas con área legible: en un mapa grande cada
      // nodo cuenta, y 20.000 <title> son 20.000 nodos DOM de más.
      const withTitle = rect.w > 24 && rect.h > 10;

      // El texto va FUERA del rect: en SVG un <rect> no admite hijos, y
      // dentro se dibuja con tamaño cero (o sea: nunca se ve).
      return (
        <g key={node.key}>
          <rect
            className={`cell${activeKey === `f:${file.index}` ? " is-cursor" : ""}`}
            x={rect.x}
            y={rect.y}
            width={Math.max(1, rect.w)}
            height={Math.max(1, rect.h)}
            fill={fill}
            stroke={selected ? "#121a20" : "rgba(18,26,32,.26)"}
            strokeWidth={selected ? 2 : 0.55}
            opacity={matched ? 1 : 0.13}
            role="button"
            data-cell-key={`f:${file.index}`}
            data-file-index={file.index}
            tabIndex={activeKey === `f:${file.index}` ? 0 : -1}
            aria-label={file.path}
            onFocus={() => setCursor(`f:${file.index}`)}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(file.index);
            }}
          >
            {withTitle ? (
              <title>
                {`${file.path}\n${model.areaTitle}: ${formatCompact(file.actualArea)}` +
                  (migrationNode
                    ? `\n${STATUS_LABEL[migrationNode.status]} · deuda ${migrationNode.debt ?? 0} · FFI ${migrationNode.crossings}`
                    : "")}
              </title>
            ) : null}
          </rect>
          {label ? (
            <foreignObject
              x={rect.x}
              y={rect.y}
              width={Math.max(1, rect.w)}
              height={Math.max(1, rect.h)}
              pointerEvents="none"
            >
              <div
                className={`map-label${label.vertical ? " is-vertical" : ""}`}
                style={{ fontSize: label.size, color: inkFor(fill) }}
              >
                {file.name}
              </div>
            </foreignObject>
          ) : null}
        </g>
      );
    }

    // El nombre de la carpeta va dentro de su bloque, como el de un fichero.
    const folderLabel =
      placedNode.headerHeight > 0 || showLabels
        ? labelFor(rect.w, rect.h)
        : null;

    return (
      <g key={node.key}>
        <rect
          className={`folder-block${activeKey === node.key ? " is-cursor" : ""}`}
          x={rect.x}
          y={rect.y}
          width={Math.max(1, rect.w)}
          height={Math.max(1, rect.h)}
          fill="rgba(18,26,32,.022)"
          stroke="rgba(18,26,32,.25)"
          strokeWidth={0.7}
          role="button"
          data-cell-key={node.key}
          tabIndex={activeKey === node.key ? 0 : -1}
          aria-label={`Enfocar ${node.path}`}
          onFocus={() => setCursor(node.key)}
          onClick={(event) => {
            event.stopPropagation();
            onFocusFolder(node.path);
          }}
        />
        {folderLabel ? (
          <foreignObject
            x={rect.x}
            y={rect.y}
            width={Math.max(1, rect.w)}
            height={Math.max(1, rect.h)}
            pointerEvents="none"
          >
            <div
              className={`map-label is-folder${folderLabel.vertical ? " is-vertical" : ""}`}
              style={{ fontSize: folderLabel.size }}
            >
              {node.name.toUpperCase()}
            </div>
          </foreignObject>
        ) : null}
        {placedNode.headerHeight > 0 && rect.w > 34 ? (
          <rect
            x={rect.x}
            y={rect.y}
            width={Math.max(1, rect.w)}
            height={placedNode.headerHeight}
            fill="transparent"
            className="folder-hit"
            aria-label={`Enfocar ${node.path}`}
            onClick={(event) => {
              event.stopPropagation();
              onFocusFolder(node.path);
            }}
          />
        ) : null}
        {placedNode.children.map(renderNode)}
      </g>
    );
  };

  return (
    <div
      className="map-inner"
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          pendingFocusRef.current = false;
        }
      }}
    >
      <svg
        className="map"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        role="group"
        aria-label={`Mapa de arquitectura de ${model.meta.project}`}
        onKeyDown={onKeyDown}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          if (event.button !== 2) return;
          event.preventDefault();
          panRef.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = panRef.current;
          if (!start) return;
          const dx = (event.clientX - start.x) / (event.currentTarget.clientWidth || 1);
          const dy = (event.clientY - start.y) / (event.currentTarget.clientHeight || 1);
          start.x = event.clientX;
          start.y = event.clientY;
          onPan(dx, dy);
        }}
        onPointerUp={(event) => {
          panRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onWheel={(event) => {
          // La rueda acerca el mapa ✓ (la página ya no scrollea ✓).
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          onZoomAt(
            event.deltaY < 0 ? 1.12 : 1 / 1.12,
            {
              x: (event.clientX - bounds.left) / bounds.width,
              y: (event.clientY - bounds.top) / bounds.height
            }
          );
        }}
      >
        <defs>
          <pattern id="map-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="rgba(18,26,32,.045)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={size.width} height={size.height} fill="url(#map-grid)" />
        {placed.map(renderNode)}
      </svg>
    </div>
  );
}

