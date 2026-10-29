import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject
} from "react";
import { nextCell, type CellBox, type CellTarget, type Direction } from "./navigation";

/**
 * Lo que el mapa hace con el ratón y el teclado.
 *
 * Tres estados independientes, uno por pieza: el tamaño del marco, el arrastre
 * con el botón derecho y el cursor de teclado. `MapCanvas` solo los compone, y
 * las reglas —cuándo se mueve el foco, cuándo se arrastra el mapa— se leen aquí
 * sin SVG de por medio.
 */

export interface MapSize {
  width: number;
  height: number;
}

const ARROW_DIRECTIONS: Record<string, Direction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down"
};

/**
 * El tamaño del marco, medido.
 *
 * Se mide al montar (para que el primer dibujado ya sea del tamaño correcto),
 * se observa el marco y se vuelve a medir al redimensionar la ventana. Con las
 * tres, el mapa nunca se dibuja a la escala equivocada.
 */
export function useMapSize(
  containerRef: RefObject<HTMLElement | null>,
  fallback: MapSize
): MapSize {
  const [size, setSize] = useState<MapSize>(fallback);

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
  }, [containerRef]);

  return size;
}

/** El arrastre del mapa, ya en handlers del `<svg>`. */
export interface PanHandlers {
  onPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerUp: (event: ReactPointerEvent<SVGSVGElement>) => void;
}

/**
 * El pan: con el botón derecho apretado.
 *
 * Los movimientos se agrupan en un fotograma: mover el ratón dispara decenas de
 * eventos por segundo y el mapa no necesita más de uno por dibujado.
 */
export function useMapPan(onPan: (dx: number, dy: number) => void): PanHandlers {
  const start = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef(0);
  const delta = useRef({ x: 0, y: 0 });

  useEffect(() => {
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  const flush = useCallback((): void => {
    frame.current = 0;
    const { x, y } = delta.current;
    delta.current = { x: 0, y: 0 };
    onPan(x, y);
  }, [onPan]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>): void => {
      if (event.button !== 2) return;
      event.preventDefault();
      start.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    []
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>): void => {
      const origin = start.current;
      if (!origin) return;
      const width = event.currentTarget.clientWidth || 1;
      const height = event.currentTarget.clientHeight || 1;
      delta.current.x += (event.clientX - origin.x) / width;
      delta.current.y += (event.clientY - origin.y) / height;
      origin.x = event.clientX;
      origin.y = event.clientY;
      if (frame.current) return;
      frame.current = requestAnimationFrame(flush);
    },
    [flush]
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>): void => {
      start.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    []
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}

export interface CursorOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  /** Las celdas del mapa, en orden de dibujado. */
  targets: readonly CellBox[];
  targetMeta: Map<string, CellTarget>;
  selectedIndex: number | null;
  selectedFolder: string | null;
  onSelect: (index: number) => void;
  onSelectFolder: (path: string) => void;
  onOpenFile: (index: number) => void;
  onFocusFolder: (path: string) => void;
}

export interface CursorHandlers {
  /** La celda que lleva el tab stop del mapa. */
  activeKey: string | null;
  /** El cursor pasa a una celda: lo usa el foco, también con el ratón. */
  onCursor: (key: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<SVGSVGElement>) => void;
  onBlur: (event: ReactFocusEvent<HTMLDivElement>) => void;
}

/**
 * El tab stop del mapa.
 *
 * Lo seleccionado —un fichero o una carpeta (ADR 0092)— puede no estar
 * dibujado (a nivel de carpeta), así que el tab stop cae en la primera celda
 * visible.
 */
function tabStopFor(
  selectedKey: string | null,
  targetMeta: Map<string, CellTarget>,
  targets: readonly CellBox[]
): string | null {
  if (selectedKey && targetMeta.has(selectedKey)) return selectedKey;
  return targets[0]?.key ?? null;
}

/**
 * El cursor de teclado: por dónde va el usuario, al margen de la selección.
 *
 * El foco solo se mueve si el cambio vino de las flechas. Con el ratón no se
 * roba el foco: el clic ya lo dejó donde toca.
 */
export function useMapCursor(options: CursorOptions): CursorHandlers {
  const {
    containerRef,
    targets,
    targetMeta,
    selectedIndex,
    selectedFolder,
    onSelect,
    onSelectFolder,
    onOpenFile,
    onFocusFolder
  } = options;
  const [cursor, setCursor] = useState<string | null>(null);
  const pendingFocusRef = useRef(false);

  const selectedKey =
    selectedIndex !== null
      ? `f:${selectedIndex}`
      : selectedFolder !== null
        ? `d:${selectedFolder}`
        : null;
  const activeKey = cursor ?? tabStopFor(selectedKey, targetMeta, targets);

  useEffect(() => {
    if (!pendingFocusRef.current || !cursor) return;
    pendingFocusRef.current = false;
    const node = containerRef.current?.querySelector(
      `[data-cell-key="${cursor}"]`
    );
    // Las celdas son elementos SVG: no son HTMLElement.
    if (node instanceof SVGElement) node.focus();
  }, [containerRef, cursor, targets]);

  const moveTo = useCallback(
    (direction: Direction, event: ReactKeyboardEvent<SVGSVGElement>): void => {
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
    },
    [cursor, targets]
  );

  /**
   * `Enter` entra en la celda y `Espacio` la selecciona (ADR 0092).
   *
   * Entrar es lo mismo que el doble clic: en un fichero, su código; en una
   * carpeta, el zoom. Seleccionar es lo mismo que el clic: la ficha cambia de
   * sujeto sin mover el mapa. Las flechas siguen moviendo el cursor.
   */
  const activate = useCallback(
    (event: ReactKeyboardEvent<SVGSVGElement>, enter: boolean): void => {
      const target = cursor ? targetMeta.get(cursor) : undefined;
      if (!target) return;
      event.preventDefault();
      if (target.kind === "file" && target.fileIndex !== undefined) {
        if (enter) onOpenFile(target.fileIndex);
        else onSelect(target.fileIndex);
        return;
      }
      if (!target.path) return;
      if (enter) onFocusFolder(target.path);
      else onSelectFolder(target.path);
    },
    [cursor, onFocusFolder, onOpenFile, onSelect, onSelectFolder, targetMeta]
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGSVGElement>): void => {
      const direction = ARROW_DIRECTIONS[event.key];
      if (direction) {
        moveTo(direction, event);
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") return;
      activate(event, event.key === "Enter");
    },
    [activate, moveTo]
  );

  const onBlur = useCallback(
    (event: ReactFocusEvent<HTMLDivElement>): void => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        pendingFocusRef.current = false;
      }
    },
    []
  );

  return { activeKey, onCursor: setCursor, onKeyDown, onBlur };
}
