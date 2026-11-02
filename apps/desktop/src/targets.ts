import { existsSync, readFileSync, statSync } from "node:fs";
import { ensureStateIgnored, protectedRootReason } from "@codarch/parsers";
import type { RepoAnalyzer } from "./analyzer";
import { sendHeadReport } from "./head-report";
import {
  isSnapshot,
  readPersistedLint,
  readPersistedRest,
  readPersistedRestLint,
  readPersistedSnapshot,
  storeParseCache,
  storeRest,
  storeRestLint,
  sweepState,
  writeSnapshot
} from "./persistence";
import type { DesktopTarget } from "./preload";

/**
 * Abrir una ruta: una carpeta se analiza, un JSON se decide si es un snapshot
 * o un reporte.
 *
 * Vive fuera de `main.ts` para poder probarlo sin Electron: no toca ventanas ni
 * diálogos, pide lo que necesita. Un fichero suelto no es un repo: deja de
 * vigilar el anterior para no mezclar su historial ni su libro de cadenas con
 * este snapshot (ADR 0050).
 */

export interface TargetOptions {
  analyzer(): RepoAnalyzer;
  send(target: DesktopTarget): void;
  title(label: string | null, projectName?: string | null): void;
  /** Dice por qué no se pudo abrir; va a la consola y a la pantalla. */
  fail(title: string, message: string): void;
  watch(root: string): void;
  stopWatching(): void;
  refresh(root: string): Promise<void>;
  setRoot(root: string | null): void;
}

export interface Targets {
  open(target: string): Promise<void>;
}

/** El nombre del proyecto de un snapshot, si lo trae. */
function projectNameOf(value: unknown): string | null {
  if (!isSnapshot(value)) return null;
  const meta = (value as { meta?: { projectName?: unknown } }).meta;
  return typeof meta?.projectName === "string" && meta.projectName.trim() !== ""
    ? meta.projectName
    : null;
}

export function createTargets(options: TargetOptions): Targets {
  const headReport = (root: string, report: unknown | null): void =>
    sendHeadReport(root, report, options.send);

  /** Pinta lo que ya está en `.codarch/` y reanaliza por detrás. */
  const paintStored = (root: string): void => {
    const stored = readPersistedSnapshot(root);
    if (!stored) return;
    options.setRoot(root);
    options.title(root, projectNameOf(stored));
    options.send({
      kind: "snapshot",
      snapshot: stored,
      rest: readPersistedRest(root),
      lint: readPersistedLint(root),
      restLint: readPersistedRestLint(root),
      label: root
    });
  };

  return {
    async open(target) {
      if (!existsSync(target)) {
        options.fail("No se pudo abrir", `No existe ${target}.`);
        return;
      }

      if (statSync(target).isDirectory()) {
        const denied = protectedRootReason(target);
        if (denied) {
          options.fail(
            "No se pudo analizar",
            `CodArch no analiza ${denied}: elige la carpeta de un proyecto.`
          );
          return;
        }
        // Si lo guardado ya es el estado del repo, aún no hay nada que
        // reanalizar: se pinta al instante y el repo sigue vivo.
        if (readPersistedSnapshot(target)) {
          paintStored(target);
          options.watch(target);
          setTimeout(() => void options.refresh(target), 400);
          return;
        }
        let outcome;
        try {
          outcome = await options.analyzer().analyze(target);
        } catch (cause) {
          // El proceso que analiza puede caerse: se dice y no se deja la app
          // muda.
          options.fail(
            "No se pudo analizar",
            `${target}: ${(cause as Error).message}`
          );
          return;
        }
        if (outcome.kind === "unchanged") {
          // Sin cambios respecto a lo guardado: se pinta lo guardado. Antes se
          // volvía sin avisar y la ventana se quedaba como estaba.
          if (readPersistedSnapshot(target)) {
            paintStored(target);
            options.setRoot(target);
            headReport(target, outcome.headReport);
            options.watch(target);
            return;
          }
          options.fail(
            "No se pudo abrir",
            `${target}: el análisis no encontró cambios y no hay snapshot guardado que pintar.`
          );
          return;
        }
        options.setRoot(target);
        options.title(target, projectNameOf(outcome.snapshot));
        ensureStateIgnored(target);
        writeSnapshot(target, outcome.snapshot);
        storeRest(target, outcome.rest);
        storeRestLint(target, outcome.restLint);
        storeParseCache(target, outcome.parseCache);
        sweepState(target);
        options.watch(target);
        options.send({
          kind: "snapshot",
          snapshot: outcome.snapshot,
          rest: outcome.rest,
          lint: readPersistedLint(target),
          restLint: outcome.restLint,
          label: target
        });
        headReport(target, outcome.headReport);
        return;
      }

      // Un fichero suelto no es un repo: se deja de vigilar el anterior.
      options.stopWatching();
      options.setRoot(null);
      let raw: unknown;
      try {
        raw = JSON.parse(readFileSync(target, "utf8")) as unknown;
      } catch (cause) {
        options.fail(
          "No se pudo abrir el fichero",
          `${target}: ${(cause as Error).message}`
        );
        return;
      }
      options.title(target, projectNameOf(raw));
      if (isSnapshot(raw)) {
        // Un cc.json suelto no trae su resto ni su lint: los dos son del repo.
        options.send({
          kind: "snapshot",
          snapshot: raw,
          rest: null,
          lint: null,
          restLint: null,
          label: target
        });
        return;
      }
      options.send({ kind: "report", report: raw, label: target });
    }
  };
}
