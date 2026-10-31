import { useEffect, useState } from "react";
import type { RenderModel } from "@codarch/render/browser";
import type { SymbolChain } from "@codarch/schema/browser";
import {
  buildSearch,
  type InspectorTab,
  type ViewState as UrlViewState
} from "@codarch/ui";

/**
 * Aplica el estado de vista de la URL una sola vez, cuando ya hay modelo.
 */
export function useApplyUrlOnce(options: {
  view: { model: RenderModel | null };
  stats: unknown;
  urlView: UrlViewState;
  applyView: (wanted: UrlViewState) => void;
}): boolean {
  const { view, stats, urlView, applyView } = options;
  const [urlApplied, setUrlApplied] = useState(false);

  useEffect(() => {
    if (urlApplied || !view.model || !stats) return;
    applyView(urlView);
    // El flag es del arranque: la URL se aplica una sola vez.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- aplicar la URL es un efecto externo
    setUrlApplied(true);
  }, [urlApplied, view.model, stats, applyView, urlView]);

  return urlApplied;
}

/**
 * La URL refleja la vista actual: el enlace se puede compartir tal cual.
 */
export function useSyncUrl(options: {
  urlApplied: boolean;
  view: { model: RenderModel | null };
  areaMetric: string | null;
  colorMode: string;
  focusPath: string | null;
  selectedIndex: number | null;
  selectedFolder: string | null;
  openFile: string | null;
  tab: InspectorTab;
  chain: SymbolChain | null;
  showLabels: boolean;
  sourceUrl: string | null;
  reportUrl: string | null;
}): void {
  const {
    urlApplied,
    view,
    areaMetric,
    colorMode,
    focusPath,
    selectedIndex,
    selectedFolder,
    openFile,
    tab,
    chain,
    showLabels,
    sourceUrl,
    reportUrl
  } = options;

  useEffect(() => {
    if (!urlApplied || !view.model || typeof window === "undefined") return;
    const file =
      selectedIndex === null ? undefined : view.model.files[selectedIndex];
    const search = buildSearch(
      {
        areaMetric,
        colorMode,
        focusPath,
        filePath: file?.path ?? null,
        folderPath: selectedFolder,
        openFilePath: openFile,
        tab,
        symbolName: chain?.name ?? null,
        showLabels
      },
      { snapshotUrl: sourceUrl, reportUrl }
    );
    if (search === window.location.search) return;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search}${window.location.hash}`
    );
  }, [
    urlApplied,
    view.model,
    areaMetric,
    colorMode,
    focusPath,
    selectedIndex,
    selectedFolder,
    openFile,
    tab,
    chain,
    showLabels,
    sourceUrl,
    reportUrl
  ]);
}