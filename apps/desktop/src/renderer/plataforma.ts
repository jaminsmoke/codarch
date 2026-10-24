import { desktop } from "./bridge";
import {
  clearLastRoot,
  clearLegacyProject,
  readEnabledPlugins,
  readLastRoot,
  readLegacyProject,
  readPreferences,
  writeEnabledPlugins,
  writeLastRoot,
  writePreferences
} from "./storage";
import { restaurarSesion } from "./restore";
import type { Plataforma, SavedProject } from "@codarch/ui";

/**
 * Adaptador de plataforma del escritorio para `useCodarchApp`.
 *
 * Conecta el hook compartido con el proceso principal (IPC) y el
 * almacenamiento local del renderer. El proyecto vive en `.codarch/` del repo;
 * en `localStorage` solo quedan las preferencias y la raíz del último repo
 * (ADR 0048).
 */
export function plataformaEscritorio(): Plataforma {
  /** El proyecto de esta sesión, para no volver a leer el disco sin motivo. */
  let actual: SavedProject | null = null;

  return {
    analizar: async (root) => desktop().analyze(root),
    elegirCarpeta: () => desktop().pickFolder(),
    elegirFichero: () => desktop().pickFile(),
    leerJson: (file) => desktop().readJson(file),
    leerPreferencias: () => readPreferences(),
    escribirPreferencias: (prefs) => writePreferences(prefs),
    leerProyecto: () => actual,
    restaurarProyecto: async () => {
      actual = await restaurarSesion({
        leerLegado: readLegacyProject,
        persistir: (project) =>
          desktop().persistProject(
            project.label,
            project.snapshot,
            project.report
          ),
        leerUltimaRaiz: readLastRoot,
        escribirUltimaRaiz: writeLastRoot,
        olvidarLegado: clearLegacyProject,
        restaurar: async (root) => {
          const restored = await desktop().restoreProject(root);
          if (!restored) return null;
          return {
            snapshot: restored.snapshot,
            report: restored.report,
            label: root,
            reportLabel: restored.report
              ? `${root}/.codarch/report.json`
              : null,
            addons: restored.addons.addons
          };
        }
      });
      return actual;
    },
    escribirProyecto: async (project) => {
      const saved = await desktop().persistProject(
        project.label,
        project.snapshot,
        project.report
      );
      if (saved) {
        actual = project;
        writeLastRoot(project.label);
      }
      return saved;
    },
    borrarProyecto: () => {
      // Olvidar es dejar de restaurar: `.codarch/` del repo no se toca.
      actual = null;
      clearLegacyProject();
      clearLastRoot();
    },
    cadenas: (symbol) => desktop().chains(symbol),
    plugins: {
      read: () => readEnabledPlugins(),
      write: (names) => writeEnabledPlugins(names)
    }
  };
}
