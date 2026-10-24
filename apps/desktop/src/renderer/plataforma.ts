import { desktop } from "./bridge";
import {
  clearProject,
  readEnabledPlugins,
  readPreferences,
  readProject,
  writeEnabledPlugins,
  writePreferences,
  writeProject
} from "./storage";
import type { Plataforma, SavedProject } from "@codarch/ui";

/**
 * Adaptador de plataforma del escritorio para `useCodarchApp`.
 *
 * Conecta el hook compartido con el proceso principal (IPC) y el almacenamiento
 * local del renderer.
 */
export function plataformaEscritorio(): Plataforma {
  return {
    analizar: async (root) => desktop().analyze(root),
    elegirCarpeta: () => desktop().pickFolder(),
    elegirFichero: () => desktop().pickFile(),
    leerJson: (file) => desktop().readJson(file),
    leerPreferencias: () => readPreferences(),
    escribirPreferencias: (prefs) => writePreferences(prefs),
    leerProyecto: () => readProject(),
    restaurarProyecto: async () => {
      const saved = readProject();
      const root = saved?.label;
      if (!root) return saved;
      // `.codarch/` del repo manda: es la fuente compartida con la web y el CLI.
      try {
        const persisted = await desktop().readSnapshot(root);
        if (persisted) return { ...saved, snapshot: persisted, label: root };
      } catch {
        // Sin `.codarch/` legible se usa la copia local.
      }
      return saved;
    },
    escribirProyecto: (project) => writeProject(project as SavedProject),
    borrarProyecto: () => clearProject(),
    historial: () => desktop().history(),
    fotoHistorial: (name) => desktop().historySnapshot(name),
    cadenas: (symbol) => desktop().chains(symbol),
    abrirExterno: (url) => desktop().openExternal(url),
    plugins: {
      read: () => readEnabledPlugins(),
      write: (names) => writeEnabledPlugins(names)
    }
  };
}
