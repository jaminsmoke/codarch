import { CODARCH_DIR, REPORT_FILE } from "@codarch/schema/browser";
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
import {
  historyEntries,
  symbolHeat,
  type FileDiffView,
  type Platform,
  type SavedProject
} from "@codarch/ui";

/**
 * Adaptador de plataforma del escritorio para `useCodarchApp`.
 *
 * Conecta el hook compartido con el proceso principal (IPC) y el
 * almacenamiento local del renderer. El proyecto vive en `.codarch/` del repo;
 * en `localStorage` solo quedan las preferencias y la raíz del último repo
 * (ADR 0048).
 */
export function desktopPlatform(): Platform {
  /** El proyecto de esta sesión, para no volver a leer el disco sin motivo. */
  let actual: SavedProject | null = null;

  return {
    analyze: async (root) => desktop().analyze(root),
    pickFolder: () => desktop().pickFolder(),
    pickFile: () => desktop().pickFile(),
    readJson: (file) => desktop().readJson(file),
    readPreferences: () => readPreferences(),
    writePreferences: (prefs) => {
      // El repo manda; la copia local es el respaldo si no se puede escribir.
      writePreferences(prefs);
      if (actual) void desktop().persistPreferences(actual.label, prefs);
    },
    readProject: () => actual,
    restoreProject: async () => {
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
            rest: restored.rest ?? undefined,
            lint: restored.lint ?? undefined,
            report: restored.report,
            label: root,
            reportLabel: restored.report
              ? `${root}/${CODARCH_DIR}/${REPORT_FILE}`
              : null,
            addons: restored.addons.addons,
            preferences: restored.preferences ?? undefined
          };
        }
      });
      return actual;
    },
    writeProject: async (project) => {
      const saved = await desktop().persistProject(
        project.label,
        project.snapshot,
        project.report
      );
      if (saved) {
        actual = project;
        writeLastRoot(project.label);
      } else {
        // Un fichero suelto no es un proyecto: no hay nada que recordar.
        actual = null;
      }
      return saved;
    },
    clearProject: () => {
      // Olvidar es dejar de restaurar: `.codarch/` del repo no se toca.
      actual = null;
      clearLegacyProject();
      clearLastRoot();
    },
    chains: (symbol) => desktop().chains(symbol),
    code: (request) => desktop().source(request),
    diff: async (path) => (await desktop().diff(path)) as FileDiffView | null,
    openInEditor: (request) => desktop().openEditor(request),
    history: async () => historyEntries(await desktop().history()),
    heat: async () => symbolHeat(await desktop().chains()),
    plugins: {
      read: () => readEnabledPlugins(),
      write: (names) => writeEnabledPlugins(names)
    }
  };
}
