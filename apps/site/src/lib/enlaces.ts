import type { MouseEvent } from "react";
import type { NavigateFunction } from "react-router-dom";
import { conBase } from "./rutas";

/** Si un `href` del markdown es de este sitio ✓ ✅. */
export function esEnlaceInterno(href: string): boolean {
  return (
    href.startsWith(conBase("/docs/")) || href.startsWith(conBase("/guia/"))
  );
}

/**
 * Los enlaces del markdown navegan por el router ✓ ✅.
 *
 * El HTML de `marked` son `<a>` normales ✓ ✅: sin esto ✓, cada enlace interno
 * recargaría la página ✓ ✗ ✅. Un enlace de fuera ✓ o un ancla se quedan como
 * están ✅ ✅.
 */
export function enlaceInterno(
  evento: MouseEvent<HTMLElement>,
  navegar: NavigateFunction
): void {
  if (evento.defaultPrevented || evento.button !== 0) return;
  if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;

  const ancla = (evento.target as HTMLElement).closest("a");
  if (!ancla || ancla.target === "_blank" || ancla.hasAttribute("download")) return;

  const href = ancla.getAttribute("href");
  if (!href || !esEnlaceInterno(href)) return;

  evento.preventDefault();
  navegar(href.slice(conBase("").length));
}
