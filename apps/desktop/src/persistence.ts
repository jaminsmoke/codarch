import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  ensureStateIgnored,
  sweepCodarch,
  writeParseCachePayload
} from "@codarch/parsers";
import type { ParseCachePayload } from "@codarch/parsers";
import { repoAddons } from "@codarch/addons/node";
import type { RepoAddons } from "@codarch/addons";
import {
  CODARCH_DIR,
  LINT_FILE,
  REPORT_FILE,
  REST_FILE,
  SNAPSHOT_FILE,
  codarchDir,
  codarchPath
} from "@codarch/schema";
import type { ViewPreferences } from "@codarch/ui/storage";
import { readRepoPreferences } from "./preferences";
import {
  sameSnapshot,
  snapshotChecksum,
  snapshotHistoryChecksum
} from "./snapshot-state";

/**
 * Lo que el escritorio guarda en el `.codarch/` de un repo (ADR 0048).
 *
 * Es la capa que habla con el disco y nada más: no sabe de ventanas, de menús
 * ni de IPC. Todo lo que escribe usa los nombres del registro (ADR 0101) y la
 * regla de la carpeta (ADR 0101): lo que no reconoce, se va con aviso.
 */

/** Un `cc.json` tiene `meta` y `files`; un reporte, `base` y `summary`. */
export function isSnapshot(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.meta === "object" &&
    record.meta !== null &&
    Array.isArray(record.files)
  );
}

/** ¿El proyecto cabe en `.codarch/` de ese repo? */
export function isDirectory(root: string): boolean {
  try {
    return existsSync(root) && statSync(root).isDirectory();
  } catch {
    return false;
  }
}

/** Ruta del snapshot persistido de un repo, si existe. */
function snapshotPath(root: string): string {
  return codarchPath(root, SNAPSHOT_FILE);
}

function readJsonFile(file: string): unknown | null {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as unknown;
  } catch {
    return null;
  }
}

/**
 * Lee el lint guardado, si lo hay.
 *
 * No se valida aquí: el renderer lo hace con el lector de `@codarch/lint` y un
 * fichero que no entiende deja el proyecto sin medir. Un solo nombre (ADR 0100):
 * no se prueban nombres anteriores.
 */
export function readPersistedLint(root: string): unknown | null {
  return readJsonFile(codarchPath(root, LINT_FILE));
}

/**
 * Lee el resto guardado, si lo hay y es de verdad un mapa del resto.
 *
 * Es un artefacto opcional: si falta o no trae su lente, no hay segundo mapa y
 * la app sigue con el del código.
 */
export function readPersistedRest(root: string): unknown | null {
  const raw = readJsonFile(codarchPath(root, REST_FILE));
  if (!isSnapshot(raw)) return null;
  const lenses = (raw as { lenses?: { rest?: unknown } }).lenses;
  return lenses?.rest ? raw : null;
}

/** Lee el snapshot persistido de un repo, si existe y se entiende. */
export function readPersistedSnapshot(root: string): unknown | null {
  const raw = readJsonFile(snapshotPath(root));
  return raw && isSnapshot(raw) ? raw : null;
}

/**
 * Escribe un JSON en `.codarch/` del repo, como `codarch analyze`.
 *
 * Si el fichero ya tiene ese contenido no se reescribe: el snapshot que acaba
 * de escribir el análisis no se serializa dos veces por el mismo camino.
 */
function writeCodarchJson(root: string, name: string, value: unknown): boolean {
  const directory = codarchDir(root);
  const file = path.join(directory, name);
  const content = `${JSON.stringify(value, null, 2)}\n`;
  try {
    if (existsSync(file) && readFileSync(file, "utf8") === content) return true;
    if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
    writeFileSync(file, content, "utf8");
    return true;
  } catch (cause) {
    console.error(`no se pudo escribir ${file}: ${(cause as Error).message}`);
    return false;
  }
}

/**
 * El checksum que ya está en `.codarch/snapshot.cc.json`, en memoria.
 *
 * Leer el fichero en cada pulso serían 400 KB por aviso; se lee una vez y se
 * actualiza al escribir. Si algo lo cambia por fuera, el siguiente pulso real
 * lo reescribe.
 */
const storedChecksums = new Map<string, string>();
/** El historial que hay en ese snapshot, para no confundir dos calores. */
const storedHistoryChecksums = new Map<string, string>();

export function persistedChecksum(root: string): string {
  const known = storedChecksums.get(root);
  if (known !== undefined) return known;
  const stored = readPersistedSnapshot(root) as {
    meta?: { checksum?: string };
  } | null;
  const checksum = stored?.meta?.checksum ?? "";
  storedChecksums.set(root, checksum);
  return checksum;
}

/**
 * El `historyChecksum` que ya está en `.codarch/snapshot.cc.json`, en memoria.
 *
 * Se lee y se actualiza junto al del código: el calor que la app enseña sale
 * de los dos (ADR 0103).
 */
export function persistedHistoryChecksum(root: string): string {
  const known = storedHistoryChecksums.get(root);
  if (known !== undefined) return known;
  const stored = readPersistedSnapshot(root) as {
    meta?: { historyChecksum?: string };
  } | null;
  const checksum = stored?.meta?.historyChecksum ?? "";
  storedHistoryChecksums.set(root, checksum);
  return checksum;
}

/** Escribe el snapshot en `.codarch/` del repo. */
export function writeSnapshot(root: string, snapshot: unknown): boolean {
  const written = writeCodarchJson(root, SNAPSHOT_FILE, snapshot);
  const checksum = snapshotChecksum(snapshot);
  if (written && checksum !== null) {
    storedChecksums.set(root, checksum);
    storedHistoryChecksums.set(root, snapshotHistoryChecksum(snapshot) ?? "");
  }
  return written;
}

/**
 * Escribe el mapa del resto y dice si el fichero cambió de verdad.
 *
 * Un refresco del live puede traer el código igual y un documento distinto:
 * sin este «cambió», la app seguiría enseñando un mapa del resto viejo.
 */
export function storeRest(root: string, rest: unknown | null): boolean {
  if (!rest) return false;
  const file = codarchPath(root, REST_FILE);
  try {
    const content = `${JSON.stringify(rest, null, 2)}\n`;
    if (existsSync(file) && readFileSync(file, "utf8") === content) {
      return false;
    }
    return writeCodarchJson(root, REST_FILE, rest);
  } catch (cause) {
    console.error(`no se pudo escribir ${file}: ${(cause as Error).message}`);
    return false;
  }
}

/**
 * Guarda la caché de parseo que dejó el análisis (ADR 0089).
 *
 * El `utilityProcess` que analiza no escribe en `.codarch/` (ADR 0050): calcula
 * la caché y la manda, y se guarda aquí, donde se guarda el snapshot. Es
 * derivada y se puede borrar; si no se puede escribir, el análisis siguiente
 * parsea otra vez y no pasa nada más.
 */
export function storeParseCache(root: string, payload: ParseCachePayload): void {
  try {
    writeParseCachePayload(codarchDir(root), payload);
  } catch (cause) {
    console.error(
      `no se pudo escribir la caché de parseo de ${root}: ${(cause as Error).message}`
    );
  }
}

/**
 * Deja `.codarch/` con lo que es suyo, como `codarch analyze` (ADR 0101).
 *
 * Lo que no reconoce se borra y se dice: la carpeta no es un cajón. Se llama
 * después de escribir lo de la pasada, para no borrar lo que se acaba de
 * guardar.
 */
export function sweepState(root: string): string[] {
  const removed = sweepCodarch(root);
  if (removed.length > 0) {
    console.error(
      `aviso: ${CODARCH_DIR}/ es del producto, no un cajón: se borraron ${removed.length} entradas que no reconoce (${removed.join(", ")})`
    );
  }
  return removed;
}

/**
 * Persiste en `.codarch/` lo que llega del renderer (ADR 0048).
 *
 * El snapshot manda; el reporte se guarda si lo hay. Un fichero suelto no es un
 * repo: en ese caso no se escribe nada.
 */
export function persistProject(
  root: string,
  snapshot: unknown,
  report: unknown | null
): boolean {
  if (!isDirectory(root)) return false;
  ensureStateIgnored(root);
  // Si el análisis ya dejó ese mismo snapshot en `.codarch/`, no se vuelve a
  // serializar: el renderer manda el proyecto al abrir, y el live lo escribe
  // aquí antes de avisar. El reporte, si viene, se escribe igual.
  if (
    !sameSnapshot(
      snapshot,
      persistedChecksum(root),
      persistedHistoryChecksum(root)
    ) &&
    !writeSnapshot(root, snapshot)
  ) {
    return false;
  }
  if (report !== null && report !== undefined) {
    writeCodarchJson(root, REPORT_FILE, report);
  }
  return true;
}

export interface RestoredProject {
  snapshot: unknown;
  rest: unknown | null;
  lint: unknown | null;
  report: unknown | null;
  addons: RepoAddons;
  preferences: ViewPreferences | null;
}

/**
 * Todo lo que `.codarch/` guarda de un repo, para restaurar la sesión.
 *
 * Los addons se leen del repo (`.codarch.yml`), no del snapshot: el checksum no
 * depende de lo que tengas instalado (ADR 0029).
 */
export function restoreProject(root: string): RestoredProject | null {
  if (!isDirectory(root)) return null;
  const snapshot = readPersistedSnapshot(root);
  if (!snapshot) return null;
  return {
    snapshot,
    rest: readPersistedRest(root),
    lint: readPersistedLint(root),
    report: readJsonFile(codarchPath(root, REPORT_FILE)),
    addons: repoAddons(root),
    preferences: readRepoPreferences(root)
  };
}
