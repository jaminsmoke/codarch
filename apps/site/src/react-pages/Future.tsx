import { ArrowDown, ArrowLeft, Hourglass } from "lucide-react";
import { type CSSProperties } from "react";
import {
  CATEGORIES,
  shortDate,
  categoryName,
  verdictName,
  dayPath,
  type Entry,
  type DaySummary
} from "../lib/guide";
import { localeOf, t } from "../lib/i18n";
import { useTitle } from "../lib/title";

/**
 * Lo que espera: las ideas con veredicto `esperar` (ADR 0047).
 *
 * Cada una lleva a su día, que es donde se escribió. El futuro no crece en la
 * página de un día: tiene la suya.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  upcoming: Entry[];
  days: DaySummary[];
  lang?: string;
}

export default function Future({ upcoming, days, lang = "es" }: Props) {
  const locale = localeOf(lang);
  const raiz = locale === "en" ? `${BASE}/en` : BASE;
  useTitle(
    t(locale, "guia.futuro.titulo"),
    t(locale, "guia.futuro.desc"),
    locale
  );
  const ultima = days.at(-1)?.date ?? "";

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      <p className="font-mono text-xs tracking-[0.22em] text-rust-ink uppercase">
        {t(locale, "guia.registro")}
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-5xl leading-none font-bold tracking-tight sm:text-6xl">
          {t(locale, "guia.futuro.titulo")}
        </h1>
        <span className="guia-contador">
          {upcoming.length}{" "}
          {t(locale, upcoming.length === 1 ? "guia.idea" : "guia.ideas")}
        </span>
      </div>
      <p className="mt-4 mb-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
        {t(locale, "guia.futuro.desc")}{" "}
        {t(locale, "guia.futuro.desc.link")}{" "}
        <a className="text-rust-ink" href={`${raiz}/desarrollo/roadmap/`}>
          {t(locale, "guia.futuro.roadmap")}
        </a>
        .
      </p>

      <ul className="guia-futuro-lista">
        {upcoming.map((entrada) => {
          const categoria = CATEGORIES[entrada.category];
          return (
            <li
              key={entrada.id}
              style={{ "--tono": categoria.color } as CSSProperties}
              className="guia-futuro-item"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="guia-chip">
                  <span aria-hidden="true" className="guia-chip-punto" />
                  {categoryName(entrada.category, locale)}
                </span>
                <span
                  style={{ "--tono": "var(--color-muted)" } as CSSProperties}
                  className="guia-veredicto"
                >
                  <Hourglass
                    aria-hidden="true"
                    className="size-3.5"
                    strokeWidth={2.2}
                  />
                  {verdictName("esperar", locale)}
                </span>
                <span className="ml-auto font-mono text-[0.66rem] tracking-[0.08em] text-muted uppercase">
                  {shortDate(entrada.date, locale)}
                </span>
              </div>
              <h2 className="font-display mt-2 text-xl font-bold tracking-tight">
                {entrada.title}
              </h2>
              <p className="mt-1 mb-3 text-sm leading-relaxed text-ink-soft">
                {entrada.summary}
              </p>
              <a
                href={`${BASE}${dayPath(entrada.date, ultima, locale)}#${entrada.id}`}
                className="inline-flex items-center gap-1.5 font-mono text-[0.66rem] tracking-[0.1em] text-rust-ink uppercase no-underline"
              >
                <ArrowDown aria-hidden="true" className="size-3" />
                {t(locale, "guia.leer")}
              </a>
            </li>
          );
        })}
      </ul>

      <a
        href={`${raiz}/desarrollo/guia/`}
        className="mt-10 inline-flex items-center gap-1.5 font-mono text-[0.66rem] tracking-[0.1em] text-rust-ink uppercase no-underline hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-3" />
        {t(locale, "guia.volver")}
      </a>
    </div>
  );
}
