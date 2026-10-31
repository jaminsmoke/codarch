import {
  historyEntries,
  symbolHeat,
  type CodeSnippet,
  type EditorRequest,
  type FileDiffView,
  type Platform,
  type SavedProject
} from "@codarch/ui";
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

export function platformWeb(): Platform {
  return {
    readPreferences: () => readPreferences(),
    writePreferences: (prefs) => writePreferences(prefs),
    readProject: () => readProject(),
    writeProject: (project) => writeProject(project as SavedProject),
    clearProject: () => clearProject(),
    chains: async (symbol) =>
      fetchJson(`data/chains.json?symbol=${encodeURIComponent(symbol)}`),
    code: async (request) => {
      const whole = request.whole === true;
      const remote = await fetchJson(
        `api/source?path=${encodeURIComponent(request.path)}&start=${request.start}&end=${request.end}` +
          (whole ? "&whole=1" : "")
      );
      if (
        remote &&
        typeof remote === "object" &&
        Array.isArray((remote as { lines?: unknown }).lines)
      ) {
        return remote as CodeSnippet;
      }
      // Sin servidor (demo o fichero suelto): los ficheros que leyó el análisis.
      return sourceFromMemory(
        request.path,
        request.start,
        request.end,
        whole ? 5_000 : 400
      );
    },
    diff: async (path) => {
      const raw = await fetchJson(`api/diff?path=${encodeURIComponent(path)}`);
      if (!raw || typeof raw !== "object") return null;
      const rows = (raw as { rows?: unknown }).rows;
      return Array.isArray(rows) ? (raw as FileDiffView) : null;
    },
    openInEditor: async (request: EditorRequest) => {
      const raw = await fetchJson("data/meta.json");
      const root =
        raw && typeof raw === "object"
          ? (raw as { rootPath?: unknown }).rootPath
          : null;
      if (typeof root !== "string" || !root) return false;
      window.location.href = vscodeUri(root, request.path, request.line);
      return true;
    },
    history: async () => historyEntries(await fetchJson("data/history.json")),
    heat: async () => symbolHeat(await fetchJson("data/chains.json")),
    plugins: {
      read: () => readEnabledPlugins(),
      write: (names) => writeEnabledPlugins(names)
    }
  };
}
