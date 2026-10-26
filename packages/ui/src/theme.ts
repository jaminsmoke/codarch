import { localStore } from "./storage";

/**
 * El tema de la app: claro, oscuro o el del sistema (ADR 0084).
 *
 * Es una preferencia de la máquina, no del repositorio: se guarda en el
 * almacenamiento de la app, junto a las secciones plegadas. Aquí se resuelve
 * —«el sistema» pasa a claro u oscuro—, porque lo que atiende el CSS es un solo
 * caso: `data-theme` en `<html>`.
 */
export const CLAVE_TEMA = "codarch-theme";

export type Tema = "light" | "dark" | "system";

/** El tema que se aplica de verdad, ya resuelto. */
export type TemaEfectivo = "light" | "dark";

/** Las tres opciones, en el orden en que se ofrecen en Ajustes. */
export const TEMAS: readonly Tema[] = ["system", "light", "dark"];

/** Lo que no sea una de las tres opciones se lee como «el del sistema». */
export function parseTema(valor: unknown): Tema {
  return typeof valor === "string" &&
    (TEMAS as readonly string[]).includes(valor)
    ? (valor as Tema)
    : "system";
}

/** El tema que toca: el elegido, o el del sistema si no se eligió ninguno. */
export function temaEfectivo(
  tema: Tema,
  prefiereOscuro: boolean
): TemaEfectivo {
  if (tema === "system") return prefiereOscuro ? "dark" : "light";
  return tema;
}

/** El tema guardado en la máquina; sin nada guardado, el del sistema. */
export function leerTema(store: Storage | null = localStore()): Tema {
  try {
    return parseTema(store?.getItem(CLAVE_TEMA));
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
export function escribirTema(
  tema: Tema,
  store: Storage | null = localStore()
): void {
  try {
    store?.setItem(CLAVE_TEMA, tema);
  } catch {
    // Sin almacenamiento, la elección vive lo que viva la pestaña.
  }
}

/** Si el sistema pide oscuro. Sin `matchMedia`, se queda en claro. */
export function prefiereOscuro(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Escribe el tema en el documento: `data-theme` para el CSS y `color-scheme`
 * para lo que pinta el navegador —barras de scroll, campos nativos—.
 */
export function aplicarTema(
  tema: Tema,
  oscuroDelSistema: boolean,
  root?: HTMLElement | null
): TemaEfectivo {
  const efectivo = temaEfectivo(tema, oscuroDelSistema);
  const nodo =
    root ?? (typeof document === "undefined" ? null : document.documentElement);
  if (nodo) {
    nodo.dataset.theme = efectivo;
    nodo.style.colorScheme = efectivo;
  }
  return efectivo;
}

/**
 * Aplica el tema guardado antes de montar la app.
 *
 * Lo llaman los `main.tsx` de la web y del escritorio: así la primera pintura
 * ya sale en el tema elegido y no hay fogonazo del contrario.
 */
export function aplicarTemaGuardado(
  root?: HTMLElement | null
): TemaEfectivo {
  return aplicarTema(leerTema(), prefiereOscuro(), root);
}
