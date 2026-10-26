import type {
  CodeSnippet,
  EditorRequest,
  FileDiffView,
  Plataforma,
  SavedProject
} from "@codarch/ui";
import type { HistoryEntry, SymbolHeat } from "@codarch/schema/browser";
import { sourceFromMemory } from "./analysis/reader";
import { fetchJson } from "./http";
import {
  clearProject,
  readEnabledPlugins,
  readPreferences,
  readProject,
  writeEnabledPlugins,
  writePreferences,
  writeProject
} from "./storage";

/**
 * Adaptador de plataforma de la web para `useCodarchApp`.
 *
 * El análisis en el navegador y la selección de carpeta viven en la app: tienen
 * progreso por fichero y cancelación, y se quedan donde se ven. Aquí solo va lo
 * que el hook necesita para el estado compartido.
 */
/** El enlace `vscode://file/...` del fichero y la línea (ADR 0068). */
function vscodeUri(root: string, path: string, line: number): string {
  const full = `${root.replaceAll("\\", "/").replace(/\/$/, "")}/${path.replaceAll("\\", "/")}`;
  const prefix = /^[A-Za-z]:\//.test(full)
    ? "vscode://file/"
    : "vscode://file";
  return `${prefix}${encodeURI(full)}:${line}`;
}

export function plataformaWeb(): Plataforma {
  return {
    leerPreferencias: () => readPreferences(),
    escribirPreferencias: (prefs) => writePreferences(prefs),
    leerProyecto: () => readProject(),
    escribirProyecto: (project) => writeProject(project as SavedProject),
    borrarProyecto: () => clearProject(),
    cadenas: async (symbol) =>
      fetchJson(`data/chains.json?symbol=${encodeURIComponent(symbol)}`),
    codigo: async (request) => {
      const remote = await fetchJson(
        `api/source?path=${encodeURIComponent(request.path)}&start=${request.start}&end=${request.end}`
      );
      if (
        remote &&
        typeof remote === "object" &&
        Array.isArray((remote as { lines?: unknown }).lines)
      ) {
        return remote as CodeSnippet;
      }
      return sourceFromMemory(request.path, request.start, request.end);
    },
    diff: async (path) => {
      const raw = await fetchJson(`api/diff?path=${encodeURIComponent(path)}`);
      if (!raw || typeof raw !== "object") return null;
      const rows = (raw as { rows?: unknown }).rows;
      return Array.isArray(rows) ? (raw as FileDiffView) : null;
    },
    abrirEnEditor: async (request: EditorRequest) => {
      const raw = await fetchJson("data/meta.json");
      const root =
        raw && typeof raw === "object"
          ? (raw as { rootPath?: unknown }).rootPath
          : null;
      if (typeof root !== "string" || !root) return false;
      window.location.href = vscodeUri(root, request.path, request.line);
      return true;
    },
    historial: async () => {
      const raw = await fetchJson("data/history.json");
      if (!raw || typeof raw !== "object") return null;
      const list = (raw as { entries?: unknown }).entries;
      return Array.isArray(list) ? (list as HistoryEntry[]) : null;
    },
    calor: async () => {
      const raw = await fetchJson("data/chains.json");
      if (!raw || typeof raw !== "object") return null;
      const list = (raw as { heat?: unknown }).heat;
      return Array.isArray(list) ? (list as SymbolHeat[]) : null;
    },
    plugins: {
      read: () => readEnabledPlugins(),
      write: (names) => writeEnabledPlugins(names)
    }
  };
}
