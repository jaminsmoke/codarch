import { localStore } from "./storage-local";

/**
 * El tema de la app: claro, oscuro o el del sistema (ADR 0084).
 *
 * Es una preferencia de la máquina, no del repositorio: se guarda en el
 * almacenamiento de la app, junto a las secciones plegadas. Aquí se resuelve
 * —«el sistema» pasa a claro u oscuro—, porque lo que atiende el CSS es un solo
 * caso: `data-theme` en `<html>`.
 */
export const THEME_KEY = "codarch-theme";

export type Theme = "light" | "dark" | "system";

/** El tema que se aplica de verdad, ya resuelto. */
export type EffectiveTheme = "light" | "dark";

/** Las tres opciones, en el orden en que se ofrecen en Ajustes. */
export const THEMES: readonly Theme[] = ["system", "light", "dark"];

/** Lo que no sea una de las tres opciones se lee como «el del sistema». */
export function parseTheme(value: unknown): Theme {
  return typeof value === "string" &&
    (THEMES as readonly string[]).includes(value)
    ? (value as Theme)
    : "system";
}

/** El tema que toca: el elegido, o el del sistema si no se eligió ninguno. */
export function effectiveTheme(
  theme: Theme,
  prefersDark: boolean
): EffectiveTheme {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}

/** El tema guardado en la máquina; sin nada guardado, el del sistema. */
export function readTheme(store: Storage | null = localStore()): Theme {
  try {
    return parseTheme(store?.getItem(THEME_KEY));
  } catch {
    return "system";
  }
}

/**
 * Guarda el tema elegido.
 *
 * Sin almacenamiento —modo privado, cuota llena— el tema vale para esta
 * sesión; la app no se rompe por no poder recordarlo.
 */
export function writeTheme(
  theme: Theme,
  store: Storage | null = localStore()
): void {
  try {
    store?.setItem(THEME_KEY, theme);
  } catch {
    // Sin almacenamiento, la elección vive lo que viva la pestaña.
  }
}

/** Si el sistema pide oscuro. Sin `matchMedia`, se queda en claro. */
export function prefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Escribe el tema en el documento: `data-theme` para el CSS y `color-scheme`
 * para lo que pinta el navegador —barras de scroll, campos nativos—.
 */
export function applyTheme(
  theme: Theme,
  systemDark: boolean,
  root?: HTMLElement | null
): EffectiveTheme {
  const effective = effectiveTheme(theme, systemDark);
  const node =
    root ?? (typeof document === "undefined" ? null : document.documentElement);
  if (node) {
    node.dataset.theme = effective;
    node.style.colorScheme = effective;
  }
  return effective;
}

/**
 * Aplica el tema guardado antes de montar la app.
 *
 * Lo llaman los `main.tsx` de la web y del escritorio: así la primera pintura
 * ya sale en el tema elegido y no hay fogonazo del contrario.
 */
export function applySavedTheme(
  root?: HTMLElement | null
): EffectiveTheme {
  return applyTheme(readTheme(), prefersDark(), root);
}
