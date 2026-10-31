import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore
} from "react";
import {
  applyTheme,
  writeTheme,
  readTheme,
  effectiveTheme,
  type Theme,
  type EffectiveTheme
} from "./theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeDark(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isDarkNow(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(DARK_QUERY).matches;
}

export interface ThemeApp {
  /** Lo elegido: claro, oscuro o el del sistema. */
  theme: Theme;
  /** Lo que se está pintando, con «el sistema» ya resuelto. */
  effective: EffectiveTheme;
  /** Elige un tema, lo aplica y lo recuerda en esta máquina. */
  setTheme: (theme: Theme) => void;
}

/**
 * El tema de la app, aplicado al documento (ADR 0084).
 *
 * Vive en la UI compartida: la web y el escritorio eligen en el mismo sitio y
 * guardan en el mismo almacenamiento. Mientras la opción sea «el sistema», se
 * escucha `prefers-color-scheme` y el tema cambia con él sin recargar.
 */
export function useTheme(): ThemeApp {
  const [theme, setThemeState] = useState<Theme>(() => readTheme());
  const dark = useSyncExternalStore(
    subscribeDark,
    isDarkNow,
    () => false
  );
  const effective = effectiveTheme(theme, dark);

  useEffect(() => {
    applyTheme(theme, dark);
  }, [theme, dark]);

  const setTheme = useCallback((next: Theme) => {
    writeTheme(next);
    setThemeState(next);
  }, []);

  return { theme, effective, setTheme };
}
