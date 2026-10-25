import fs from "node:fs";
import path from "node:path";
import { gitStatus } from "./git";

/**
 * El pulso del live: qué cambió y si merece un análisis (ADR 0056).
 *
 * Un aviso del vigilante no es un cambio: un `git add` que solo mueve el
 * índice, compilar en `dist/` o guardar sin tocar el contenido avisan y no
 * cambian el mapa. Aquí se decide con dos señales baratas:
 *
 * - **git**, `git status --porcelain=v2`: lo que difiere de `HEAD`, con
 *   renombrados y bajas, y sin listar lo ignorado. Es la lista que el mapa ve.
 * - **los ficheros**, la versión (`tamaño:mtime`) de lo que avisó el vigilante.
 *
 * Las dos suman y ninguna veta a la otra. git es más exacto, pero no siempre
 * sirve: una carpeta que el repo padre ignora —o que vive fuera de su árbol
 * versionado— no aparece en `git status` y aun así se analiza y se guarda, así
 * que sus avisos también cuentan.
 *
 * La firma se recuerda por raíz; dos pulsos con la misma firma no analizan.
 */

/** Carpetas que no se vigilan ni entran en la decisión. */
const LIVE_IGNORED = new Set([
  ".git",
  "node_modules",
  ".codarch",
  ".codarch-history",
  "dist",
  "coverage",
  ".next",
  "out",
  "target"
]);

/** ¿La ruta cae en una carpeta que el mapa no mira? */
export function isLiveIgnored(relative: string): boolean {
  return normalize(relative)
    .split("/")
    .some((part) => LIVE_IGNORED.has(part));
}

export interface Pulse {
  /** ¿Hay algo que el mapa vería distinto? */
  fresh: boolean;
  /** Qué señal lo decidió. */
  source: "git" | "archivos" | "nada";
  /** Las rutas que cambiaron, con `/`. */
  paths: string[];
}

interface Measured {
  /** La firma de git, o `null` si no hay git que consultar. */
  git: string | null;
  /** La firma de los ficheros avisados, o `null` si no hubo aviso. */
  files: string | null;
  paths: string[];
}

/**
 * Recuerda la última firma de cada raíz y contesta si un pulso trae algo nuevo.
 *
 * Se prueba sin abrir la app: es lógica pura sobre disco y git.
 */
export class ChangeGate {
  private readonly seen = new Map<string, Measured>();
  /** Raíces donde git no está disponible: no se vuelve a preguntar. */
  private readonly withoutGit = new Set<string>();

  /**
   * ¿Hay que reanalizar?
   *
   * `hints` son las rutas que trajo el vigilante (relativas a la raíz).
   */
  check(root: string, hints: readonly string[] = []): Pulse {
    const now = this.measure(root, hints);
    const before = this.seen.get(root);
    this.seen.set(root, now);

    const gitChanged = now.git !== null && now.git !== before?.git;
    const filesChanged = now.files !== null && now.files !== before?.files;
    return {
      fresh: gitChanged || filesChanged,
      source: sourceOf(now, gitChanged, filesChanged),
      paths: now.paths
    };
  }

  /**
   * Apunta la firma de ahora sin decidir nada.
   *
   * Lo usa el análisis forzado: lo que venga después se compara con el estado
   * que se acaba de leer, no con el de antes.
   */
  remember(root: string, hints: readonly string[] = []): void {
    this.seen.set(root, this.measure(root, hints));
  }

  /** Olvida una raíz (al cerrarla o al cambiar de repo). */
  forget(root: string): void {
    this.seen.delete(root);
    this.withoutGit.delete(root);
  }

  private measure(root: string, hints: readonly string[]): Measured {
    const paths: string[] = [];
    let git: string | null = null;

    if (!this.withoutGit.has(root)) {
      const status = gitStatus(root);
      if (status.available) {
        git = [
          status.head ?? "-",
          ...status.changes
            .map((change) => `${change.path}\u0000${versionOf(root, change.path)}`)
            .sort()
        ].join("\n");
        for (const change of status.changes) paths.push(change.path);
      } else {
        this.withoutGit.add(root);
      }
    }

    const hinted = hints
      .map((hint) => normalize(hint))
      .filter((hint) => hint !== "" && !isLiveIgnored(hint));
    const files =
      hinted.length === 0
        ? null
        : hinted
            .map((relative) => `${relative}\u0000${versionOf(root, relative)}`)
            .sort()
            .join("\n");
    for (const relative of hinted) {
      if (!paths.includes(relative)) paths.push(relative);
    }

    return { git, files, paths: paths.sort() };
  }
}

function sourceOf(
  now: Measured,
  gitChanged: boolean,
  filesChanged: boolean
): Pulse["source"] {
  if (gitChanged) return "git";
  if (filesChanged) return "archivos";
  if (now.git !== null) return "git";
  return now.files !== null ? "archivos" : "nada";
}

/** `tamaño:mtime` de un fichero; `-` si no es un fichero legible. */
function versionOf(root: string, relative: string): string {
  try {
    const stats = fs.statSync(path.join(root, relative.split("/").join(path.sep)));
    if (!stats.isFile()) return `-${stats.mtimeMs}`;
    return `${stats.size}:${stats.mtimeMs}`;
  } catch {
    return "-";
  }
}

/** Rutas con `/`, como las del snapshot, vengan de donde vengan. */
function normalize(relative: string): string {
  return relative.split("\\").join("/");
}
