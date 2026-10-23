import { ArrowLeft, ArrowRight, Beaker, Check, ChevronDown, Hourglass, Pin, ScrollText, Wrench, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useEffect, type CSSProperties } from "react";
import clsx from "clsx";
import {
  CATEGORIAS,
  VEREDICTOS,
  fechaCorta,
  fechaPartida,
  rutaDia,
  type Categoria,
  type Dia,
  type ResumenDia,
  type Veredicto
} from "../lib/guia";
import { idiomaDe, t } from "../lib/i18n";
import { useTitulo } from "../lib/titulo";

/**
 * Un día de la guía, con su changelog (ADR 0035 · ADR 0047).
 *
 * La página del día pinta solo sus entradas; la línea del tiempo del header
 * lleva a los demás días. La cabecera solo se lee en `/guia/`.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** El icono de cada veredicto. */
const ICONOS: Record<Veredicto, LucideIcon> = {
  idea: Beaker,
  fase: Check,
  adr: ScrollText,
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

interface Props {
  dia: Dia;
  dias: ResumenDia[];
  esUltimo?: boolean;
  lang?: string;
}

export default function Guia({ dia, dias, esUltimo, lang = "es" }: Props) {
  const idioma = idiomaDe(lang);
  const fecha = fechaPartida(dia.fecha);
  const ultima = dias.at(-1)?.fecha ?? dia.fecha;
  const indice = dias.findIndex((d) => d.fecha === dia.fecha);
  const anterior = indice > 0 ? dias[indice - 1] : undefined;
  const siguiente =
    indice >= 0 && indice < dias.length - 1 ? dias[indice + 1] : undefined;
  const total = dias.reduce((cuenta, d) => cuenta + d.cuantas, 0);
  const categorias = new Set(dias.flatMap((d) => d.categorias));
  const [visibles, setVisibles] = useState<Set<Categoria>>(
    () => new Set(dia.grupos.map((grupo) => grupo.categoria))
  );
  const alternar = (categoria: Categoria) => {
    setVisibles((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(categoria)) siguiente.delete(categoria);
      else siguiente.add(categoria);
      return siguiente;
    });
  };
  const gruposVisibles = dia.grupos.filter((grupo) =>
    visibles.has(grupo.categoria)
  );

  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set());
  const alternarEntrada = (id: string) => {
    setAbiertos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  };
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id && dia.entradas.some((entrada) => entrada.id === id)) {
      setAbiertos(new Set([id]));
    }
  }, [dia]);

  useTitulo(
    `La guía — ${fecha.dia} de ${fecha.mes} de ${fecha.anio}`,
    `Las ideas del ${fecha.dia} de ${fecha.mes} de ${fecha.anio} en la guía de CodArch, con su veredicto.`
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      {esUltimo ? (
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
                [t(idioma, "guia.dias"), dias.length],
                [t(idioma, "guia.ideas"), total],
                [t(idioma, "guia.categorias"), categorias.size]
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
      ) : (
        <p className="mb-6 flex items-center gap-2 font-mono text-[0.66rem] tracking-[0.14em] text-muted uppercase">
          <a
            href={`${BASE}/guia/`}
            className="text-cobalt no-underline hover:underline"
          >
            La guía
          </a>
          <span aria-hidden="true" className="text-line-strong">
            /
          </span>
          {fechaCorta(dia.fecha)}
        </p>
      )}

      <motion.section
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
              {dia.entradas.length} idea
              {dia.entradas.length === 1 ? "" : "s"}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {dia.grupos.map((grupo) => {
                const categoria = CATEGORIAS[grupo.categoria];
                const activa = visibles.has(grupo.categoria);
                return (
                  <li key={grupo.categoria}>
                    <button
                      type="button"
                      onClick={() => alternar(grupo.categoria)}
                      aria-pressed={activa}
                      style={tono(categoria.color)}
                      className={
                        activa ? "guia-chip" : "guia-chip guia-chip--inactivo"
                      }
                    >
                      <span aria-hidden="true" className="guia-chip-punto" />
                      {categoria.texto}
                      <span className="guia-chip-cuenta">
                        {grupo.entradas.length}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!gruposVisibles.length ? (
                <li>
                  <button
                    type="button"
                    onClick={() =>
                      setVisibles(new Set(dia.grupos.map((g) => g.categoria)))
                    }
                    className="guia-chip"
                  >
                    Mostrar todas
                  </button>
                </li>
              ) : null}
            </ul>
          </div>
        </header>

        <div className="guia-grupos">
          {gruposVisibles.map((grupo) => {
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
                  <span className="guia-grupo-nombre">{categoria.texto}</span>
                  <span className="guia-grupo-cuenta">
                    {grupo.entradas.length}
                  </span>
                  <span aria-hidden="true" className="guia-grupo-linea" />
                </h3>

                {grupo.entradas.map((entrada) => {
                  const abierto = abiertos.has(entrada.id);
                  return (
                    <article
                      key={entrada.id}
                      id={entrada.id}
                      className="guia-entrada"
                    >
                      <div className="guia-entrada-fila">
                        <button
                          type="button"
                          onClick={() => alternarEntrada(entrada.id)}
                          aria-expanded={abierto}
                          className="guia-entrada-disparador"
                        >
                          <h4 className="guia-entrada-titulo">
                            {entrada.titulo}
                          </h4>
                          <span className="guia-entrada-meta">
                            <Etiqueta veredicto={entrada.veredicto} />
                          </span>
                          <ChevronDown
                            aria-hidden="true"
                            className={clsx(
                              "guia-entrada-chevron",
                              abierto && "guia-entrada-chevron--abierto"
                            )}
                          />
                        </button>
                        <a
                          href={`#${entrada.id}`}
                          aria-label={`Enlace a ${entrada.titulo}`}
                          className="guia-ancla"
                        >
                          #
                        </a>
                      </div>
                      <AnimatePresence initial={false}>
                        {abierto ? (
                          <motion.div
                            key="cuerpo"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              duration: 0.28,
                              ease: [0.22, 0.61, 0.36, 1]
                            }}
                            style={{ overflow: "hidden" }}
                          >
                            <div
                              className="prosa prosa-guia guia-entrada-cuerpo"
                              dangerouslySetInnerHTML={{ __html: entrada.html }}
                            />
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      </motion.section>

      <nav
        aria-label="Los días de la guía"
        className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-5"
      >
        {anterior ? (
          <a
            href={`${BASE}${rutaDia(anterior.fecha, ultima)}`}
            className="inline-flex items-center gap-1.5 font-mono text-[0.66rem] tracking-[0.1em] text-cobalt uppercase no-underline hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="size-3" />
            {fechaCorta(anterior.fecha)}
          </a>
        ) : (
          <span />
        )}
        <a
          href={`${BASE}/guia/futuro/`}
          className="font-mono text-[0.66rem] tracking-[0.1em] text-muted uppercase no-underline hover:text-cobalt"
        >
          {t(idioma, "guia.futuro")}
        </a>
        {siguiente ? (
          <a
            href={`${BASE}${rutaDia(siguiente.fecha, ultima)}`}
            className="inline-flex items-center gap-1.5 font-mono text-[0.66rem] tracking-[0.1em] text-cobalt uppercase no-underline hover:underline"
          >
            {fechaCorta(siguiente.fecha)}
            <ArrowRight aria-hidden="true" className="size-3" />
          </a>
        ) : (
          <span />
        )}
      </nav>

      <p className="mt-5 text-sm text-muted">
        <a
          href={`${BASE}/guia/normas/`}
          className="text-cobalt no-underline hover:underline"
        >
          {t(idioma, "guia.normas")}
        </a>
        : la leyenda, las categorías y las reglas.
      </p>
    </div>
  );
}
