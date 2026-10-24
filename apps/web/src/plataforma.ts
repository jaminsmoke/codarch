import type { Plataforma, SavedProject } from "@codarch/ui";
import type { HistoryEntry, SymbolHeat } from "@codarch/schema/browser";
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
export function plataformaWeb(): Plataforma {
  return {
    leerPreferencias: () => readPreferences(),
    escribirPreferencias: (prefs) => writePreferences(prefs),
    leerProyecto: () => readProject(),
    escribirProyecto: (project) => writeProject(project as SavedProject),
    borrarProyecto: () => clearProject(),
    cadenas: async (symbol) =>
      fetchJson(`data/chains.json?symbol=${encodeURIComponent(symbol)}`),
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
