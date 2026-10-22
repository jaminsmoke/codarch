import { useEffect, type RefObject } from "react";

/**
 * Los diagramas Mermaid del markdown ✓ ✅ (ADR 0031 ✓).
 *
 * `mermaid` pesa ✓: se carga **solo** cuando la página trae un diagrama ✓ ✅,
 * y después de pintar el texto ✓ ✅. Si un diagrama está mal ✓, se queda su
 * código ✓ ✅: el documento se lee igual ✅ ✅.
 */

let cargado: Promise<typeof import("mermaid")> | null = null;

/** Sustituye cada bloque `mermaid` por su dibujo. */
export async function pintarDiagramas(raiz: HTMLElement): Promise<void> {
  const codigos = [
    ...raiz.querySelectorAll<HTMLElement>("pre > code.language-mermaid")
  ];
  if (codigos.length === 0) return;

  cargado ??= import("mermaid");
  const { default: mermaid } = await cargado;
  const oscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: oscuro ? "dark" : "neutral",
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
  });

  let numero = 0;
  for (const codigo of codigos) {
    const pre = codigo.parentElement;
    if (!pre) continue;
    const id = `diagrama-${++numero}`;
    try {
      const { svg } = await mermaid.render(id, codigo.textContent ?? "");
      const figura = document.createElement("figure");
      figura.className = "diagrama";
      figura.innerHTML = svg;
      pre.replaceWith(figura);
    } catch {
      pre.classList.add("diagrama-fallido");
    } finally {
      document.getElementById(`d${id}`)?.remove();
    }
  }
}

/** Pinta los diagramas cada vez que cambia el documento. */
export function useDiagramas(
  ref: RefObject<HTMLElement | null>,
  clave?: string
): void {
  useEffect(() => {
    if (ref.current) void pintarDiagramas(ref.current);
  }, [ref, clave]);
}
