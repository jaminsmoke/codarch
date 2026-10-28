import { useEffect, type RefObject } from "react";

/** Lo que hacen los atajos cuando no son suyos los que están escribiendo. */
export interface ShortcutHandlers {
  /** El buscador de la barra lateral, al que lleva `/`. */
  search: RefObject<HTMLInputElement | null>;
  openSettings: () => void;
  /** `Escape`: fuera el foco, el fichero abierto y la selección. */
  clear: () => void;
}

/**
 * Los atajos de la app: `/` al buscador, `Ctrl+,` a los ajustes y `Escape` a limpiar.
 *
 * Mientras se escribe en un campo, `/` es una barra y no un atajo: el evento se
 * deja pasar. `Escape` sí limpia también desde un campo, y además le quita el
 * foco, que es lo que se espera al salir de él.
 */
export function useShortcuts(handlers: ShortcutHandlers): void {
  const { search, openSettings, clear } = handlers;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      if (event.key === "/" && !typing) {
        event.preventDefault();
        search.current?.focus();
        return;
      }

      // Ctrl+, (Cmd en mac) abre los ajustes, como en cualquier app de escritorio.
      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        openSettings();
        return;
      }

      if (event.key !== "Escape") return;
      clear();
      if (typing) target.blur();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [search, openSettings, clear]);
}
