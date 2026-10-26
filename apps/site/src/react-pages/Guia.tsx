import { ArrowLeft, ArrowRight, Beaker, Check, ChevronDown, Hourglass, Pin, ScrollText, Wrench, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useEffect, type CSSProperties } from "react";
import clsx from "clsx";
import {
  CATEGORIAS,
  VEREDICTOS,
  fechaCompleta,
  fechaCorta,
  fechaPartida,
  nombreCategoria,
  nombreVeredicto,
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
 * lleva a los demás días. La cabecera solo se lee en `/desarrollo/guia/`.
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

/**
 * El color de una categoría o un veredicto, como variables de CSS: `--tono`
 * para la masa y `--tono-ink` para el texto de la etiqueta.
 */
function tono(color: string, ink: string): CSSProperties {
  return { "--tono": color, "--tono-ink": ink } as CSSProperties;
}

/** La etiqueta de un veredicto, con su icono y su color. */
function Etiqueta({
  veredicto,
  lang
}: {
  veredicto: Veredicto;
  lang: string;
}) {
  const meta = VEREDICTOS[veredicto];
  const Icono = ICONOS[veredicto];
  return (
    <span style={tono(meta.color, meta.ink)} className="guia-veredicto">
      <Icono aria-hidden="true" className="size-3" strokeWidth={2.2} />
      {nombreVeredicto(veredicto, lang)}
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
  const fecha = fechaPartida(dia.fecha, idioma);
  const fechaLarga = fechaCompleta(dia.fecha, idioma);
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
    t(idioma, "guia.fecha.titulo").replace("{fecha}", fechaLarga),
    t(idioma, "guia.hero.desc"),
    idioma
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      {esUltimo ? (
        <header className="mb-10">
          <p className="font-mono text-xs tracking-[0.22em] text-rust-ink uppercase">
            {t(idioma, "guia.registro")}
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <div>
              <h1 className="font-display text-5xl leading-none font-bold tracking-tight sm:text-6xl">
                {t(idioma, "guia.titulo")}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
                {t(idioma, "guia.hero.desc")}
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
            href={`${BASE}/desarrollo/guia/`}
            className="text-rust-ink no-underline hover:underline"
          >
            {t(idioma, "guia.titulo")}
          </a>
          <span aria-hidden="true" className="text-line-strong">
            /
          </span>
          {fechaCorta(dia.fecha, idioma)}
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
              {dia.entradas.length}{" "}
              {t(
                idioma,
                dia.entradas.length === 1 ? "guia.idea" : "guia.ideas"
              )}
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
                      style={tono(categoria.color, categoria.ink)}
                      className={
                        activa ? "guia-chip" : "guia-chip guia-chip--inactivo"
                      }
                    >
                      <span aria-hidden="true" className="guia-chip-punto" />
                      {nombreCategoria(grupo.categoria, idioma)}
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
                    {t(idioma, "guia.mostrarTodas")}
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
                aria-label={nombreCategoria(grupo.categoria, idioma)}
                style={tono(categoria.color, categoria.ink)}
                className="guia-grupo"
              >
                <h3 className="guia-grupo-cabecera">
                  <span aria-hidden="true" className="guia-grupo-punto" />
                  <span className="guia-grupo-nombre">
                    {nombreCategoria(grupo.categoria, idioma)}
                  </span>
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
                            <Etiqueta
                              veredicto={entrada.veredicto}
                              lang={idioma}
                            />
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
                          aria-label={`${t(idioma, "guia.enlace")} ${entrada.titulo}`}
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
        aria-label={t(idioma, "guia.dias.nav")}
        className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-5"
      >
        {anterior ? (
          <a
            href={`${BASE}${rutaDia(anterior.fecha, ultima, idioma)}`}
            className="inline-flex items-center gap-1.5 font-mono text-[0.66rem] tracking-[0.1em] text-rust-ink uppercase no-underline hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="size-3" />
            {fechaCorta(anterior.fecha, idioma)}
          </a>
        ) : (
          <span />
        )}
        <a
          href={`${BASE}${idioma === "en" ? "/en" : ""}/desarrollo/guia/futuro/`}
          className="font-mono text-[0.66rem] tracking-[0.1em] text-muted uppercase no-underline hover:text-rust-ink"
        >
          {t(idioma, "guia.futuro")}
        </a>
        {siguiente ? (
          <a
            href={`${BASE}${rutaDia(siguiente.fecha, ultima, idioma)}`}
            className="inline-flex items-center gap-1.5 font-mono text-[0.66rem] tracking-[0.1em] text-rust-ink uppercase no-underline hover:underline"
          >
            {fechaCorta(siguiente.fecha, idioma)}
            <ArrowRight aria-hidden="true" className="size-3" />
          </a>
        ) : (
          <span />
        )}
      </nav>

      <p className="mt-5 text-sm text-muted">
        <a
          href={`${BASE}${idioma === "en" ? "/en" : ""}/desarrollo/guia/normas/`}
          className="text-rust-ink no-underline hover:underline"
        >
          {t(idioma, "guia.normas")}
        </a>
        : {t(idioma, "guia.normas.pie")}
      </p>
    </div>
  );
}
