import { motion } from "motion/react";
import { VEREDICTOS, fechaCorta, guia } from "../lib/guia";

/**
 * La guía: sus ideas por día ✓ ✓.
 *
 * El contenido sale del repo ✓ ✓ (ADR 0034 ✅ ✅): el markdown es la verdad
 * ✅ ✅ y aquí solo se le pone color ✅ ✅ y movimiento ✅ ✅ ✅. La línea del
 * tiempo ✓ ✅ vive en el header ✓ ✅ ✅ (el componente `LineaTiempo` ✓ ✅ ✅).
 */

export default function Guia() {
  const { introduccion, dias, futuras } = guia();

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
          className="mb-14"
        >
          <div className="mb-6 flex items-center gap-3 border-t border-line pt-6">
            <span
              aria-hidden="true"
              className="relative flex size-2.5 shrink-0 items-center justify-center"
            >
              <span className="absolute inset-0 rounded-full bg-cobalt/15" />
              <span className="relative size-1.5 rounded-full bg-cobalt" />
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              {fechaCorta(dia.fecha)}
            </h2>
            <span className="font-mono text-[0.68rem] tracking-[0.12em] text-muted uppercase">
              {dia.entradas.length} idea{dia.entradas.length === 1 ? "" : "s"}
            </span>
            <span
              aria-hidden="true"
              className="h-px min-w-6 flex-1 bg-gradient-to-r from-line to-transparent"
            />
          </div>

          {dia.entradas.map((entrada) => {
            const veredicto = VEREDICTOS[entrada.veredicto];
            return (
              <article key={entrada.id} id={entrada.id} className="mb-8">
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
        data-fecha="futuro"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        className="mb-14 border-t border-dashed border-line-strong pt-8"
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
            <article key={entrada.id} id={entrada.id} className="mb-8">
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
