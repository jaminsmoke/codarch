import { useCallback, type MutableRefObject } from "react";
import type { CcJson } from "@codarch/schema/browser";
import type { SymbolChain } from "@codarch/schema/browser";
import type { ViewPreferences } from "../storage";
import { planMapSwitch } from "./snapshotView";
import type { MapId } from "./types";

/**
 * Cambia de mapa: el del código o el del resto (ADR 0093).
 *
 * Es un cambio de modelo, no de vista. La selección, el foco y el fichero
 * abierto son del mapa anterior y se sueltan; el área y el color también son
 * de cada mapa, así que al volver al código se recuperan los suyos. El resto
 * se mide en bytes y se pinta por tipo (ADR 0093).
 */
export function useChangeMap(options: {
  map: MapId;
  cc: CcJson | null;
  rest: CcJson | null;
  preferencesRef: MutableRefObject<ViewPreferences | null | undefined>;
  selectedPathRef: MutableRefObject<string | null>;
  setMapView: (map: MapId) => void;
  setAreaMetric: (metric: string | null) => void;
  setColorMode: (mode: string) => void;
  setPluginView: (view: string | null) => void;
  setSelectedIndex: (index: number | null) => void;
  setSelectedFolder: (path: string | null) => void;
  setFocusPath: (path: string | null) => void;
  setOpenFile: (path: string | null) => void;
  setChain: (chain: SymbolChain | null) => void;
}): (next: MapId) => void {
  const {
    map,
    cc,
    rest,
    preferencesRef,
    selectedPathRef,
    setMapView,
    setAreaMetric,
    setColorMode,
    setPluginView,
    setSelectedIndex,
    setSelectedFolder,
    setFocusPath,
    setOpenFile,
    setChain
  } = options;

  return useCallback(
    (next: MapId) => {
      const plan = planMapSwitch({
        next,
        current: map,
        cc,
        rest,
        preferences: preferencesRef.current
      });
      if (plan.kind !== "switch") return;
      setPluginView(null);
      setSelectedIndex(null);
      setSelectedFolder(null);
      setFocusPath(null);
      setOpenFile(null);
      setChain(null);
      selectedPathRef.current = null;
      setMapView(plan.map);
      setAreaMetric(plan.areaMetric);
      setColorMode(plan.colorMode);
    },
    [
      map,
      rest,
      cc,
      preferencesRef,
      selectedPathRef,
      setAreaMetric,
      setChain,
      setColorMode,
      setFocusPath,
      setMapView,
      setOpenFile,
      setPluginView,
      setSelectedFolder,
      setSelectedIndex
    ]
  );
}