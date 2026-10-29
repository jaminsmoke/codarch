import { useEffect, type RefObject } from "react";
import type { SourceRequest } from "@codarch/ui";
import { fetchJson, fetchJsonStrict } from "./http";
import { HEAD_REPORT_URL, servedReportUrl } from "./reports";
import { clearProject, readProject } from "./storage";

/**
 * El modo del mapa en la web: sin nada, con un fichero abierto, con un servidor
 * que no vigila, o con un servidor que vigila.
 */
export type WebServerMode = "static" | "local" | "served" | "live";

/** Qué dice la cabecera de la vigilancia a partir del modo del servidor. */
export function watchState(mode: WebServerMode): "live" | "paused" | "none" {
  if (mode === "live") return "live";
  if (mode === "served") return "paused";
  return "none";
}

/** Lo que `data/meta.json` dice del servidor local; `null` si no hay servidor. */
export interface ServerMeta {
  watch: boolean;
  rootPath: string | null;
  version: string | null;
}

export function readServerMeta(meta: unknown): ServerMeta | null {
  if (typeof meta !== "object" || meta === null) return null;
  const record = meta as Record<string, unknown>;
  return {
    watch: record.watch === true,
    rootPath: typeof record.rootPath === "string" ? record.rootPath : null,
    version: typeof record.version === "string" ? record.version : null
  };
}

/** Lo que la sesión necesita de la app: cargar, parar y decir dónde estamos. */
export interface SessionHandlers {
  snapshot: (raw: unknown, label: string, preserveView?: boolean) => boolean;
  /** El mapa de lo que no es código; `null` si el proyecto no lo trae (ADR 0093). */
  rest: (raw: unknown) => boolean;
  report: (raw: unknown, label: string, focus?: boolean) => boolean;
  resetReport: () => void;
  addons: () => Promise<void>;
  mode: (mode: WebServerMode) => void;
  sourceUrl: (url: string | null) => void;
  reportUrl: (url: string | null) => void;
  rootPath: (path: string) => void;
  version: (version: string) => void;
  error: (message: string) => void;
  reportError: (message: string) => void;
  loading: (loading: boolean) => void;
}

export interface BootOptions {
  /** Lo que pidió la URL, si pidió algo. */
  requested: SourceRequest;
  /** Se pone a `true` al abrir algo a mano: lo que llegue tarde no lo pisa. */
  manual: RefObject<boolean>;
  /** Si la app se desmontó mientras se cargaba. */
  isCancelled: () => boolean;
  handlers: SessionHandlers;
}

/** Lo que necesita cada paso del arranque: lo pedido solo lo mira el primero. */
type BootStep = Omit<BootOptions, "requested">;

/**
 * Arranca la web con lo que haya: una URL explícita manda; si no, el servidor
 * local; si no, el proyecto guardado.
 *
 * La URL pedida es explícita y no cae a nada más: si falla, se dice y se deja
 * el mapa como estaba.
 */
export async function runBoot(options: BootOptions): Promise<void> {
  const { requested } = options;
  if (requested.snapshotUrl) {
    await bootFromUrl(requested.snapshotUrl, requested.reportUrl, options);
    return;
  }
  await bootFromServer(options);
}

async function bootFromUrl(
  snapshotUrl: string,
  reportUrl: string | null,
  { manual, isCancelled, handlers: h }: BootStep
): Promise<void> {
  try {
    const raw = await fetchJsonStrict(snapshotUrl);
    if (isCancelled()) return;
    manual.current = true;
    if (!h.snapshot(raw, snapshotUrl)) {
      h.loading(false);
      return;
    }
    h.mode("local");
    h.sourceUrl(snapshotUrl);
    if (reportUrl) await loadRequestedReport(reportUrl, { isCancelled, h });
  } catch (cause) {
    if (isCancelled()) return;
    h.mode("local");
    h.error(`No se pudo cargar ${snapshotUrl}: ${(cause as Error).message}`);
    h.loading(false);
  }
}

/** El reporte que la URL pidió junto al snapshot: si falla, se avisa y se sigue. */
async function loadRequestedReport(
  url: string,
  { isCancelled, h }: { isCancelled: () => boolean; h: SessionHandlers }
): Promise<void> {
  try {
    const report = await fetchJsonStrict(url);
    if (isCancelled() || !report) return;
    h.report(report, url);
    h.reportUrl(url);
  } catch (cause) {
    if (isCancelled()) return;
    h.reportError(`No se pudo cargar el reporte: ${(cause as Error).message}`);
  }
}

async function bootFromServer({
  manual,
  isCancelled,
  handlers: h
}: BootStep): Promise<void> {
  const meta = await fetchJson("data/meta.json");
  const served = await fetchJson("data/snapshot.cc.json");

  if (manual.current) return;

  if (served) {
    if (isCancelled()) return;
    h.snapshot(served, "servidor local");
    // Los dos artefactos salen de la misma pasada del servidor (ADR 0093).
    h.rest(await fetchJson("data/rest.cc.json"));
    const info = readServerMeta(meta);
    h.mode(info?.watch ? "live" : "served");
    if (info?.rootPath) h.rootPath(info.rootPath);
    if (info?.version) h.version(info.version);
    // Con servidor, Cambios es del repo y lo compara el servidor con HEAD
    // (ADR 0075): `report.json` de dos fotos viejas no entra, porque
    // enseñaría cambios de hace semanas como si fueran de ahora. Un
    // artefacto estático sí trae su `report.json` como único cambio.
    const servedReport = await fetchJson(servedReportUrl(meta !== null));
    if (!isCancelled()) {
      if (servedReport) {
        h.report(servedReport, meta !== null ? "HEAD" : "report.json", false);
      } else {
        h.resetReport();
      }
    }
    await h.addons();
    return;
  }

  await bootFromSaved({ manual, isCancelled, handlers: h });
}

async function bootFromSaved({
  manual,
  isCancelled,
  handlers: h
}: BootStep): Promise<void> {
  const saved = readProject();
  if (saved && !isCancelled() && !manual.current) {
    if (h.snapshot(saved.snapshot, saved.label)) {
      h.mode("local");
      // El proyecto guardado puede traer su resto; si no, no hay segundo mapa.
      h.rest(saved.rest ?? null);
      if (saved.report) {
        h.report(saved.report, saved.reportLabel ?? "report.json", false);
      } else {
        h.resetReport();
      }
      return;
    }
    clearProject();
  }

  // Sin servidor y sin proyecto guardado no hay nada que enseñar: se queda el
  // estado vacío del mapa ("Abre un cc.json para empezar").
  if (!isCancelled()) h.loading(false);
}

/**
 * Los avisos del servidor: al guardar, relee el snapshot y el reporte HEAD.
 *
 * Devuelve la forma de cortarlo; sin `EventSource` no hay nada que cortar.
 */
export function watchServer({
  snapshot,
  rest,
  report
}: {
  snapshot: (raw: unknown) => void;
  rest: (raw: unknown) => void;
  report: (raw: unknown) => void;
}): () => void {
  if (typeof EventSource === "undefined") return () => {};

  const events = new EventSource("/events");
  events.addEventListener("update", async () => {
    const fresh = await fetchJson("data/snapshot.cc.json");
    if (fresh) snapshot(fresh);
    // El resto se relee del servidor, no del fichero: es de la misma pasada
    // que el snapshot que acaba de llegar (ADR 0093).
    rest(await fetchJson("data/rest.cc.json"));
    // El repo cambió: el reporte HEAD es lo que se ve en Cambios, y el
    // servidor lo acaba de tirar de la caché (ADR 0075).
    const head = await fetchJson(HEAD_REPORT_URL);
    if (head) report(head);
  });
  return () => events.close();
}

export interface ServerSessionOptions {
  mode: WebServerMode;
  /** Lo que pidió la URL: se lee una sola vez, al montar. */
  requested: SourceRequest;
  manual: RefObject<boolean>;
  handlers: SessionHandlers;
}

/**
 * La sesión de la web: carga lo que haya al arrancar y, con servidor live,
 * refresca el mapa al guardar.
 */
export function useServerSession(options: ServerSessionOptions): void {
  const { mode, requested, manual, handlers } = options;
  const {
    snapshot,
    rest,
    report,
    resetReport,
    addons,
    error,
    reportError,
    loading,
    mode: setMode,
    sourceUrl,
    reportUrl,
    rootPath,
    version
  } = handlers;

  useEffect(() => {
    let cancelled = false;
    runBoot({
      requested,
      manual,
      handlers: {
        snapshot,
        rest,
        report,
        resetReport,
        addons,
        mode: setMode,
        sourceUrl,
        reportUrl,
        rootPath,
        version,
        error,
        reportError,
        loading
      },
      isCancelled: () => cancelled
    }).catch((cause: Error) => {
      if (cancelled) return;
      error(cause.message);
      loading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [
    requested,
    manual,
    snapshot,
    rest,
    report,
    resetReport,
    addons,
    setMode,
    sourceUrl,
    reportUrl,
    rootPath,
    version,
    error,
    reportError,
    loading
  ]);

  useEffect(() => {
    if (mode !== "live") return;
    return watchServer({
      snapshot: (raw) => void snapshot(raw, "servidor local", true),
      rest: (raw) => void rest(raw),
      report: (raw) => void report(raw, "HEAD", false)
    });
  }, [mode, snapshot, rest, report]);
}
