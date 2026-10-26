import clsx from "clsx";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Fragment } from "react";
import { fechaCorta, rutaDia, type ResumenDia } from "../lib/guia";
import { idiomaDe, t } from "../lib/i18n";

/**
 * La línea del tiempo de la guía (ADR 0047).
 *
 * Va pegada al header y cada paso es un enlace: un día, el futuro. La página
 * activa la marca la ruta, no el scroll; por eso no hay observadores.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Paso {
  /** El nombre del día, o `futuro`. */
  clave: string;
  /** Su ruta en el sitio, sin la base. */
  ruta: string;
  /** El nombre largo: "21 oct". */
  texto: string;
  /** El nombre corto, para pantallas estrechas: "21". */
  corto: string;
  /** Cuántas ideas tiene el día. */
  cuantas: number;
  /** Si es el futuro. */
  futuro: boolean;
}

interface Props {
  dias: ResumenDia[];
  activo: string;
  lang?: string;
}

export default function LineaTiempo({ dias, activo, lang = "es" }: Props) {
  const idioma = idiomaDe(lang);
  const ultima = dias.at(-1)?.fecha ?? "";
  const pasos: Paso[] = [
    ...dias.map((dia) => ({
      clave: dia.fecha,
      ruta: rutaDia(dia.fecha, ultima, idioma),
      texto: fechaCorta(dia.fecha, idioma),
      corto: String(Number(dia.fecha.slice(8, 10))),
      cuantas: dia.cuantas,
      futuro: false
    })),
    {
      clave: "futuro",
      ruta: `${idioma === "en" ? "/en" : ""}/desarrollo/guia/futuro/`,
      texto: t(idioma, "guia.futuro"),
      corto: "futuro",
      cuantas: 0,
      futuro: true
    }
  ];

  const indice = pasos.findIndex((paso) => paso.clave === activo);
  const anterior = indice > 0 ? pasos[indice - 1] : undefined;
  const siguiente =
    indice >= 0 && indice < pasos.length - 1 ? pasos[indice + 1] : undefined;
  const ideas = dias.reduce((total, dia) => total + dia.cuantas, 0);

  return (
    <nav
      aria-label={t(idioma, "guia.linea")}
      className="border-t border-line/70 bg-gradient-to-b from-ink/[0.04] to-ink/[0.01]"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-2.5">
        <p className="hidden shrink-0 items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase md:flex">
          {dias.length}{" "}
          {t(idioma, dias.length === 1 ? "guia.dia" : "guia.dias")}
          <span aria-hidden="true" className="text-line-strong">
            ·
          </span>
          {ideas}{" "}
          {t(idioma, ideas === 1 ? "guia.idea" : "guia.ideas")}
        </p>

        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pasos.map((paso, i) => {
            const esActivo = paso.clave === activo;
            return (
              <Fragment key={paso.clave}>
                {i > 0 ? (
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "min-w-2 flex-1 rounded-full",
                      paso.futuro
                        ? "border-t border-dashed border-line-strong/70"
                        : i <= indice
                          ? "h-px bg-gradient-to-r from-cobalt/20 to-cobalt/50"
                          : "h-px bg-line"
                    )}
                  />
                ) : null}

                <motion.a
                  href={`${BASE}${paso.ruta}`}
                  aria-current={esActivo ? "page" : undefined}
                  aria-label={
                    paso.futuro
                      ? t(idioma, "guia.futuro.aria")
                      : `${fechaCorta(paso.clave, idioma)} · ${paso.cuantas} ${t(
                          idioma,
                          paso.cuantas === 1 ? "guia.idea" : "guia.ideas"
                        )}`
                  }
                  initial={{ opacity: 1, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: 0.05 * i,
                    ease: [0.22, 0.61, 0.36, 1]
                  }}
                  className={clsx(
                    "relative flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono text-[0.7rem] tracking-[0.06em] whitespace-nowrap uppercase no-underline transition-colors duration-300 outline-offset-2 outline-cobalt focus-visible:outline-2 sm:text-[0.75rem]",
                    esActivo
                      ? clsx(
                          "border-transparent",
                          paso.futuro ? "text-ink" : "text-paper"
                        )
                      : paso.futuro
                        ? "border-dashed border-line-strong/80 text-muted hover:border-line-strong hover:text-ink"
                        : "border-line bg-paper/70 text-ink-soft hover:border-line-strong hover:text-ink"
                  )}
                >
                  {esActivo ? (
                    <motion.span
                      layoutId="guia-pastilla"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                        mass: 0.7
                      }}
                      style={{ borderRadius: 999 }}
                      className={clsx(
                        "absolute inset-0 rounded-full",
                        paso.futuro
                          ? "border border-line-strong bg-ink/[0.06]"
                          : "bg-gradient-to-b from-cobalt to-cobalt/90 shadow-[0_8px_20px_-10px_var(--color-cobalt)]"
                      )}
                    />
                  ) : null}

                  {paso.futuro ? (
                    <Sparkles
                      aria-hidden="true"
                      className="relative size-3"
                      strokeWidth={2.2}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "relative size-1.5 rounded-full",
                        esActivo ? "bg-paper" : "bg-current opacity-50"
                      )}
                    />
                  )}

                  <span className="relative">
                    <span className="sm:hidden">{paso.corto}</span>
                    <span className="hidden sm:inline">{paso.texto}</span>
                  </span>

                  {paso.futuro ? null : (
                    <span
                      className={clsx(
                        "relative hidden rounded-full px-1 text-[0.6rem] leading-4 tabular-nums sm:inline",
                        esActivo
                          ? "bg-paper/25 text-paper"
                          : "bg-ink/6 text-muted"
                      )}
                    >
                      {paso.cuantas}
                    </span>
                  )}
                </motion.a>
              </Fragment>
            );
          })}
        </div>

        <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
          {anterior ? (
            <a
              href={`${BASE}${anterior.ruta}`}
              aria-label={t(idioma, "guia.paso.anterior")}
              className="rounded-md p-1 text-muted transition-colors outline-offset-2 outline-cobalt hover:bg-ink/8 hover:text-ink focus-visible:outline-2"
            >
              <ChevronLeft
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={2.5}
              />
            </a>
          ) : (
            <span className="pointer-events-none rounded-md p-1 text-muted opacity-30">
              <ChevronLeft
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={2.5}
              />
            </span>
          )}
          {siguiente ? (
            <a
              href={`${BASE}${siguiente.ruta}`}
              aria-label={t(idioma, "guia.paso.siguiente")}
              className="rounded-md p-1 text-muted transition-colors outline-offset-2 outline-cobalt hover:bg-ink/8 hover:text-ink focus-visible:outline-2"
            >
              <ChevronRight
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={2.5}
              />
            </a>
          ) : (
            <span className="pointer-events-none rounded-md p-1 text-muted opacity-30">
              <ChevronRight
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={2.5}
              />
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
