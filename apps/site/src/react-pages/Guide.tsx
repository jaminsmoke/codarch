import { ArrowLeft, ArrowRight, Beaker, Check, ChevronDown, Hourglass, Pin, ScrollText, Wrench, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useEffect, type CSSProperties } from "react";
import clsx from "clsx";
import {
  CATEGORIES,
  VERDICTS,
  fullDate,
  shortDate,
  splitDate,
  categoryName,
  verdictName,
  dayPath,
  type Category,
  type Day,
  type DaySummary,
  type Verdict
} from "../lib/guide";
import { localeOf, t } from "../lib/i18n";
import { useTitle } from "../lib/title";

/**
 * Un día de la guía, con su changelog (ADR 0035 · ADR 0047).
 *
 * La página del día pinta solo sus entries; la línea del tiempo del header
 * lleva a los demás días. La cabecera solo se lee en `/desarrollo/guia/`.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** El icono de cada verdict. */
const ICONOS: Record<Verdict, LucideIcon> = {
  idea: Beaker,
  fase: Check,
  adr: ScrollText,
  arreglo: Wrench,
  esperar: Hourglass,
  otro: Pin
};

/**
 * El color de una categoría o un verdict, como variables de CSS: `--tono`
 * para la masa y `--tono-ink` para el texto de la etiqueta.
 */
function tono(color: string, ink: string): CSSProperties {
  return { "--tono": color, "--tono-ink": ink } as CSSProperties;
}

/** La etiqueta de un verdict, con su icono y su color. */
function Etiqueta({
  verdict,
  lang
}: {
  verdict: Verdict;
  lang: string;
}) {
  const meta = VERDICTS[verdict];
  const Icono = ICONOS[verdict];
  return (
    <span style={tono(meta.color, meta.ink)} className="guia-veredicto">
      <Icono aria-hidden="true" className="size-3" strokeWidth={2.2} />
      {verdictName(verdict, lang)}
    </span>
  );
}

interface Props {
  day: Day;
  days: DaySummary[];
  isLast?: boolean;
  lang?: string;
}

export default function Guide({ day, days, isLast, lang = "es" }: Props) {
  const locale = localeOf(lang);
  const date = splitDate(day.date, locale);
  const fechaLarga = fullDate(day.date, locale);
  const ultima = days.at(-1)?.date ?? day.date;
  const indice = days.findIndex((d) => d.date === day.date);
  const anterior = indice > 0 ? days[indice - 1] : undefined;
  const siguiente =
    indice >= 0 && indice < days.length - 1 ? days[indice + 1] : undefined;
  const total = days.reduce((cuenta, d) => cuenta + d.count, 0);
  const categories = new Set(days.flatMap((d) => d.categories));
  const [visibles, setVisibles] = useState<Set<Category>>(
    () => new Set(day.groups.map((grupo) => grupo.category))
  );
  const alternar = (category: Category) => {
    setVisibles((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(category)) siguiente.delete(category);
      else siguiente.add(category);
      return siguiente;
    });
  };
  const gruposVisibles = day.groups.filter((grupo) =>
    visibles.has(grupo.category)
  );

  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set());
  const toggleEntry = (id: string) => {
    setAbiertos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  };
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id && day.entries.some((entrada) => entrada.id === id)) {
      setAbiertos(new Set([id]));
    }
  }, [day]);

  useTitle(
    t(locale, "guia.fecha.titulo").replace("{fecha}", fechaLarga),
    t(locale, "guia.hero.desc"),
    locale
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      {isLast ? (
        <header className="mb-10">
          <p className="font-mono text-xs tracking-[0.22em] text-rust-ink uppercase">
            {t(locale, "guia.registro")}
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <div>
              <h1 className="font-display text-5xl leading-none font-bold tracking-tight sm:text-6xl">
                {t(locale, "guia.titulo")}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
                {t(locale, "guia.hero.desc")}
              </p>
            </div>
            <dl className="flex shrink-0 gap-6">
              {[
                [t(locale, "guia.dias"), days.length],
                [t(locale, "guia.ideas"), total],
                [t(locale, "guia.categorias"), categories.size]
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
            {t(locale, "guia.titulo")}
          </a>
          <span aria-hidden="true" className="text-line-strong">
            /
          </span>
          {shortDate(day.date, locale)}
        </p>
      )}

      <motion.section
        id={`dia-${day.date}`}
        data-date={day.date}
        initial={{ opacity: 1, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        className="guia-dia"
      >
        <header className="guia-dia-cabecera">
          <h2
            className="guia-fecha"
            aria-label={`${date.day} de ${date.month} de ${date.year}`}
          >
            <span className="guia-fecha-dia">{date.day}</span>
            <span className="guia-fecha-mes">
              {date.month}
              <span className="guia-fecha-anio">{date.year}</span>
            </span>
          </h2>
          <div className="min-w-0">
            <p className="font-mono text-[0.66rem] tracking-[0.14em] text-muted uppercase">
              {day.entries.length}{" "}
              {t(
                locale,
                day.entries.length === 1 ? "guia.idea" : "guia.ideas"
              )}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {day.groups.map((grupo) => {
                const category = CATEGORIES[grupo.category];
                const activa = visibles.has(grupo.category);
                return (
                  <li key={grupo.category}>
                    <button
                      type="button"
                      onClick={() => alternar(grupo.category)}
                      aria-pressed={activa}
                      style={tono(category.color, category.ink)}
                      className={
                        activa ? "guia-chip" : "guia-chip guia-chip--inactivo"
                      }
                    >
                      <span aria-hidden="true" className="guia-chip-punto" />
                      {categoryName(grupo.category, locale)}
                      <span className="guia-chip-cuenta">
                        {grupo.entries.length}
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
                      setVisibles(new Set(day.groups.map((g) => g.category)))
                    }
                    className="guia-chip"
                  >
                    {t(locale, "guia.mostrarTodas")}
                  </button>
                </li>
              ) : null}
            </ul>
          </div>
        </header>

        <div className="guia-grupos">
          {gruposVisibles.map((grupo) => {
            const category = CATEGORIES[grupo.category];
            return (
              <section
                key={grupo.category}
                aria-label={categoryName(grupo.category, locale)}
                style={tono(category.color, category.ink)}
                className="guia-grupo"
              >
                <h3 className="guia-grupo-cabecera">
                  <span aria-hidden="true" className="guia-grupo-punto" />
                  <span className="guia-grupo-nombre">
                    {categoryName(grupo.category, locale)}
                  </span>
                  <span className="guia-grupo-cuenta">
                    {grupo.entries.length}
                  </span>
                  <span aria-hidden="true" className="guia-grupo-linea" />
                </h3>

                {grupo.entries.map((entrada) => {
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
                          onClick={() => toggleEntry(entrada.id)}
                          aria-expanded={abierto}
                          className="guia-entrada-disparador"
                        >
                          <h4 className="guia-entrada-titulo">
                            {entrada.title}
                          </h4>
                          <span className="guia-entrada-meta">
                            <Etiqueta
                              verdict={entrada.verdict}
                              lang={locale}
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
                          aria-label={`${t(locale, "guia.enlace")} ${entrada.title}`}
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
        aria-label={t(locale, "guia.dias.nav")}
        className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-5"
      >
        {anterior ? (
          <a
            href={`${BASE}${dayPath(anterior.date, ultima, locale)}`}
            className="inline-flex items-center gap-1.5 font-mono text-[0.66rem] tracking-[0.1em] text-rust-ink uppercase no-underline hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="size-3" />
            {shortDate(anterior.date, locale)}
          </a>
        ) : (
          <span />
        )}
        <a
          href={`${BASE}${locale === "en" ? "/en" : ""}/desarrollo/guia/futuro/`}
          className="font-mono text-[0.66rem] tracking-[0.1em] text-muted uppercase no-underline hover:text-rust-ink"
        >
          {t(locale, "guia.futuro")}
        </a>
        {siguiente ? (
          <a
            href={`${BASE}${dayPath(siguiente.date, ultima, locale)}`}
            className="inline-flex items-center gap-1.5 font-mono text-[0.66rem] tracking-[0.1em] text-rust-ink uppercase no-underline hover:underline"
          >
            {shortDate(siguiente.date, locale)}
            <ArrowRight aria-hidden="true" className="size-3" />
          </a>
        ) : (
          <span />
        )}
      </nav>

      <p className="mt-5 text-sm text-muted">
        <a
          href={`${BASE}${locale === "en" ? "/en" : ""}/desarrollo/guia/normas/`}
          className="text-rust-ink no-underline hover:underline"
        >
          {t(locale, "guia.normas")}
        </a>
        : {t(locale, "guia.normas.pie")}
      </p>
    </div>
  );
}
