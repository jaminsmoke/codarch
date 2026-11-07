import { useId, useMemo, useState } from "react";
import { lintScopePath } from "@codarch/lint/browser";
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
import {
  healthSnapshotFromCc,
  planFindingOpen,
  readSelection
} from "../lintAdapter";
import { lintBarMark } from "../lintRollup";
import { toggleInspector, type InspectorTab } from "../viewState";
import { localStore } from "../storage-local";
import { readSectionClosed, writeSectionClosed } from "../sections";

/** El cambio de mapa borra la ruta recordada; aquí se vuelve a dejar la del fichero. */
function rememberSelection(
  ref: { current: string | null },
  path: string
): void {
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

  const codeSnapshot = useMemo(
    () => healthSnapshotFromCc(state.cc),
    [state.cc]
  );
  const docsSnapshot = useMemo(
    () => healthSnapshotFromCc(state.rest),
    [state.rest]
  );
  const codePaths = useMemo(() => {
    const paths = new Set<string>();
    for (const path of codeSnapshot?.paths ?? []) paths.add(lintScopePath(path));
    return paths;
  }, [codeSnapshot]);
  const restPaths = useMemo(() => {
    const paths = new Set<string>();
    for (const path of docsSnapshot?.paths ?? []) paths.add(lintScopePath(path));
    return paths;
  }, [docsSnapshot]);

  // Un .md del código abre el mapa del resto, y al revés. Si el mapa actual
  // ya contiene la ruta, se queda. Si ninguno la tiene, no se cambia de mapa.
  const selectInPlace = (path: string) => {
    const plan = planFindingOpen({
      path: lintScopePath(path),
      map: state.map,
      inCode: codePaths.has(lintScopePath(path)),
      inRest: restPaths.has(lintScopePath(path))
    });
    if (!plan) return;
    if (plan.map !== state.map) {
      actions.setMap(plan.map);
      rememberSelection(app.selectedPathRef, path);
      actions.setTab("file");
      closeFile();
      return;
    }
    const index =
      view.model?.files.findIndex((file) => file.path === path) ?? -1;
    if (index >= 0) actions.selectIndex(index);
    closeFile();
  };

  const rulesMode = state.map === "rest";
  const markOf = (kind: "file" | "folder" | "project", path: string) => {
    const health = readSelection({
      code: state.lint,
      docs: state.restLint,
      scope: { kind, path },
      codeSnapshot,
      docsSnapshot
    });
    if (health.counts.findings === 0) return null;
    return lintBarMark(
      {
        errors: health.counts.errors,
        warnings: health.counts.warnings,
        info: health.counts.info,
        findings: health.counts.findings,
        files: health.counts.files
      },
      "lint"
    );
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
            lint={state.lint}
            docsLint={state.restLint}
            codeSnapshot={codeSnapshot}
            docsSnapshot={docsSnapshot}
            migration={migration}
            showCode={state.map === "code"}
            onSelectSymbol={(name) => {
              void actions.openSymbolChain(name, selectedFile?.path ?? "");
            }}
            onLoadCode={actions.readCode}
            onOpenEditor={actions.openInEditor}
            onSelectPath={selectInPlace}
            onColorMode={actions.setColorMode}
          />
        ) : state.tab === "folder" ? (
          <FolderPanel
            folder={selectedFolderNode}
            model={view.model}
            lint={state.lint}
            docsLint={state.restLint}
            codeSnapshot={codeSnapshot}
            docsSnapshot={docsSnapshot}
            rulesMode={rulesMode}
            changes={report?.files ?? null}
            metricTitle={metricTitle}
            colorMode={state.colorMode}
            onColorMode={actions.setColorMode}
            onSelectPath={selectInPlace}
            onSelectFolder={actions.selectFolder}
            onScopeChanges={actions.scopeChanges}
          />
        ) : state.tab === "project" ? (
          <ProjectPanel
            model={view.model}
            lint={state.lint}
            docsLint={state.restLint}
            codeSnapshot={codeSnapshot}
            docsSnapshot={docsSnapshot}
            rulesMode={rulesMode}
            metricTitle={metricTitle}
            colorMode={state.colorMode}
            onColorMode={actions.setColorMode}
            onSelectPath={selectInPlace}
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
