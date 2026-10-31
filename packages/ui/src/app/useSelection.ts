import {
  useCallback,
  useEffect,
  useMemo,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction
} from "react";
import {
  symbolsOf,
  type CcJson,
  type SymbolChain
} from "@codarch/schema/browser";
import type { RenderModel } from "@codarch/render/browser";
import type { readMigration } from "../data";
import { findFolder } from "../tree";
import { tabWhenFolderDisappears, type InspectorTab } from "../viewState";
import { indexOfPath, planRestore, tabAfterFilePick } from "./selection";

/**
 * La selección: qué está elegido, qué se abre y qué hoja lo lee.
 *
 * Es una sola cosa —un fichero o una carpeta— y la comparten las dos apps, así
 * que sus gestos viven juntos: elegir un fichero, elegir una carpeta, abrir su
 * código en el escenario, pedir la cadena de un símbolo y vaciarlo todo. Las
 * reglas puras están en `selection.ts`; aquí solo se conectan al estado.
 */

export interface SelectionDeps {
  /** El modelo del mapa, o `null` si no hay snapshot. */
  model: RenderModel | null;
  /** El snapshot del código: de ahí salen los símbolos del fichero elegido. */
  activeCc: CcJson | null;
  /** La lente de migración, para saber qué nodo corresponde al fichero. */
  migration: ReturnType<typeof readMigration>;
  selectedIndex: number | null;
  selectedFolder: string | null;
  selectedPathRef: MutableRefObject<string | null>;
  setSelectedIndex: (index: number | null) => void;
  setSelectedFolder: (path: string | null) => void;
  setTab: Dispatch<SetStateAction<InspectorTab>>;
  setOpenFile: (path: string | null) => void;
  setFocusPath: (path: string | null) => void;
  setQuery: (query: string) => void;
  setChain: (chain: SymbolChain | null) => void;
  /** La cadena de un símbolo, si la plataforma la sabe pedir. */
  chains: ((name: string) => Promise<unknown>) | null;
}

export function useSelection(deps: SelectionDeps) {
  const {
    model,
    activeCc,
    migration,
    selectedIndex,
    selectedFolder,
    selectedPathRef,
    setSelectedIndex,
    setSelectedFolder,
    setTab,
    setOpenFile,
    setFocusPath,
    setQuery,
    setChain,
    chains
  } = deps;

  const selectIndex = useCallback(
    (index: number | null) => {
      setSelectedIndex(index);
      selectedPathRef.current =
        index === null ? null : model?.files[index]?.path ?? null;
      // Un fichero y una carpeta no pueden estar seleccionados a la vez, y la
      // hoja de la carpeta no se queda abierta hablando de un fichero.
      if (index !== null) {
        setSelectedFolder(null);
        setTab((current) => tabAfterFilePick(current));
      }
    },
    [model, selectedPathRef, setSelectedFolder, setSelectedIndex, setTab]
  );

  /**
   * Restaura la selección sin mover la hoja que se está leyendo.
   *
   * Un refresco del modelo —guardar un fichero con el live— no elige fichero:
   * devuelve el que había. Si se pasara por `selectIndex`, la hoja de Proyecto
   * o la de la carpeta se cerrarían justo cuando el lint acaba de medir.
   */
  const restoreIndex = useCallback(
    (index: number | null) => {
      setSelectedIndex(index);
      selectedPathRef.current =
        index === null ? null : model?.files[index]?.path ?? null;
    },
    [model, selectedPathRef, setSelectedIndex]
  );

  /**
   * Selecciona una carpeta: la ficha pasa a hablar de ella (ADR 0092).
   *
   * No mueve el mapa: la selección y el foco son cosas distintas. Una ruta que
   * ya no existe en el árbol se ignora en silencio, como en `applyView`.
   */
  const selectFolder = useCallback(
    (path: string | null) => {
      if (path !== null && !findFolder(model?.roots ?? [], path)) return;
      setSelectedFolder(path);
      if (path !== null) {
        selectedPathRef.current = null;
        setSelectedIndex(null);
        // El clic en una carpeta abre su hoja: es la razón de tener entrada
        // propia en la barra de actividad (ADR 0092).
        setTab("folder");
      }
    },
    [model, selectedPathRef, setSelectedFolder, setSelectedIndex, setTab]
  );

  /** Pide la cadena de un símbolo y lo deja elegido en la ficha. */
  const openSymbolChain = useCallback(
    async (name: string, path: string) => {
      const index = model ? indexOfPath(model.files, path) : -1;
      if (index >= 0) selectIndex(index);

      if (!chains) return;
      const raw = await chains(name);
      const found =
        raw && typeof raw === "object"
          ? (raw as { chains?: unknown }).chains
          : null;
      if (!Array.isArray(found) || found.length === 0) {
        setChain(null);
        return;
      }
      setChain((found as SymbolChain[])[0] ?? null);
    },
    [model, chains, selectIndex, setChain]
  );

  const selectedFile =
    model && selectedIndex !== null ? model.files[selectedIndex] ?? null : null;
  const selectedFolderNode =
    model && selectedFolder ? findFolder(model.roots, selectedFolder) : null;
  const selectedMigration = selectedFile
    ? migration?.nodes[selectedFile.nodeId] ?? null
    : null;
  /** Los símbolos del fichero elegido, del más complejo al más simple. */
  const selectedSymbols = useMemo(
    () => (selectedFile && activeCc ? symbolsOf(activeCc, selectedFile.nodeId) : []),
    [activeCc, selectedFile]
  );
  const selectedStructure = useMemo(
    () =>
      selectedFile && activeCc
        ? activeCc.lenses?.structure?.nodes[selectedFile.nodeId] ?? null
        : null,
    [activeCc, selectedFile]
  );

  /** Selecciona un fichero por su ruta y vuelve a la pestaña del fichero. */
  const selectPath = useCallback(
    (path: string) => {
      const index = model ? indexOfPath(model.files, path) : -1;
      if (index >= 0) {
        selectIndex(index);
        setTab("file");
      }
    },
    [model, selectIndex, setTab]
  );

  /**
   * Abre un fichero en el escenario y lo deja seleccionado en la ficha.
   *
   * El mapa se sustituye por su código, no se añade una pestaña (ADR 0087).
   * Se vuelve con la ruta, con `Esc` o abriendo otra carpeta.
   */
  const openFileAt = useCallback(
    (path: string) => {
      const index = model ? indexOfPath(model.files, path) : -1;
      if (index >= 0) selectIndex(index);
      setOpenFile(path);
      setTab("file");
    },
    [model, selectIndex, setOpenFile, setTab]
  );

  const closeFile = useCallback(() => setOpenFile(null), [setOpenFile]);

  /** Suelta la selección, el foco, el fichero abierto y la búsqueda. */
  const clearSelection = useCallback(() => {
    setFocusPath(null);
    setOpenFile(null);
    selectedPathRef.current = null;
    setSelectedIndex(null);
    setSelectedFolder(null);
    setQuery("");
  }, [
    selectedPathRef,
    setFocusPath,
    setOpenFile,
    setQuery,
    setSelectedFolder,
    setSelectedIndex
  ]);

  return {
    selectIndex,
    restoreIndex,
    selectFolder,
    openSymbolChain,
    selectedFile,
    selectedFolderNode,
    selectedMigration,
    selectedSymbols,
    selectedStructure,
    selectPath,
    openFileAt,
    closeFile,
    clearSelection
  };
}

/** Lo que hace falta para devolver la selección cuando el modelo cambia. */
export interface RestoreSelectionDeps {
  model: RenderModel | null;
  selectedFolder: string | null;
  selectedPathRef: MutableRefObject<string | null>;
  restoreIndex: (index: number | null) => void;
  setSelectedFolder: (path: string | null) => void;
  setTab: Dispatch<SetStateAction<InspectorTab>>;
}

/**
 * La selección que toca con el modelo nuevo.
 *
 * Al cambiar de métrica se conserva el fichero elegido si sigue existiendo, y
 * una carpeta seleccionada no se cambia por el fichero de por defecto: solo cae
 * si el refresco se la llevó, y entonces su hoja pasa a la del fichero
 * (ADR 0092). La regla vive en `planRestore`; esto es su efecto.
 */
export function useRestoreSelection(deps: RestoreSelectionDeps): void {
  const { model, selectedFolder, selectedPathRef, restoreIndex, setSelectedFolder, setTab } =
    deps;

  useEffect(() => {
    const plan = planRestore({
      files: model?.files ?? null,
      roots: model?.roots ?? [],
      folder: selectedFolder,
      remembered: selectedPathRef.current,
      defaultIndex: model?.defaultSelection ?? null
    });
    if (plan.index !== undefined) restoreIndex(plan.index);
    if (plan.folder !== undefined) setSelectedFolder(plan.folder);
    // La hoja de la carpeta que se fue pasa a la del fichero, no a otra.
    if (plan.folderGone) setTab((current) => tabWhenFolderDisappears(current));
  }, [model, selectedFolder, selectedPathRef, restoreIndex, setSelectedFolder, setTab]);
}
