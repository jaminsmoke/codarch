import { useCallback } from "react";
import type { CcMigrationLens, CcStats } from "@codarch/schema/browser";
import type { RenderModel } from "@codarch/render/browser";
import {
  type InspectorTab,
  type ViewState as AppViewState
} from "../viewState";
import { planViewState } from "./applyView";
import { metricCoverage } from "./snapshotView";

/**
 * Aplica un estado de vista al mapa.
 *
 * Lo usan la URL de la web y las vistas guardadas de un addon (ADR 0029):
 * las dos hablan el mismo dialecto. El plan dice qué encaja con este mapa y
 * qué se ignora en silencio; aquí solo se obedece.
 */
export function useApplyView(options: {
  model: RenderModel | null;
  stats: CcStats | null;
  migration: CcMigrationLens | null;
  setAreaMetric: (metric: string | null) => void;
  setColorMode: (mode: string) => void;
  setFocusPath: (path: string | null) => void;
  setTab: (tab: InspectorTab) => void;
  setShowLabels: (show: boolean) => void;
  selectIndex: (index: number) => void;
  selectFolder: (path: string) => void;
  openFileAt: (path: string) => void;
  openSymbolChain: (name: string, path: string) => void | Promise<void>;
}): (wanted: AppViewState) => void {
  const {
    model,
    stats,
    migration,
    setAreaMetric,
    setColorMode,
    setFocusPath,
    setTab,
    setShowLabels,
    selectIndex,
    selectFolder,
    openFileAt,
    openSymbolChain
  } = options;

  return useCallback(
    (wanted: AppViewState) => {
      if (!model || !stats) return;
      const plan = planViewState(wanted, {
        model,
        coverage: metricCoverage(stats),
        migration
      });
      if (plan.areaMetric !== null) setAreaMetric(plan.areaMetric);
      if (plan.colorMode !== null) setColorMode(plan.colorMode);
      if (plan.focusPath !== null) setFocusPath(plan.focusPath);
      if (plan.folderPath !== null) selectFolder(plan.folderPath);
      if (plan.fileIndex !== null) selectIndex(plan.fileIndex);
      if (plan.openFilePath !== null) openFileAt(plan.openFilePath);
      if (plan.tab !== null) setTab(plan.tab);
      if (plan.showLabels !== null) setShowLabels(plan.showLabels);
      if (plan.symbol) void openSymbolChain(plan.symbol.name, plan.symbol.path);
    },
    [
      model,
      stats,
      migration,
      selectIndex,
      selectFolder,
      openFileAt,
      openSymbolChain,
      setAreaMetric,
      setColorMode,
      setFocusPath,
      setTab,
      setShowLabels
    ]
  );
}