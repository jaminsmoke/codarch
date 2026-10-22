import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { VEREDICTOS, guia } from "../lib/guia";

/**
 * La guía: sus ideas en una línea del tiempo ✓ ✓.
 *
 * El contenido sale del repo ✓ ✓ (ADR 0034 ✅ ✅): el markdown es la verdad
 * ✅ ✅ y aquí solo se le pone color ✓ ✅ y movimiento ✅ ✅ ✅.
 */

/** El color de cada veredicto. */
const COLORES: Record<string, string> = {
  idea: "bg-violet",
  fase: "bg-patina",
  arreglo: "bg-ochre",
  esperar: "bg-rust",
  otro: "bg-line-strong"
};

export default function Guia() {
  const { introduccion, entradas } = guia();
  const [activa, setActiva] = useState<string>(entradas[0]?.id ?? "");

  // La entrada que estás leyendo: la que más se ve en pantalla.
  useEffect(() => {
    const observador = new IntersectionObserver(
      (vistos) => {
        for (const visto of vistos) {
          if (visto.isIntersecting) setActiva(visto.target.id);
        }
      },
      { rootMargin: "-25% 0px -60% 0px" }
    );
    for (const entrada of entradas) {
      const nodo = document.getElementById(entrada.id);
      if (nodo) observador.observe(nodo);
    }
    return () => observador.disconnect();
  }, [entradas]);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      <header className="mb-8">
        <p className="font-mono text-xs tracking-[0.22em] text-muted uppercase">
          CodArch
        </p>
        <h1 className="font-display mt-1 text-4xl font-bold tracking-tight">
          La guía
        </h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Lo que se ha pensado y lo que queda. Cada idea tiene su veredicto, y
          las que ya son fase viven en la hoja de ruta de su decisión.
        </p>
      </header>

      <nav
        aria-label="Línea del tiempo de las ideas"
        className="sticky top-16 z-10 -mx-5 mb-10 border-y border-line bg-paper/90 px-5 py-4 backdrop-blur"
      >
        <ol className="flex items-start justify-between gap-2">
          {entradas.map((entrada) => {
            const veredicto = VEREDICTOS[entrada.veredicto];
            const esActiva = activa === entrada.id;
            return (
              <li key={entrada.id} className="group relative flex flex-1 justify-center">
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(entrada.id)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="flex w-full flex-col items-center gap-2"
                  title={entrada.titulo}
                >
                  <span
                    className={[
                      "h-3 w-3 rounded-full border-2 transition-all duration-200",
                      COLORES[entrada.veredicto] ?? COLORES.otro,
                      esActiva
                        ? "scale-150 border-cobalt bg-cobalt"
                        : "border-line-strong bg-paper group-hover:scale-125"
                    ].join(" ")}
                  />
                  <span
                    className={[
                      "font-mono text-[0.65rem] whitespace-nowrap transition-colors",
                      esActiva ? "font-semibold text-ink" : "text-muted"
                    ].join(" ")}
                  >
                    {entrada.fecha.slice(8, 10)}
                    {"/"}
                    {entrada.fecha.slice(5, 7)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div
        className="prosa-guia mb-12"
        dangerouslySetInnerHTML={{ __html: introduccion }}
      />

      {entradas.map((entrada) => {
        const veredicto = VEREDICTOS[entrada.veredicto];
        return (
          <motion.section
            key={entrada.id}
            id={entrada.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
            className="mb-10 scroll-mt-28 border-t border-line pt-8"
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-ink-soft">
                {veredicto.icono} {veredicto.texto}
              </span>
              <span className="font-mono text-xs text-muted">{entrada.fecha}</span>
            </div>
            <h2 className="font-display mb-3 text-2xl font-bold tracking-tight">
              {entrada.titulo}
            </h2>
            <div
              className="prosa-guia"
              dangerouslySetInnerHTML={{ __html: entrada.html }}
            />
          </motion.section>
        );
      })}
    </div>
  );
}
