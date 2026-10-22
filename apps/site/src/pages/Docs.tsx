import { motion } from "motion/react";
import { ArrowRight, ScrollText } from "lucide-react";
import { Link } from "react-router-dom";
import { carpetasAdr, documentosProducto, indiceAdr } from "../lib/docs";
import { useTitulo } from "../lib/titulo";

/**
 * Los documentos ✓ ✅: el índice de lo que se lee ✓ ✅.
 *
 * El producto arriba ✓ ✅ y las decisiones en sus carpetas de diez ✓ ✅: la
 * página no guarda texto ✓ ✗ ✅, solo ordena el markdown del repo ✅ ✅.
 */

export default function Docs() {
  useTitulo(
    "Los documentos",
    "El modelo, las reglas, el roadmap y las decisiones de CodArch, generados del repositorio."
  );
  const producto = documentosProducto();
  const carpetas = carpetasAdr();
  const indice = indiceAdr();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.22em] text-muted uppercase">
          Documentación
        </p>
        <h1 className="font-display mt-1 text-4xl font-bold tracking-tight">
          Los documentos
        </h1>
        <p className="mt-3 text-ink-soft">
          Cómo funciona CodArch por dentro y por qué es así. Todo sale del
          markdown del repositorio: cada decisión lleva su ADR, con su hoja de
          ruta al lado, y nada se copia a mano aquí.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="font-mono text-[0.68rem] tracking-[0.18em] text-muted uppercase">
          El producto
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {producto.map((documento, indice) => (
            <motion.div
              key={documento.clave}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: indice * 0.04,
                ease: [0.22, 0.61, 0.36, 1]
              }}
            >
              <Link
                to={documento.ruta}
                className="group flex h-full flex-col rounded-card border border-line bg-panel p-5 no-underline transition-colors hover:border-line-strong"
              >
                <span className="font-display flex items-center gap-2 text-lg font-bold text-ink">
                  {documento.titulo}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-cobalt"
                  />
                </span>
                <span className="mt-1.5 text-sm text-ink-soft">
                  {documento.descripcion}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-mono text-[0.68rem] tracking-[0.18em] text-muted uppercase">
            Las decisiones
          </h2>
          <p className="text-sm text-muted">
            Un ADR por decisión, en carpetas de diez, con su hoja de ruta al
            lado.
          </p>
          {indice ? (
            <Link
              to={indice.ruta}
              className="ml-auto text-sm text-cobalt no-underline hover:underline"
            >
              El índice completo
            </Link>
          ) : null}
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {carpetas.map((carpeta, indice) => {
            const adrs = carpeta.documentos.filter(
              (documento) => !documento.esHoja
            );
            return (
              <motion.section
                key={carpeta.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.4,
                  delay: indice * 0.04,
                  ease: [0.22, 0.61, 0.36, 1]
                }}
                aria-labelledby={`carpeta-${carpeta.id}`}
                className="rounded-card border border-line bg-panel p-4"
              >
                <h3
                  id={`carpeta-${carpeta.id}`}
                  className="mb-2 flex items-baseline gap-2 font-mono text-xs tracking-[0.14em] text-ink-soft"
                >
                  {carpeta.etiqueta}
                  <span className="ml-auto rounded-full bg-ink/6 px-1.5 py-0.5 text-[0.6rem] text-muted tabular-nums">
                    {adrs.length}
                  </span>
                </h3>
                <ul className="space-y-1">
                  {adrs.map((adr) => {
                    const hoja = carpeta.documentos.find(
                      (documento) => documento.clave === `${adr.clave}.roadmap`
                    );
                    return (
                      <li key={adr.clave} className="flex items-start gap-1.5">
                        <Link
                          to={adr.ruta}
                          className="text-sm leading-snug text-ink-soft no-underline transition-colors hover:text-cobalt"
                        >
                          {adr.titulo}
                        </Link>
                        {hoja ? (
                          <Link
                            to={hoja.ruta}
                            title="Su hoja de ruta"
                            aria-label={`La hoja de ruta de ${adr.titulo}`}
                            className="mt-0.5 shrink-0 text-muted transition-colors hover:text-cobalt"
                          >
                            <ScrollText aria-hidden="true" className="size-3" />
                          </Link>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </motion.section>
            );
          })}
        </div>
      </section>

      <p className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        ¿Buscas lo que todavía no se ha hecho? Está en
        <Link to="/guia/" className="text-cobalt">
          la guía
        </Link>
        .
      </p>
    </div>
  );
}
