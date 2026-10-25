import type { ReactNode } from "react";
import type { RenderModel } from "@codarch/render/browser";

/**
 * El contrato entre CodArch y sus plugins.
 *
 * Un plugin es una pieza del repo (ADR 0028) que se activa desde los ajustes y
 * **contribuye** con algo concreto: una vista, un panel, un modo de color.
 *
 * El contexto es **pequeño y explícito** a propósito: si la vista 3D cabe
 * aquí, cualquier otro plugin cabe también.
 */

/** El manifiesto de un plugin: su `plugin.json`. */
export interface PluginManifest {
  /** El identificador: el nombre de su carpeta. */
  name: string;
  version: string;
  /** El nombre que se ve. */
  title: string;
  /** Una frase de qué hace. */
  description?: string;
  /** El icono del store (un nombre corto, no un SVG). */
  icon?: string;
  /** Qué aporta el plugin. */
  contributes?: PluginContributions;
  /** Qué necesita para funcionar. */
  requires?: PluginRequirements;
}

/**
 * Lo que un plugin puede aportar.
 *
 * Hoy, solo vistas ✓. Los paneles de la barra lateral **no** están: la app no
 * los pinta todavía ✓, y un contrato que promete lo que no hace se pudre ✓
 * (la guía, §4.1 ✓).
 */
export interface PluginContributions {
  /** Vistas para el mapa central. Cada una es una pestaña. */
  views?: PluginView[];
}

/** Lo que un plugin necesita. La app lo comprueba y lo dice. */
export interface PluginRequirements {
  /** Que el navegador tenga WebGL2. */
  webgl2?: boolean;
  /** Que el navegador tenga WebGPU. */
  webgpu?: boolean;
  /**
   * Que la máquina tenga GPU, la que sea: WebGPU o, si no, WebGL2.
   *
   * Es lo que pide un plugin que sabe dibujar con las dos ✓ (la vista 3D ✓):
   * exigir una sola le cerraría las máquinas que tienen la otra ✓.
   */
  gpu?: boolean;
}

/** Los runtimes con los que se puede dibujar ✓, de mejor a más viejo ✓. */
export type PluginBackend = "webgpu" | "webgl2";

/** Lo que la app sabe de la máquina, para comprobar los requisitos. */
export interface PluginCapabilities {
  /** Si el navegador tiene WebGL2. */
  webgl2: boolean;
  /** Si el navegador tiene WebGPU. */
  webgpu: boolean;
}

/** Las preferencias de la vista. */
export interface PluginPreferences {
  areaMetric: string | null;
  colorMode: string;
}

/** Lo que el plugin puede pedirle a la app. */
export interface PluginActions {
  /** Selecciona un fichero por su ruta. */
  select(path: string): void;
  /** Enfoca una carpeta por su ruta. */
  focus(path: string): void;
  /** Cambia la pestaña del panel derecho (`file`, `lenses`, `rules` o `pr`). */
  setTab(tab: "file" | "lenses" | "rules" | "pr"): void;
}

/** El estado de la vista en la URL. */
export interface PluginUrl {
  /** El estado actual. */
  read(): PluginUrlState;
  /** Escribe el estado (la app decide cómo se refleja en la URL). */
  write(state: Partial<PluginUrlState>): void;
}

export interface PluginUrlState {
  areaMetric: string | null;
  colorMode: string;
  focusPath: string | null;
  filePath: string | null;
  tab: "file" | "lenses" | "rules" | "pr" | null;
}

/**
 * Lo que recibe un plugin.
 *
 * Solo lo que hace falta para dibujar y para pedir cambios ✓. Un plugin no
 * escribe en el modelo ni en el snapshot ✓.
 */
export interface PluginContext {
  /** El mapa que se está viendo. */
  model: RenderModel | null;
  /** La ruta del fichero seleccionado. */
  selection: string | null;
  /** Lo que el plugin puede pedirle a la app. */
  actions: PluginActions;
  /** Las preferencias de la vista. */
  preferences: PluginPreferences;
  /**
   * El color de un fichero, el mismo que en el mapa ✓.
   *
   * Para que un plugin dibuje **lo mismo** que el mapa ✓: el color depende
   * del modo de color de la app ✓ y ese criterio es de la app ✓.
   */
  colorFor(fileIndex: number): string;
  /** El estado de la URL. */
  url: PluginUrl;
  /** El almacenamiento local, si lo hay. */
  storage: Storage | null;
}

/** Una vista que el plugin añade al mapa central. */
export interface PluginView {
  /** El identificador de la pestaña. */
  id: string;
  /** Lo que se ve en la pestaña. */
  label: string;
  /** Dibuja la vista. */
  render(context: PluginContext): ReactNode;
}

/** Un plugin ya cargado. */
export interface Plugin {
  manifest: PluginManifest;
  views?: PluginView[];
}

/**
 * Lo que exporta el código de un plugin.
 *
 * El manifiesto va aparte (en su `plugin.json` ✓): el código solo aporta las
 * vistas y los paneles ✓. Así el store puede listar los plugins **sin**
 * descargar su código ✓.
 */
export interface PluginModule {
  views?: PluginView[];
}

/** Un plugin tal y como lo deja el manifiesto, antes de cargarlo. */
export interface PluginDescriptor {
  manifest: PluginManifest;
  /** Carga el código del plugin. */
  load(): Promise<PluginModule>;
}

/**
 * Comprueba si la app cumple lo que un plugin necesita.
 *
 * Lo que no se puede saber (una GPU concreta ✓) lo decide quien despliega ✓.
 */
export function checkRequirements(
  manifest: PluginManifest,
  capabilities: PluginCapabilities
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  const requires = manifest.requires ?? {};
  if (requires.gpu && !capabilities.webgpu && !capabilities.webgl2) {
    missing.push("GPU");
  }
  if (requires.webgl2 && !capabilities.webgl2) {
    missing.push("WebGL2");
  }
  if (requires.webgpu && !capabilities.webgpu) {
    missing.push("WebGPU");
  }
  return { ok: missing.length === 0, missing };
}

/**
 * El runtime con el que la app dibujará un plugin en esta máquina ✓.
 *
 * Lo que el plugin exige manda ✓; si solo pide «GPU» ✓, se usa el mejor que
 * haya ✓, que es el mismo criterio que sigue three ✓ al elegir backend ✓.
 * `null` es que no dibuja o que no puede ✓.
 */
export function pluginBackend(
  manifest: PluginManifest,
  capabilities: PluginCapabilities
): PluginBackend | null {
  const requires = manifest.requires ?? {};
  if (requires.webgpu) return capabilities.webgpu ? "webgpu" : null;
  if (requires.webgl2) return capabilities.webgl2 ? "webgl2" : null;
  if (!requires.gpu) return null;
  if (capabilities.webgpu) return "webgpu";
  return capabilities.webgl2 ? "webgl2" : null;
}

/** Si el navegador tiene WebGL2. */
export function hasWebgl2(): boolean {
  try {
    if (typeof document === "undefined") return false;
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  } catch {
    return false;
  }
}

/** Si el navegador tiene WebGPU ✓ (sin pedir dispositivo: no arranca la GPU ✓). */
export function hasWebgpu(): boolean {
  try {
    if (typeof navigator === "undefined") return false;
    const gpu = (navigator as Navigator & { gpu?: unknown }).gpu;
    return gpu !== undefined && gpu !== null;
  } catch {
    return false;
  }
}
