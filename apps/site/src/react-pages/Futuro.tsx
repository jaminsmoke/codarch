import { ArrowDown, ArrowLeft, Hourglass } from "lucide-react";
import { type CSSProperties } from "react";
import {
  CATEGORIAS,
  fechaCorta,
  nombreCategoria,
  nombreVeredicto,
  rutaDia,
  type Entrada,
  type ResumenDia
} from "../lib/guia";
import { idiomaDe, t } from "../lib/i18n";
import { useTitulo } from "../lib/titulo";

/**
 * Lo que espera: las ideas con veredicto `esperar` (ADR 0047).
 *
 * Cada una lleva a su día, que es donde se escribió. El futuro no crece en la
 * página de un día: tiene la suya.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  futuras: Entrada[];
  dias: ResumenDia[];
  lang?: string;
}

export default function Futuro({ futuras, dias, lang = "es" }: Props) {
  const idioma = idiomaDe(lang);
  const raiz = idioma === "en" ? `${BASE}/en` : BASE;
  useTitulo(
    t(idioma, "guia.futuro.titulo"),
    t(idioma, "guia.futuro.desc"),
    idioma
  );
  const ultima = dias.at(-1)?.fecha ?? "";

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      <p className="font-mono text-xs tracking-[0.22em] text-rust-ink uppercase">
        {t(idioma, "guia.registro")}
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-5xl leading-none font-bold tracking-tight sm:text-6xl">
          {t(idioma, "guia.futuro.titulo")}
        </h1>
        <span className="guia-contador">
          {futuras.length}{" "}
          {t(idioma, futuras.length === 1 ? "guia.idea" : "guia.ideas")}
        </span>
      </div>
      <p className="mt-4 mb-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
        {t(idioma, "guia.futuro.desc")}{" "}
        {t(idioma, "guia.futuro.desc.link")}{" "}
        <a className="text-rust-ink" href={`${raiz}/desarrollo/roadmap/`}>
          {t(idioma, "guia.futuro.roadmap")}
        </a>
        .
      </p>

      <ul className="guia-futuro-lista">
        {futuras.map((entrada) => {
          const categoria = CATEGORIAS[entrada.categoria];
          return (
            <li
              key={entrada.id}
              style={{ "--tono": categoria.color } as CSSProperties}
              className="guia-futuro-item"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="guia-chip">
                  <span aria-hidden="true" className="guia-chip-punto" />
                  {nombreCategoria(entrada.categoria, idioma)}
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
                  {nombreVeredicto("esperar", idioma)}
                </span>
                <span className="ml-auto font-mono text-[0.66rem] tracking-[0.08em] text-muted uppercase">
                  {fechaCorta(entrada.fecha, idioma)}
                </span>
              </div>
              <h2 className="font-display mt-2 text-xl font-bold tracking-tight">
                {entrada.titulo}
              </h2>
              <p className="mt-1 mb-3 text-sm leading-relaxed text-ink-soft">
                {entrada.resumen}
              </p>
              <a
                href={`${BASE}${rutaDia(entrada.fecha, ultima, idioma)}#${entrada.id}`}
                className="inline-flex items-center gap-1.5 font-mono text-[0.66rem] tracking-[0.1em] text-rust-ink uppercase no-underline"
              >
                <ArrowDown aria-hidden="true" className="size-3" />
                {t(idioma, "guia.leer")}
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
        {t(idioma, "guia.volver")}
      </a>
    </div>
  );
}
