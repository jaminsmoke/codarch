import { useId, useState } from "react";
import type { HistoryEntry } from "@codarch/schema/browser";
import type { CodarchApp } from "../app/types";
import { Inspector } from "../panels";
import { FolderPanel } from "../panels/FolderPanel";
import ChangesPanel, { reportHasChanges } from "../ChangesPanel";
import { InspectorBar, inspectorLabel } from "../InspectorBar";
import { toggleInspector, type InspectorTab } from "../viewState";
import { localStore } from "../storage";
import { readSectionClosed, writeSectionClosed } from "../sections";

/**
 * El dock del inspector: la ficha del fichero, la de la carpeta o los cambios.
 *
 * Tres hojas y tres entradas en la barra de actividad (ADR 0092): cada objeto
 * seleccionado tiene la suya, no una hoja que cambia de sujeto.
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

  // En Reglas se salta de un fichero a otro sin salir de la pestaña. Si el
  // escenario estaba enseñando un código, vuelve al mapa: la vista no se queda
  // con un fichero que ya no es el seleccionado (ADR 0087).
  const selectInPlace = (path: string) => {
    const index =
      view.model?.files.findIndex((file) => file.path === path) ?? -1;
    if (index >= 0) actions.selectIndex(index);
    closeFile();
  };

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
            report={report}
            migration={migration}
            showCode={state.map === "code"}
            onSelectSymbol={(name) => {
              void actions.openSymbolChain(name, selectedFile?.path ?? "");
            }}
            onLoadCode={actions.leerCodigo}
            onOpenEditor={actions.abrirEnEditor}
            onSelectPath={selectInPlace}
            onColorMode={actions.setColorMode}
          />
        ) : state.tab === "folder" ? (
          <FolderPanel
            folder={selectedFolderNode}
            model={view.model}
            onSelectPath={selectInPlace}
            onSelectFolder={actions.selectFolder}
          />
        ) : (
          <ChangesPanel
            report={report}
            model={view.model}
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
        closed={inspectorClosed}
        panelId={inspectorId}
        onSelect={selectInspectorTab}
      />
    </div>
  );
}
