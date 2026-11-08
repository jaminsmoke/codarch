import { useId, useState } from "react";
import type { HistoryEntry } from "@codarch/schema/browser";
import type { CodarchApp } from "../app/types";
import { Inspector } from "../panels";
import { FolderPanel } from "../panels/FolderPanel";
import { ProjectPanel } from "../panels/ProjectPanel";
import ChangesPanel, { reportHasChanges } from "../ChangesPanel";
import {
  InspectorBar,
  inspectorLabel,
  type InspectorLintMarks
} from "../InspectorBar";
import { lintBarMark, lintTotals } from "../lintRollup";
import { toggleInspector, type InspectorTab } from "../viewState";
import { localStore } from "../storage-local";
import { readSectionClosed, writeSectionClosed } from "../sections";

/**
 * El dock del inspector: la ficha del fichero, la de la carpeta, la del
 * proyecto o los cambios.
 *
 * Cuatro hojas y cuatro entradas en la barra de actividad (ADR 0092 · ADR
 * 0095): cada objeto tiene la suya, no una hoja que cambia de sujeto.
 *
 * Se pliega desde su entrada abierta, con el mismo gesto y la misma memoria
 * que el dock de herramientas (ADR 0079 · ADR 0083). Ese estado vive aquí
 * porque es del dock: la app solo dice qué pestaña está activa.
 */
export function InspectorDock({
  app,
  onOpenHistory,
  onLoadReport
}: {
  app: CodarchApp;
  onOpenHistory: (entry: HistoryEntry) => void;
  onLoadReport: () => void;
}) {
  const inspectorId = useId();
  const [inspectorClosed, setInspectorClosed] = useState(() =>
    readSectionClosed(localStore(), "inspector-dock", false)
  );

  const { state, actions, view, migration } = app;
  const {
    selectedFile,
    selectedFolderNode,
    selectedMigration,
    selectedSymbols,
    selectedStructure,
    metricTitle,
    selectPath,
    closeFile,
    loadHistory,
    loadDiff
  } = app;
  const report = state.report;

  const selectInspectorTab = (next: InspectorTab) => {
    const result = toggleInspector(state.tab, inspectorClosed, next);
    actions.setTab(result.tab);
    if (result.closed !== inspectorClosed) {
      writeSectionClosed(localStore(), "inspector-dock", result.closed);
      setInspectorClosed(result.closed);
    }
  };

  const selectInPlace = (path: string) => {
    const index =
      view.model?.files.findIndex((file) => file.path === path) ?? -1;
    if (index >= 0) actions.selectIndex(index);
    closeFile();
  };

  // En el mapa de código, la ficha lista hallazgos. En el de documentos,
  // el mismo hueco enseña el catálogo de reglas activas del código.
  const rulesMode = state.map === "rest";
  const lintView = rulesMode ? "catalog" : "findings";
  const sectionLint = state.lint;
  const markOf = (path: string) => {
    if (rulesMode) return null;
    const totals = lintTotals(sectionLint, path);
    if (!totals || totals.findings === 0) return null;
    return lintBarMark(totals);
  };
  const lintMarks: InspectorLintMarks = {};
  const fileMark = selectedFile ? markOf(selectedFile.path) : null;
  if (fileMark) lintMarks.file = fileMark;
  const folderMark = selectedFolderNode ? markOf(selectedFolderNode.path) : null;
  if (folderMark) lintMarks.folder = folderMark;
  const projectMark = markOf("");
  if (projectMark) lintMarks.project = projectMark;

  return (
    <div className={`inspector-dock${inspectorClosed ? " is-folded" : ""}`}>
      <aside
        className="inspector"
        id={inspectorId}
        aria-label={inspectorLabel(state.tab)}
        aria-hidden={inspectorClosed}
        inert={inspectorClosed}
      >
        {state.tab === "file" ? (
          <Inspector
            model={view.model}
            file={selectedFile}
            migrationNode={selectedMigration}
            areaMetric={state.areaMetric}
            colorMode={state.colorMode}
            metricTitle={metricTitle}
            symbols={selectedSymbols}
            structure={selectedStructure}
            chain={state.chain}
            lint={sectionLint}
            lintView={lintView}
            migration={migration}
            showCode={state.map === "code"}
            onSelectSymbol={(name) => {
              void actions.openSymbolChain(name, selectedFile?.path ?? "");
            }}
            onLoadCode={actions.readCode}
            onOpenEditor={actions.openInEditor}
            onSelectPath={selectInPlace}
            onColorMode={actions.setColorMode}
            onLintRule={actions.setLintRule}
            onListRules={actions.listLintRules}
            canEditLint={app.canEditLint}
          />
        ) : state.tab === "folder" ? (
          <FolderPanel
            folder={selectedFolderNode}
            model={view.model}
            lint={sectionLint}
            lintView={lintView}
            rulesMode={rulesMode}
            changes={report?.files ?? null}
            metricTitle={metricTitle}
            colorMode={state.colorMode}
            onColorMode={actions.setColorMode}
            onSelectPath={selectInPlace}
            onSelectFolder={actions.selectFolder}
            onScopeChanges={actions.scopeChanges}
            onLintRule={actions.setLintRule}
            onListRules={actions.listLintRules}
            canEditLint={app.canEditLint}
          />
        ) : state.tab === "project" ? (
          <ProjectPanel
            model={view.model}
            lint={sectionLint}
            lintView={lintView}
            rulesMode={rulesMode}
            metricTitle={metricTitle}
            colorMode={state.colorMode}
            onColorMode={actions.setColorMode}
            onSelectPath={selectInPlace}
            onSelectFolder={actions.selectFolder}
            onLintRule={actions.setLintRule}
            onListRules={actions.listLintRules}
            canEditLint={app.canEditLint}
          />
        ) : (
          <ChangesPanel
            report={report}
            model={view.model}
            scope={state.changesScope}
            onClearScope={actions.clearChangesScope}
            source={state.reportSource}
            error={state.reportError}
            onLoad={onLoadReport}
            onSelectPath={(path) => {
              selectPath(path);
              closeFile();
            }}
            loadHistory={loadHistory}
            loadDiff={loadDiff}
            onOpenHistory={onOpenHistory}
          />
        )}
      </aside>
      <InspectorBar
        active={state.tab}
        alert={Boolean(report && reportHasChanges(report))}
        lintMarks={lintMarks}
        closed={inspectorClosed}
        panelId={inspectorId}
        onSelect={selectInspectorTab}
      />
    </div>
  );
}
