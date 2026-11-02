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
import { restoreSession } from "./restore";
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
  let current: SavedProject | null = null;

  return {
    analyze: async (root) => desktop().analyze(root),
    pickFolder: () => desktop().pickFolder(),
    pickFile: () => desktop().pickFile(),
    readJson: (file) => desktop().readJson(file),
    readPreferences: () => readPreferences(),
    writePreferences: (prefs) => {
      // El repo manda; la copia local es el respaldo si no se puede escribir.
      writePreferences(prefs);
      if (current) void desktop().persistPreferences(current.label, prefs);
    },
    readProject: () => current,
    restoreProject: async () => {
      current = await restoreSession({
        readLegacy: readLegacyProject,
        persist: (project) =>
          desktop().persistProject(
            project.label,
            project.snapshot,
            project.report
          ),
        readLastRoot: readLastRoot,
        writeLastRoot: writeLastRoot,
        clearLegacy: clearLegacyProject,
        restore: async (root) => {
          const restored = await desktop().restoreProject(root);
          if (!restored) return null;
          return {
            snapshot: restored.snapshot,
            rest: restored.rest ?? undefined,
            lint: restored.lint ?? undefined,
            restLint: restored.restLint ?? undefined,
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
      return current;
    },
    writeProject: async (project) => {
      const saved = await desktop().persistProject(
        project.label,
        project.snapshot,
        project.report
      );
      if (saved) {
        current = project;
        writeLastRoot(project.label);
      } else {
        // Un fichero suelto no es un proyecto: no hay nada que recordar.
        current = null;
      }
      return saved;
    },
    clearProject: () => {
      // Olvidar es dejar de recordar: `.codarch/` del repo no se toca.
      current = null;
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
