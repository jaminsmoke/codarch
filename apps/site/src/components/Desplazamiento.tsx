import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Dónde se queda el scroll al cambiar de página ✓ ✅.
 *
 * Sin ancla ✓, se empieza arriba ✓ ✅; con ancla ✓, se salta al título ✓ ✅.
 * El documento puede llegar después ✓ (es un trozo aparte ✓): se espera al
 * ancla unas cuantas vueltas ✅ ✅.
 */
export default function Desplazamiento() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const id = decodeURIComponent(hash.slice(1));
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let vueltas = 0;
    let cuadro = 0;

    const buscar = (): void => {
      const nodo = document.getElementById(id);
      if (nodo) {
        nodo.scrollIntoView({
          behavior: suave ? "smooth" : "auto",
          block: "start"
        });
        return;
      }
      if (vueltas++ < 60) cuadro = requestAnimationFrame(buscar);
    };

    buscar();
    return () => cancelAnimationFrame(cuadro);
  }, [pathname, hash]);

  return null;
}
