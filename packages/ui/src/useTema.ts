import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore
} from "react";
import {
  aplicarTema,
  escribirTema,
  leerTema,
  temaEfectivo,
  type Tema,
  type TemaEfectivo
} from "./theme";

const CONSULTA = "(prefers-color-scheme: dark)";

function suscribirOscuro(cambia: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const consulta = window.matchMedia(CONSULTA);
  consulta.addEventListener("change", cambia);
  return () => consulta.removeEventListener("change", cambia);
}

function oscuroAhora(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(CONSULTA).matches;
}

export interface TemaApp {
  /** Lo elegido: claro, oscuro o el del sistema. */
  tema: Tema;
  /** Lo que se está pintando, con «el sistema» ya resuelto. */
  efectivo: TemaEfectivo;
  /** Elige un tema, lo aplica y lo recuerda en esta máquina. */
  setTema: (tema: Tema) => void;
}

/**
 * El tema de la app, aplicado al documento (ADR 0084).
 *
 * Vive en la UI compartida: la web y el escritorio eligen en el mismo sitio y
 * guardan en el mismo almacenamiento. Mientras la opción sea «el sistema», se
 * escucha `prefers-color-scheme` y el tema cambia con él sin recargar.
 */
export function useTema(): TemaApp {
  const [tema, setTemaState] = useState<Tema>(() => leerTema());
  const oscuro = useSyncExternalStore(
    suscribirOscuro,
    oscuroAhora,
    () => false
  );
  const efectivo = temaEfectivo(tema, oscuro);

  useEffect(() => {
    aplicarTema(tema, oscuro);
  }, [tema, oscuro]);

  const setTema = useCallback((siguiente: Tema) => {
    escribirTema(siguiente);
    setTemaState(siguiente);
  }, []);

  return { tema, efectivo, setTema };
}
