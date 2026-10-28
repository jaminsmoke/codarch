import { useCallback, useState } from "react";

/** El mínimo y el máximo de zoom: por debajo del mapa no se lee, por encima sobra. */
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

/**
 * La cámara del mapa: el zoom, el centro y los tres gestos que los mueven.
 *
 * Vive aquí porque los tres son la misma cuenta —qué se ve del mapa— y porque
 * el hook de la app no tiene por qué saber de factores ni de bordes. El zoom
 * nunca baja de 1: el mapa no se aleja de su marco.
 */
export function useMapCamera() {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 });

  const zoomAt = useCallback(
    (factor: number, at?: { x: number; y: number }) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
      if (next === zoom) return;
      if (at) {
        const dx = at.x - center.x;
        const dy = at.y - center.y;
        const scale = 1 - next / zoom;
        setCenter({
          x: Math.min(1, Math.max(0, center.x + dx * scale)),
          y: Math.min(1, Math.max(0, center.y + dy * scale))
        });
      }
      setZoom(next);
    },
    [zoom, center]
  );

  /** Mueve el mapa sin salirse de lo que el zoom deja ver. */
  const panMap = useCallback(
    (dx: number, dy: number) => {
      setCenter((current) => {
        const hidden = 1 - 1 / zoom;
        if (hidden <= 0.001) return current;
        return {
          x: Math.min(1, Math.max(0, current.x - dx / hidden)),
          y: Math.min(1, Math.max(0, current.y - dy / hidden))
        };
      });
    },
    [zoom]
  );

  const fitMap = useCallback(() => {
    setZoom(MIN_ZOOM);
    setCenter({ x: 0.5, y: 0.5 });
  }, []);

  return { zoom, center, setZoom, setCenter, zoomAt, panMap, fitMap };
}
