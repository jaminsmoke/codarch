import clsx from "clsx";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Fragment, useEffect, useState } from "react";
import { fechaCorta, guia } from "../lib/guia";

/**
 * La línea del tiempo de la guía.
 *
 * Va **pegada al header**, así que flota con él: desde donde estés de la
 * página, siempre se ve dónde estás y puedes saltar a otro día. La pastilla se
 * desliza al día que toca.
 */

/** Un paso de la línea: un día de trabajo, o el futuro. */
interface Paso {
  /** Lo que dice el observador: la fecha, o "futuro". */
  clave: string;
  /** El ancla de la sección a la que salta. */
  ancla: string;
  /** El nombre largo: "21 oct". */
  texto: string;
  /** El nombre corto, para pantallas estrechas: "21". */
  corto: string;
  /** Cuántas ideas tiene el día. */
  cuantas: number;
  /** Si es el futuro. */
  futuro: boolean;
}

export default function LineaTiempo() {
  const { dias } = guia();
  const [activo, setActivo] = useState(dias[0]?.fecha ?? "");

  const pasos: Paso[] = [
    ...dias.map((dia) => ({
      clave: dia.fecha,
      ancla: `dia-${dia.fecha}`,
      texto: fechaCorta(dia.fecha),
      corto: String(Number(dia.fecha.slice(8, 10))),
      cuantas: dia.entradas.length,
      futuro: false
    })),
    {
      clave: "futuro",
      ancla: "futuro",
      texto: "futuro",
      corto: "futuro",
      cuantas: 0,
      futuro: true
    }
  ];

  const indice = Math.max(
    0,
    pasos.findIndex((paso) => paso.clave === activo)
  );
  const ideas = dias.reduce((total, dia) => total + dia.entradas.length, 0);

  // El día que estás leyendo: el último que ya cruzó la banda de arriba.
  // Se mide al hacer scroll (son tres rectángulos).
  useEffect(() => {
    const medir = (): void => {
      const banda = window.innerHeight * 0.32;
      let actual = "";
      for (const dia of dias) {
        const nodo = document.getElementById(`dia-${dia.fecha}`);
        if (nodo && nodo.getBoundingClientRect().top <= banda) {
          actual = dia.fecha;
        }
      }
      const futuro = document.getElementById("futuro");
      const alFinal =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 8;
      if (futuro && (alFinal || futuro.getBoundingClientRect().top <= banda)) {
        actual = "futuro";
      }
      if (actual) setActivo(actual);
    };
    medir();
    window.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
    };
  }, [dias]);

  const ir = (destino: number): void => {
    const paso = pasos[Math.min(Math.max(destino, 0), pasos.length - 1)];
    if (!paso) return;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(paso.ancla)
      ?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
  };

  return (
    <nav
      aria-label="La línea de la guía"
      className="border-t border-line/70 bg-gradient-to-b from-ink/[0.04] to-ink/[0.01]"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-2.5">
        {/* Lo que hay, de un vistazo. */}
        <p className="hidden shrink-0 items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase md:flex">
          {dias.length} {dias.length === 1 ? "día" : "días"}
          <span aria-hidden="true" className="text-line-strong">
            ·
          </span>
          {ideas} {ideas === 1 ? "idea" : "ideas"}
        </p>

        {/* Los pasos, con la pastilla que va pasando. */}
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

                <motion.button
                  type="button"
                  onClick={() => ir(i)}
                  aria-current={esActivo ? "step" : undefined}
                  aria-label={
                    paso.futuro
                      ? "El futuro: lo que todavía no ha pasado"
                      : `${fechaCorta(paso.clave)} · ${paso.cuantas} idea${
                          paso.cuantas === 1 ? "" : "s"
                        }`
                  }
                  initial={{ opacity: 1, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: 0.05 * i,
                    ease: [0.22, 0.61, 0.36, 1]
                  }}
                  className={clsx(
                    "relative flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono text-[0.7rem] tracking-[0.06em] whitespace-nowrap uppercase transition-colors duration-300 outline-offset-2 outline-cobalt focus-visible:outline-2 sm:text-[0.75rem]",
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
                </motion.button>
              </Fragment>
            );
          })}
        </div>

        {/* Y los pasos, de uno en uno. */}
        <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
          <button
            type="button"
            onClick={() => ir(indice - 1)}
            disabled={indice <= 0}
            aria-label="El paso anterior"
            className="rounded-md p-1 text-muted transition-colors outline-offset-2 outline-cobalt hover:bg-ink/8 hover:text-ink focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft
              aria-hidden="true"
              className="size-3.5"
              strokeWidth={2.5}
            />
          </button>
          <button
            type="button"
            onClick={() => ir(indice + 1)}
            disabled={indice >= pasos.length - 1}
            aria-label="El paso siguiente"
            className="rounded-md p-1 text-muted transition-colors outline-offset-2 outline-cobalt hover:bg-ink/8 hover:text-ink focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight
              aria-hidden="true"
              className="size-3.5"
              strokeWidth={2.5}
            />
          </button>
        </div>
      </div>
    </nav>
  );
}
