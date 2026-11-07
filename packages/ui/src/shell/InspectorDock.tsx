import { useId, useState } from "react";
import type { FindingAnchor } from "@codarch/lint/browser";
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
import { scopeHealthMerged } from "@codarch/lint/browser";
import { healthSnapshot } from "../lintHealth";
import { lintBarMark } from "../lintRollup";
import { toggleInspector, type InspectorTab } from "../viewState";
import { localStore } from "../storage-local";
import { readSectionClosed, writeSectionClosed } from "../sections";

/** El cambio de mapa borra la ruta recordada; aquí se vuelve a dejar la del fichero. */
function rememberSelection(ref: { current: string | null }, path: string): void {
  ref.current = path;
}

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

  // El ancla dice el mapa. Si es el otro, se cambia primero y luego se
  // selecciona: un .md no se abre en el árbol de código.
  const openFinding = (anchor: FindingAnchor) => {
    if (anchor.map !== state.map) {
      actions.setMap(anchor.map);
      rememberSelection(app.selectedPathRef, anchor.path);
      actions.setTab("file");
      closeFile();
      return;
    }
    selectInPlace(anchor.path);
  };

  // Los dos árboles se leen en las dos vistas. El catálogo, sin hallazgos,
  // sigue en la hoja de herramientas.
  const rulesMode = state.map === "rest";
  const sectionLint = state.lint;
  const docsLint = state.restLint;
  const snapshot = healthSnapshot(view.model);
  const markOf = (kind: "file" | "folder" | "project", path: string) => {
    const health = scopeHealthMerged(
      [state.lint, state.restLint],
      { kind, path },
      snapshot
    );
    if (health.counts.findings === 0) return null;
    return lintBarMark({
      errors: health.counts.errors,
      warnings: health.counts.warnings,
      info: health.counts.info,
      findings: health.counts.findings,
      files: health.counts.filesWithFindings
    });
  };
  const lintMarks: InspectorLintMarks = {};
  const fileMark = selectedFile ? markOf("file", selectedFile.path) : null;
  if (fileMark) lintMarks.file = fileMark;
  const folderMark = selectedFolderNode
    ? markOf("folder", selectedFolderNode.path)
    : null;
  if (folderMark) lintMarks.folder = folderMark;
  const projectMark = markOf("project", "");
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
            docsLint={docsLint}
            migration={migration}
            showCode={state.map === "code"}
            rulesMode={rulesMode}
            onSelectSymbol={(name) => {
              void actions.openSymbolChain(name, selectedFile?.path ?? "");
            }}
            onLoadCode={actions.readCode}
            onOpenEditor={actions.openInEditor}
            onSelectPath={selectInPlace}
            onOpenFinding={openFinding}
            onColorMode={actions.setColorMode}
          />
        ) : state.tab === "folder" ? (
          <FolderPanel
            folder={selectedFolderNode}
            model={view.model}
            lint={sectionLint}
            docsLint={docsLint}
            rulesMode={rulesMode}
            changes={report?.files ?? null}
            metricTitle={metricTitle}
            colorMode={state.colorMode}
            onColorMode={actions.setColorMode}
            onSelectPath={selectInPlace}
            onOpenFinding={openFinding}
            onSelectFolder={actions.selectFolder}
            onScopeChanges={actions.scopeChanges}
          />
        ) : state.tab === "project" ? (
          <ProjectPanel
            model={view.model}
            lint={sectionLint}
            docsLint={docsLint}
            rulesMode={rulesMode}
            metricTitle={metricTitle}
            colorMode={state.colorMode}
            onColorMode={actions.setColorMode}
            onSelectPath={selectInPlace}
            onOpenFinding={openFinding}
            onSelectFolder={actions.selectFolder}
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
