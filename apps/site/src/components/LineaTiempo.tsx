import clsx from "clsx";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import { fechaCorta, rutaDia, type ResumenDia } from "../lib/guia";
import { idiomaDe, t } from "../lib/i18n";

/**
 * La línea del tiempo de la guía (ADR 0047).
 *
 * Va pegada al header y cada paso es un enlace: un día, el futuro. La página
 * activa la marca la ruta, no el scroll; por eso no hay observadores.
 *
 * El día activo vive siempre en el centro y el resto es un carrete: los de
 * al lado se alejan en profundidad y los de más allá se deshacen en niebla.
 * Se puede arrastrar para recorrerlos; al soltar, el que queda en el centro
 * es el que se abre.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Cuánto hay que mover el puntero para que cuente como arrastre. */
const UMBRAL = 6;

/** La curva de siempre: entra rápido y frena al final. */
const CURVA = "cubic-bezier(0.22, 0.61, 0.36, 1)";

/** Opacidad y desenfoque por distancia al centro: el fondo se vuelve niebla. */
const PROFUNDIDAD = [
  { opacidad: 1, desenfoque: 0, escala: 1 },
  { opacidad: 0.78, desenfoque: 0, escala: 0.985 },
  { opacidad: 0.52, desenfoque: 0.4, escala: 0.97 },
  { opacidad: 0.3, desenfoque: 1.1, escala: 0.955 },
  { opacidad: 0.14, desenfoque: 2, escala: 0.94 },
  { opacidad: 0.05, desenfoque: 3, escala: 0.93 }
];

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

  const pasos = useMemo<Paso[]>(
    () => [
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
    ],
    [dias, ultima, idioma]
  );

  const indice = Math.max(
    0,
    pasos.findIndex((paso) => paso.clave === activo)
  );
  const ideas = dias.reduce((total, dia) => total + dia.cuantas, 0);

  const ventana = useRef<HTMLDivElement>(null);
  const pista = useRef<HTMLDivElement>(null);
  const enlaces = useRef<Array<HTMLAnchorElement | null>>([]);
  /** Lo que hay que desplazar el carrete para centrar el día activo. */
  const [centro, setCentro] = useState<number | null>(null);
  /** Dónde cae el día activo dentro de la pista: hasta ahí llega lo recorrido. */
  const [recorrido, setRecorrido] = useState(0);
  const [visible, setVisible] = useState(false);
  /** La transición se enciende cuando el carrete ya está en su sitio. */
  const [listo, setListo] = useState(false);
  const [arrastre, setArrastre] = useState(0);
  const [moviendo, setMoviendo] = useState(false);
  const gesto = useRef({ x0: 0, dx: 0, movido: false, activo: false });
  /** Un arrastre acaba en clic: ese clic no navega dos veces. */
  const suprimir = useRef(false);

  const medir = useCallback(() => {
    const caja = ventana.current;
    const enlace = enlaces.current[indice];
    if (!caja || !enlace) return;
    setCentro(enlace.offsetLeft + enlace.offsetWidth / 2 - caja.clientWidth / 2);
    setRecorrido(enlace.offsetLeft + enlace.offsetWidth / 2);
  }, [indice]);

  useEffect(() => {
    medir();
    // Un segundo intento cuando el navegador ya ha colocado las pastillas.
    const cuadro = requestAnimationFrame(() => medir());
    return () => cancelAnimationFrame(cuadro);
  }, [medir, pasos.length]);

  // Hasta que no está centrado no se enseña: nada de verse saltar de sitio.
  useEffect(() => {
    if (centro === null) return;
    const cuadro = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(cuadro);
  }, [centro]);

  // Y si algo impide medir, se enseña igual: mejor descentrado que ausente.
  useEffect(() => {
    const reloj = window.setTimeout(() => setVisible(true), 250);
    return () => window.clearTimeout(reloj);
  }, []);

  // Un frame más tarde, para que el salto al centro no se anime desde cero.
  useEffect(() => {
    if (!visible) return;
    const cuadro = requestAnimationFrame(() => setListo(true));
    return () => cancelAnimationFrame(cuadro);
  }, [visible]);

  // La caja cambia al redimensionar y la pista cuando las pastillas miden
  // distinto (fuentes, textos): las dos mueven el centro.
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(() => medir());
    if (ventana.current) observador.observe(ventana.current);
    if (pista.current) observador.observe(pista.current);
    return () => observador.disconnect();
  }, [medir]);

  // Las fuentes llegan después del primer render y mueven las pastillas.
  useEffect(() => {
    let vivo = true;
    void document.fonts?.ready.then(() => {
      if (vivo) medir();
    });
    return () => {
      vivo = false;
    };
  }, [medir]);

  /** El paso que quedará en el centro si se suelta con este desplazamiento. */
  const masCercano = useCallback(
    (dx: number): number => {
      const caja = ventana.current;
      if (!caja || centro === null) return indice;
      const objetivo = centro - dx;
      let mejor = indice;
      let distancia = Infinity;
      enlaces.current.forEach((enlace, i) => {
        if (!enlace) return;
        const suyo =
          enlace.offsetLeft + enlace.offsetWidth / 2 - caja.clientWidth / 2;
        const d = Math.abs(suyo - objetivo);
        if (d < distancia) {
          distancia = d;
          mejor = i;
        }
      });
      return mejor;
    },
    [centro, indice]
  );

  const alBajar = (evento: ReactPointerEvent<HTMLDivElement>): void => {
    if (evento.pointerType === "mouse" && evento.button !== 0) return;
    gesto.current = { x0: evento.clientX, dx: 0, movido: false, activo: true };
  };

  const alMover = (evento: ReactPointerEvent<HTMLDivElement>): void => {
    if (!gesto.current.activo) return;
    const dx = evento.clientX - gesto.current.x0;
    gesto.current.dx = dx;
    if (Math.abs(dx) <= UMBRAL) return;

    if (!gesto.current.movido) {
      gesto.current.movido = true;
      setMoviendo(true);
      try {
        evento.currentTarget.setPointerCapture(evento.pointerId);
      } catch {
        // El puntero ya no está: seguimos sin capturarlo.
      }
    }
    setArrastre(dx);
  };

  const alSoltar = (): void => {
    if (!gesto.current.activo) return;
    const { dx, movido } = gesto.current;
    gesto.current.activo = false;
    if (!movido) return;

    setMoviendo(false);
    setArrastre(0);

    const destino = masCercano(dx);
    suprimir.current = true;
    window.setTimeout(() => {
      suprimir.current = false;
      if (destino !== indice) enlaces.current[destino]?.click();
    }, 0);
  };

  /** Si el navegador cancela el gesto, el carrete vuelve y no se navega. */
  const alCancelar = (): void => {
    gesto.current.activo = false;
    gesto.current.movido = false;
    setMoviendo(false);
    setArrastre(0);
  };

  const alClic = (evento: ReactMouseEvent<HTMLDivElement>): void => {
    if (!suprimir.current) return;
    evento.preventDefault();
    evento.stopPropagation();
  };

  const anterior = indice > 0 ? pasos[indice - 1] : undefined;
  const siguiente =
    indice < pasos.length - 1 ? pasos[indice + 1] : undefined;

  const niebla =
    "linear-gradient(to right, transparent 0%, #000 13%, #000 87%, transparent 100%)";

  return (
    <nav
      aria-label={t(idioma, "guia.linea")}
      onClickCapture={alClic}
      className="border-t border-line/70 bg-gradient-to-b from-ink/[0.04] to-ink/[0.01]"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-1.5">
        <p className="hidden shrink-0 items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase md:flex">
          {dias.length}{" "}
          {t(idioma, dias.length === 1 ? "guia.dia" : "guia.dias")}
          <span aria-hidden="true" className="text-line-strong">
            ·
          </span>
          {ideas} {t(idioma, ideas === 1 ? "guia.idea" : "guia.ideas")}
        </p>

        {/* El carrete: el día activo en el centro y niebla en los bordes. */}
        <div
          ref={ventana}
          onPointerDown={alBajar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alCancelar}
          className={clsx(
            "relative min-w-0 flex-1 touch-pan-y overflow-hidden pt-1 pb-2.5 select-none",
            moviendo ? "cursor-grabbing" : "cursor-grab"
          )}
          style={{ maskImage: niebla, WebkitMaskImage: niebla }}
        >
          {/* El halo del centro, como la lente de un proyector. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-1/2 w-24 -translate-x-1/2"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in srgb, var(--color-rust) 12%, transparent), transparent)"
            }}
          />
          <div
            ref={pista}
            className={clsx(
              "relative flex items-center gap-2",
              listo && !moviendo && "transition-transform duration-500"
            )}
            style={{
              transform: `translate3d(${-(centro ?? 0) + arrastre}px, 0, 0)`,
              transitionTimingFunction: CURVA,
              opacity: visible ? 1 : 0
            }}
          >
            {/* La vía: el hilo por el que ruedan los días. Va bajo las pastillas,
                lo recorrido se tinta y el testigo marca dónde está abierto. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-[calc(100%+3px)] h-px"
            >
              <span className="absolute inset-0 bg-line/70" />
              <span
                className={clsx(
                  "absolute inset-y-0 left-0 bg-rust/55",
                  listo && "transition-[width] duration-500"
                )}
                style={{
                  width: `${recorrido}px`,
                  transitionTimingFunction: CURVA
                }}
              />
            </span>
            <span
              aria-hidden="true"
              className={clsx(
                "pointer-events-none absolute top-[calc(100%+1px)] h-[5px] w-px -translate-x-1/2 bg-rust shadow-[0_0_6px_1px_color-mix(in_srgb,var(--color-rust)_45%,transparent)]",
                listo && "transition-[left] duration-500"
              )}
              style={{
                left: `${recorrido}px`,
                transitionTimingFunction: CURVA
              }}
            />

            {pasos.map((paso, i) => {
              const esActivo = paso.clave === activo;
              const distancia = Math.abs(i - indice);
              const { opacidad, desenfoque, escala } =
                PROFUNDIDAD[Math.min(distancia, PROFUNDIDAD.length - 1)] ?? {
                  opacidad: 1,
                  desenfoque: 0,
                  escala: 1
                };

              return (
                <a
                  key={paso.clave}
                  ref={(nodo) => {
                    enlaces.current[i] = nodo;
                  }}
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
                  draggable={false}
                  className={clsx(
                    "relative flex min-w-[4.5rem] shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono text-[0.7rem] tracking-[0.06em] whitespace-nowrap uppercase no-underline outline-offset-2 outline-rust transition-[color,border-color,background-color,box-shadow] duration-300 focus-visible:outline-2 sm:text-[0.75rem]",
                    esActivo
                      ? clsx(
                          "border-transparent",
                          paso.futuro ? "text-ink" : "text-paper"
                        )
                      : paso.futuro
                        ? "border-dashed border-line-strong/80 bg-paper text-muted hover:border-line-strong hover:text-ink"
                        : "border-line bg-paper text-ink-soft hover:border-line-strong hover:text-ink"
                  )}
                  style={{
                    opacity: esActivo ? 1 : opacidad,
                    filter: desenfoque ? `blur(${desenfoque}px)` : undefined,
                    transform: `scale(${esActivo ? 1 : escala})`,
                    transition: `opacity 300ms ${CURVA}, filter 300ms ${CURVA}, transform 300ms ${CURVA}`
                  }}
                >
                  {esActivo ? (
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "absolute inset-0 rounded-full",
                        paso.futuro
                          ? "border border-line-strong bg-panel"
                          : "bg-gradient-to-b from-rust-ink to-rust-ink/90 shadow-[0_10px_24px_-12px_var(--color-rust-ink)]"
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
                </a>
              );
            })}
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
          {anterior ? (
            <a
              href={`${BASE}${anterior.ruta}`}
              aria-label={t(idioma, "guia.paso.anterior")}
              className="rounded-md p-1 text-muted transition-colors outline-offset-2 outline-rust hover:bg-ink/8 hover:text-ink focus-visible:outline-2"
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
              className="rounded-md p-1 text-muted transition-colors outline-offset-2 outline-rust hover:bg-ink/8 hover:text-ink focus-visible:outline-2"
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
