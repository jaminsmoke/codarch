/**
 * Estado de vista en la URL.
 *
 * La web se puede abrir en tres sitios: la demo, un fichero local o el servidor
 * local. En los tres casos la URL puede llevar el estado de la vista (área,
 * color, carpeta enfocada, fichero seleccionado, pestaña, símbolo) y las
 * direcciones de los artefactos que se cargan por URL.
 *
 * Las claves son cortas y estables porque la URL se comparte y se pega en
 * tickets: `area`, `color`, `focus`, `file`, `tab`, `symbol`, `src` y `report`.
 * Una vista guardada de un addon usa las mismas claves (ADR 0029) y el
 * escritorio las aplica con el mismo criterio, aunque no tenga URL.
 */

import type { AddonViewState } from "@codarch/addons";

/**
 * Las pestañas del panel derecho.
 *
 * Tres desde el ADR 0059: el fichero, sus reglas (con las lentes dentro) y los
 * cambios del snapshot. `lenses` y `pr` eran los nombres viejos y se siguen
 * aceptando para no romper enlaces ni vistas guardadas.
 */
export type InspectorTab = "file" | "rules" | "changes";

/** Lee una pestaña, con los nombres viejos traducidos a los de ahora. */
export function parseInspectorTab(value: string | null): InspectorTab | null {
  if (value === "file" || value === "rules" || value === "changes") return value;
  if (value === "lenses") return "rules";
  if (value === "pr") return "changes";
  return null;
}

export interface ViewState {
  /** Métrica que decide el área del treemap. */
  areaMetric: string | null;
  /** `risk`, `structure`, `status` o el nombre de una métrica. */
  colorMode: string | null;
  /** Ruta de la carpeta enfocada. */
  focusPath: string | null;
  /** Ruta del fichero seleccionado. */
  filePath: string | null;
  /** Pestaña del panel derecho. */
  tab: InspectorTab | null;
  /** El símbolo abierto: el nombre de la función, la clase o el tipo. */
  symbolName: string | null;
  /** Si los bloques muestran su nombre aunque no quepa entero. */
  showLabels: boolean | null;
}

export interface SourceRequest {
  /** URL del snapshot a cargar. */
  snapshotUrl: string | null;
  /** URL del reporte a cargar. */
  reportUrl: string | null;
}

/**
 * El estado de una vista guardada (un addon, ADR 0029).
 *
 * Son las mismas claves cortas que la URL, sin la `?`: así una vista guardada y
 * un enlace compartido dicen lo mismo y hablan un solo dialecto.
 */
export type SavedViewState = AddonViewState;

const VIEW_KEYS = ["area", "color", "focus", "file", "tab", "symbol", "labels"] as const;
const SOURCE_KEYS = ["src", "report"] as const;

export const EMPTY_VIEW_STATE: ViewState = {
  areaMetric: null,
  colorMode: null,
  focusPath: null,
  filePath: null,
  tab: null,
  symbolName: null,
  showLabels: null
};

export const EMPTY_SOURCE_REQUEST: SourceRequest = {
  snapshotUrl: null,
  reportUrl: null
};

function readParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Lee el estado de vista de una query string (`?area=rloc&focus=src/app`). */
export function parseViewState(search: string): ViewState {
  const params = new URLSearchParams(search);
  const tab = readParam(params, "tab");
  return {
    areaMetric: readParam(params, "area"),
    colorMode: readParam(params, "color"),
    focusPath: readParam(params, "focus"),
    filePath: readParam(params, "file"),
    tab: parseInspectorTab(tab),
    symbolName: readParam(params, "symbol"),
    showLabels: params.has("labels") ? params.get("labels") !== "0" : null
  };
}

/** Lee las direcciones de los artefactos que se cargan por URL. */
export function parseSourceRequest(search: string): SourceRequest {
  const params = new URLSearchParams(search);
  return {
    snapshotUrl: readParam(params, "src"),
    reportUrl: readParam(params, "report")
  };
}

/** Traduce una vista guardada al estado de vista de la app. */
export function viewStateFromSaved(state: AddonViewState): ViewState {
  return {
    areaMetric: state.area ?? null,
    colorMode: state.color ?? null,
    focusPath: state.focus ?? null,
    filePath: state.file ?? null,
    tab: state.tab ?? null,
    symbolName: state.symbol ?? null,
    showLabels: state.labels ?? null
  };
}

/**
 * Si un modo de color se puede pintar con este snapshot.
 *
 * `risk` y `structure` siempre; `status` pide la lente de migración; el resto
 * es el nombre de una métrica que tiene que venir en el snapshot.
 */
export function isColorModeAvailable(
  colorMode: string,
  coverage: ReadonlySet<string>,
  migration: unknown
): boolean {
  if (colorMode === "risk" || colorMode === "structure") return true;
  if (colorMode === "status") return Boolean(migration);
  return coverage.has(colorMode);
}

/**
 * Construye la query string con el estado de vista y las fuentes.
 *
 * Conserva los parámetros ajenos a la app y deja las barras en las rutas para
 * que el enlace sea legible: `?file=src/app/main.ts`, no `?file=src%2Fapp%2Fmain.ts`.
 */
export function buildSearch(
  state: ViewState,
  source: SourceRequest,
  current = ""
): string {
  const params = new URLSearchParams(current);
  for (const key of VIEW_KEYS) params.delete(key);
  for (const key of SOURCE_KEYS) params.delete(key);

  const entries: Array<[string, string]> = [];
  if (state.areaMetric) entries.push(["area", state.areaMetric]);
  if (state.colorMode) entries.push(["color", state.colorMode]);
  if (state.focusPath) entries.push(["focus", state.focusPath]);
  if (state.filePath) entries.push(["file", state.filePath]);
  if (state.tab) entries.push(["tab", state.tab]);
  if (state.symbolName) entries.push(["symbol", state.symbolName]);
  if (state.showLabels !== null) {
    entries.push(["labels", state.showLabels ? "1" : "0"]);
  }
  if (source.snapshotUrl) entries.push(["src", source.snapshotUrl]);
  if (source.reportUrl) entries.push(["report", source.reportUrl]);

  const parts = entries.map(([key, value]) => `${key}=${encodeValue(value)}`);
  const preserved = params.toString();
  if (preserved) parts.unshift(preserved);
  return parts.length === 0 ? "" : `?${parts.join("&")}`;
}

/**
 * Codifica un valor de query string dejando legibles las rutas y las URLs.
 *
 * `encodeURIComponent` escapa `/` y `:`, que en un valor de query string son
 * seguros y hacen el enlace mucho más legible. Los separadores (`&`, `=`, `+`)
 * se mantienen escapados para no romper el parseo.
 */
function encodeValue(value: string): string {
  return encodeURIComponent(value).replace(
    /%(2F|3A|40|24|2C|3B|21|2A|27|28|29|7E)/g,
    (match) => decodeURIComponent(match)
  );
}
