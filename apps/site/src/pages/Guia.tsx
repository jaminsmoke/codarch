import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { VEREDICTOS, fechaCorta, guia } from "../lib/guia";

/**
 * La guía: sus ideas por día ✓ ✓.
 *
 * El contenido sale del repo ✓ ✓ (ADR 0034 ✅ ✅): el markdown es la verdad
 * ✅ ✅ y aquí solo se le pone color ✓ ✅ y movimiento ✅ ✅ ✅.
 */

/** El color de cada veredicto ✓ ✓. */
const COLORES: Record<string, string> = {
  idea: "bg-violet",
  fase: "bg-patina",
  arreglo: "bg-ochre",
  esperar: "bg-rust",
  otro: "bg-line-strong"
};

export default function Guia() {
  const { introduccion, dias, futuras } = guia();
  const [activo, setActivo] = useState<string>(dias[0]?.fecha ?? "");

  // El día que estás leyendo: el que más se ve en pantalla ✓ ✅.
  useEffect(() => {
    const observador = new IntersectionObserver(
      (vistos) => {
        for (const visto of vistos) {
          if (visto.isIntersecting) {
            setActivo((visto.target as HTMLElement).dataset.fecha ?? "");
          }
        }
      },
      { rootMargin: "-30% 0px -55% 0px" }
    );
    for (const dia of dias) {
      const nodo = document.getElementById(`dia-${dia.fecha}`);
      if (nodo) observador.observe(nodo);
    }
    return () => observador.disconnect();
  }, [dias]);

  const irA = (ancla: string) => {
    document.getElementById(ancla)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      <header className="mb-10">
        <p className="font-mono text-xs tracking-[0.22em] text-muted uppercase">
          CodArch
        </p>
        <h1 className="font-display mt-1 text-4xl font-bold tracking-tight">
          La guía
        </h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Lo que se ha pensado y lo que queda. Cada día tiene sus ideas y cada
          idea, su veredicto.
        </p>
      </header>

      <div
        className="prosa-guia mb-4"
        dangerouslySetInnerHTML={{ __html: introduccion }}
      />

      {/* La línea del tiempo: un nodo por día, y la línea los atraviesa ✓ ✅. */}
      <nav
        aria-label="Los días de la guía"
        className="linea-tiempo my-12"
        style={{ "--n": dias.length + 1 } as React.CSSProperties}
      >
        <ol className="relative flex items-start">
          {dias.map((dia) => {
            const esActivo = activo === dia.fecha;
            const diaTienen = dia.entradas.length;
            return (
              <li key={dia.fecha} className="relative flex-1">
                <button
                  type="button"
                  onClick={() => irA(`dia-${dia.fecha}`)}
                  className="group flex w-full flex-col items-center gap-2.5"
                  title={`${fechaCorta(dia.fecha)} · ${diaTienen} idea${diaTienen === 1 ? "" : "s"}`}
                >
                  <span
                    className={[
                      "relative z-10 h-3.5 w-3.5 rounded-full border-2 transition-all duration-300",
                      esActivo
                        ? "scale-125 border-cobalt bg-cobalt"
                        : "border-line-strong bg-paper group-hover:scale-110"
                    ].join(" ")}
                  />
                  <span
                    className={[
                      "font-mono text-xs whitespace-nowrap transition-colors",
                      esActivo ? "font-semibold text-ink" : "text-muted"
                    ].join(" ")}
                  >
                    {fechaCorta(dia.fecha)}
                  </span>
                </button>
              </li>
            );
          })}

          {/* Y después, lo que falta ✓ ✅. */}
          <li className="relative flex-1">
            <button
              type="button"
              onClick={() => irA("futuro")}
              className="group flex w-full flex-col items-center gap-2.5"
              title="Lo que todavía no ha pasado"
            >
              <span className="relative z-10 h-3.5 w-3.5 rounded-full border-2 border-dashed border-line-strong bg-paper transition-transform duration-300 group-hover:scale-110" />
              <span className="font-mono text-xs whitespace-nowrap text-muted">
                futuro
              </span>
            </button>
          </li>
        </ol>
      </nav>

      {/* Los días, con sus ideas ✓ ✅. */}
      {dias.map((dia) => (
        <motion.section
          key={dia.fecha}
          id={`dia-${dia.fecha}`}
          data-fecha={dia.fecha}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
          className="mb-14 scroll-mt-28 border-t border-line pt-8"
        >
          <h2 className="font-display mb-6 flex items-baseline gap-3 text-2xl font-bold tracking-tight">
            {fechaCorta(dia.fecha)}
            <span className="font-mono text-xs font-normal text-muted">
              {dia.entradas.length} idea{dia.entradas.length === 1 ? "" : "s"}
            </span>
          </h2>

          {dia.entradas.map((entrada) => {
            const veredicto = VEREDICTOS[entrada.veredicto];
            return (
              <article key={entrada.id} id={entrada.id} className="mb-8 scroll-mt-28">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-ink-soft">
                    {veredicto.icono} {veredicto.texto}
                  </span>
                </div>
                <h3 className="font-display mb-2 text-xl font-bold tracking-tight">
                  {entrada.titulo}
                </h3>
                <div
                  className="prosa-guia"
                  dangerouslySetInnerHTML={{ __html: entrada.html }}
                />
              </article>
            );
          })}
        </motion.section>
      ))}

      {/* Lo que falta ✓ ✅. */}
      <motion.section
        id="futuro"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        className="mb-14 scroll-mt-28 border-t border-dashed border-line-strong pt-8"
      >
        <h2 className="font-display mb-2 text-2xl font-bold tracking-tight">
          Futuro
        </h2>
        <p className="mt-0 mb-6 max-w-2xl text-ink-soft">
          Las ideas que esperan su turno: están aquí ✓ ✓ porque no se pierden
          ✓ ✓, no porque el trabajo esté hecho ✓ ✗ ✅. Lo que sí se está
          haciendo, en el{" "}
          <a
            className="text-cobalt"
            href="https://github.com/jaminsmoke/codarch/blob/main/docs/roadmap.md"
          >
            roadmap
          </a>
          .
        </p>

        {futuras.map((entrada) => {
          const veredicto = VEREDICTOS[entrada.veredicto];
          return (
            <article key={entrada.id} id={entrada.id} className="mb-8 scroll-mt-28">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-ink-soft">
                  {veredicto.icono} {veredicto.texto}
                </span>
              </div>
              <h3 className="font-display mb-2 text-xl font-bold tracking-tight">
                {entrada.titulo}
              </h3>
              <div
                className="prosa-guia"
                dangerouslySetInnerHTML={{ __html: entrada.html }}
              />
            </article>
          );
        })}
      </motion.section>
    </div>
  );
}
