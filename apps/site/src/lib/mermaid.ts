/**
 * Los diagramas Mermaid del markdown (ADR 0031 · ADR 0046).
 *
 * `mermaid` pesa; se carga solo cuando la página trae un diagrama. Si un
 * diagrama está mal, se queda su código y el documento se lee igual.
 */

let cargado: Promise<typeof import("mermaid")> | null = null;

/** Sustituye cada bloque `mermaid` por su dibujo. */
export async function pintarDiagramas(raiz: HTMLElement): Promise<void> {
  const codigos = [
    ...raiz.querySelectorAll<HTMLElement>('pre[data-language="mermaid"]')
  ];
  if (codigos.length === 0) return;

  cargado ??= import("mermaid");
  const { default: mermaid } = await cargado;
  const tema = document.documentElement.dataset.theme;
  const oscuro =
    tema === "dark" ||
    (tema !== "light" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: oscuro ? "dark" : "neutral",
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
  });

  let numero = 0;
  for (const codigo of codigos) {
    const id = `diagrama-${++numero}`;
    try {
      const fuente = codigo.innerText || codigo.textContent || "";
      const { svg } = await mermaid.render(id, fuente);
      const figura = document.createElement("figure");
      figura.className = "diagrama";
      figura.innerHTML = svg;
      codigo.replaceWith(figura);
    } catch {
      codigo.classList.add("diagrama-fallido");
    } finally {
      document.getElementById(`d${id}`)?.remove();
    }
  }
}
