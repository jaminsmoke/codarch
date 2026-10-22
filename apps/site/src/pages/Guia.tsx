import {
  ArrowDown,
  Beaker,
  Check,
  ChevronDown,
  Hourglass,
  Pin,
  Wrench,
  type LucideIcon
} from "lucide-react";
import { motion } from "motion/react";
import { type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { enlaceInterno } from "../lib/enlaces";
import {
  CATEGORIAS,
  VEREDICTOS,
  fechaCorta,
  fechaPartida,
  guia,
  type Veredicto
} from "../lib/guia";
import { useTitulo } from "../lib/titulo";

/**
 * La guía: sus días, cada uno como un changelog (ADR 0035).
 *
 * El contenido sale del repo (ADR 0034): el markdown es la verdad y aquí solo
 * se agrupa, se le pone color y movimiento. La línea del tiempo vive en el
 * header (el componente `LineaTiempo`).
 */

/** El icono de cada veredicto. */
const ICONOS: Record<Veredicto, LucideIcon> = {
  idea: Beaker,
  fase: Check,
  arreglo: Wrench,
  esperar: Hourglass,
  otro: Pin
};

/** El color de una categoría o un veredicto, como variable de CSS. */
function tono(color: string): CSSProperties {
  return { "--tono": color } as CSSProperties;
}

/** La etiqueta de un veredicto, con su icono y su color. */
function Etiqueta({ veredicto }: { veredicto: Veredicto }) {
  const meta = VEREDICTOS[veredicto];
  const Icono = ICONOS[veredicto];
  return (
    <span style={tono(meta.color)} className="guia-veredicto">
      <Icono aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
      {meta.texto}
    </span>
  );
}

export default function Guia() {
  useTitulo(
    "La guía",
    "Lo que se ha pensado y lo que queda: cada día de CodArch como un changelog, con el veredicto de cada idea."
  );
  const { introduccion, normas, dias, futuras } = guia();
  const navegar = useNavigate();
  const total = dias.reduce((cuenta, dia) => cuenta + dia.entradas.length, 0);
  const categorias = new Set(
    dias.flatMap((dia) => dia.grupos.map((grupo) => grupo.categoria))
  );

  return (
    <div
      className="mx-auto w-full max-w-5xl px-5 py-10"
      onClick={(evento) => enlaceInterno(evento, navegar)}
    >
      <header className="mb-10">
        <p className="font-mono text-xs tracking-[0.22em] text-cobalt uppercase">
          El registro
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div>
            <h1 className="font-display text-5xl leading-none font-bold tracking-tight sm:text-6xl">
              La guía
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
              Lo que se ha pensado y lo que queda. Cada día es un changelog:
              sus novedades, sus arreglos y lo demás, con el veredicto de cada
              idea.
            </p>
          </div>
          <dl className="flex shrink-0 gap-6">
            {[
              ["días", dias.length],
              ["ideas", total],
              ["categorías", categorias.size]
            ].map(([etiqueta, cuenta]) => (
              <div key={etiqueta}>
                <dt className="font-mono text-[0.62rem] tracking-[0.14em] text-muted uppercase">
                  {etiqueta}
                </dt>
                <dd className="font-display mt-0.5 text-2xl font-bold tabular-nums">
                  {cuenta}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div
        className="prosa prosa-guia guia-entradilla"
        dangerouslySetInnerHTML={{ __html: introduccion }}
      />

      {dias.map((dia) => {
        const fecha = fechaPartida(dia.fecha);
        return (
          <motion.section
            key={dia.fecha}
            id={`dia-${dia.fecha}`}
            data-fecha={dia.fecha}
            initial={{ opacity: 1, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
            className="guia-dia"
          >
            <header className="guia-dia-cabecera">
              <h2
                className="guia-fecha"
                aria-label={`${fecha.dia} de ${fecha.mes} de ${fecha.anio}`}
              >
                <span className="guia-fecha-dia">{fecha.dia}</span>
                <span className="guia-fecha-mes">
                  {fecha.mes}
                  <span className="guia-fecha-anio">{fecha.anio}</span>
                </span>
              </h2>
              <div className="min-w-0">
                <p className="font-mono text-[0.66rem] tracking-[0.14em] text-muted uppercase">
                  {dia.entradas.length} idea{dia.entradas.length === 1 ? "" : "s"}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {dia.grupos.map((grupo) => {
                    const categoria = CATEGORIAS[grupo.categoria];
                    return (
                      <li
                        key={grupo.categoria}
                        style={tono(categoria.color)}
                        className="guia-chip"
                      >
                        <span aria-hidden="true" className="guia-chip-punto" />
                        {categoria.texto}
                        <span className="guia-chip-cuenta">
                          {grupo.entradas.length}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </header>

            <div className="guia-grupos">
              {dia.grupos.map((grupo) => {
                const categoria = CATEGORIAS[grupo.categoria];
                return (
                  <section
                    key={grupo.categoria}
                    aria-label={categoria.texto}
                    style={tono(categoria.color)}
                    className="guia-grupo"
                  >
                    <h3 className="guia-grupo-cabecera">
                      <span aria-hidden="true" className="guia-grupo-punto" />
                      <span className="guia-grupo-nombre">
                        {categoria.texto}
                      </span>
                      <span className="guia-grupo-cuenta">
                        {grupo.entradas.length}
                      </span>
                      <span aria-hidden="true" className="guia-grupo-linea" />
                    </h3>

                    {grupo.entradas.map((entrada) => (
                      <article
                        key={entrada.id}
                        id={entrada.id}
                        className="guia-entrada"
                      >
                        <div className="guia-entrada-cabecera">
                          <h4 className="guia-entrada-titulo">
                            {entrada.titulo}
                          </h4>
                          <a
                            href={`#${entrada.id}`}
                            aria-label={`Enlace a ${entrada.titulo}`}
                            className="guia-ancla"
                          >
                            #
                          </a>
                        </div>
                        <div className="guia-entrada-meta">
                          <Etiqueta veredicto={entrada.veredicto} />
                        </div>
                        <div
                          className="prosa prosa-guia"
                          dangerouslySetInnerHTML={{ __html: entrada.html }}
                        />
                      </article>
                    ))}
                  </section>
                );
              })}
            </div>
          </motion.section>
        );
      })}

      <motion.section
        id="futuro"
        data-fecha="futuro"
        initial={{ opacity: 1, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        className="guia-futuro"
      >
        <p className="font-mono text-[0.66rem] tracking-[0.16em] text-muted uppercase">
          Lo que espera
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Futuro
          </h2>
          <span className="guia-contador">
            {futuras.length} {futuras.length === 1 ? "idea" : "ideas"}
          </span>
        </div>
        <p className="mt-3 mb-7 max-w-2xl text-ink-soft">
          Las ideas que esperan su turno: están aquí porque no se pierden, no
          porque el trabajo esté hecho. Cada una lleva a su día, donde se
          escribió. Lo que sí se está haciendo, en el{" "}
          <a
            className="text-cobalt"
            href="https://github.com/jaminsmoke/codarch/blob/main/docs/roadmap.md"
          >
            roadmap
          </a>
          .
        </p>

        <ul className="guia-futuro-lista">
          {futuras.map((entrada) => {
            const categoria = CATEGORIAS[entrada.categoria];
            return (
              <li
                key={entrada.id}
                style={tono(categoria.color)}
                className="guia-futuro-item"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="guia-chip">
                    <span aria-hidden="true" className="guia-chip-punto" />
                    {categoria.texto}
                  </span>
                  <Etiqueta veredicto={entrada.veredicto} />
                  <span className="ml-auto font-mono text-[0.66rem] tracking-[0.08em] text-muted uppercase">
                    {fechaCorta(entrada.fecha)}
                  </span>
                </div>
                <h3 className="font-display mt-2 text-xl font-bold tracking-tight">
                  {entrada.titulo}
                </h3>
                <p className="mt-1 mb-3 text-sm leading-relaxed text-ink-soft">
                  {entrada.resumen}
                </p>
                <a
                  href={`#${entrada.id}`}
                  className="inline-flex items-center gap-1.5 font-mono text-[0.66rem] tracking-[0.1em] text-cobalt uppercase no-underline"
                >
                  <ArrowDown aria-hidden="true" className="size-3" />
                  Leer la idea
                </a>
              </li>
            );
          })}
        </ul>
      </motion.section>

      {normas ? (
        <details className="guia-normas">
          <summary>
            <span className="font-display text-lg font-bold tracking-tight">
              Cómo se escribe esta guía
            </span>
            <span className="ml-auto font-mono text-[0.64rem] tracking-[0.1em] text-muted uppercase">
              La leyenda, las categorías y las reglas
            </span>
            <ChevronDown
              aria-hidden="true"
              className="guia-normas-flecha size-4 text-muted"
              strokeWidth={2.2}
            />
          </summary>
          <div
            className="prosa prosa-guia guia-normas-cuerpo"
            dangerouslySetInnerHTML={{ __html: normas }}
          />
        </details>
      ) : null}
    </div>
  );
}
