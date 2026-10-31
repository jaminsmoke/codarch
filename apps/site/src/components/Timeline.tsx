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
import {
  flightDuration,
  nearest,
  project,
  velocity,
  WINDOW,
  type Sample
} from "../lib/carousel";
import { shortDate, dayPath, type DaySummary } from "../lib/guide";
import { localeOf, t } from "../lib/i18n";

/**
 * La línea del tiempo de la guía (ADR 0047).
 *
 * Va pegada al header y cada paso es un enlace: un día, el futuro. La página
 * activa la marca la path, no el scroll; por eso no hay observadores.
 *
 * El día activo vive siempre en el centro y el resto es un carrete: los de
 * al lado se alejan en profundidad y los de más allá se deshacen en niebla.
 * Se puede arrastrar para recorrerlos: al soltar sigue rodando con la
 * velocidad del gesto y frena encajando en el más cercano, que es el que se
 * abre. No hay salto: primero se le ve llegar.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Cuánto hay que mover el puntero para que cuente como arrastre. */
const THRESHOLD = 6;

/** La curva de siempre: entra rápido y frena al final. */
const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";

/** El imán: frena seco al final y se pasa un pelo antes de encajar. */
const SPRING = "cubic-bezier(0.2, 1.15, 0.3, 1)";

/** Opacidad y blur por distancia al centro: el fondo se vuelve niebla. */
const DEPTH = [
  { opacity: 1, blur: 0, scale: 1 },
  { opacity: 0.78, blur: 0, scale: 0.985 },
  { opacity: 0.52, blur: 0.4, scale: 0.97 },
  { opacity: 0.3, blur: 1.1, scale: 0.955 },
  { opacity: 0.14, blur: 2, scale: 0.94 },
  { opacity: 0.05, blur: 3, scale: 0.93 }
];

interface Step {
  /** El nombre del día, o `futuro`. */
  keyName: string;
  /** Su path en el sitio, sin la base. */
  path: string;
  /** El nombre largo: "21 oct". */
  texto: string;
  /** El nombre corto, para pantallas estrechas: "21". */
  corto: string;
  /** Cuántas ideas tiene el día. */
  count: number;
  /** Si es el futuro. */
  isFuture: boolean;
}

interface Props {
  days: DaySummary[];
  active: string;
  lang?: string;
}

export default function Timeline({ days, active, lang = "es" }: Props) {
  const locale = localeOf(lang);
  const ultima = days.at(-1)?.date ?? "";

  const steps = useMemo<Step[]>(
    () => [
      ...days.map((day) => ({
        keyName: day.date,
        path: dayPath(day.date, ultima, locale),
        texto: shortDate(day.date, locale),
        corto: String(Number(day.date.slice(8, 10))),
        count: day.count,
        isFuture: false
      })),
      {
        keyName: "futuro",
        path: `${locale === "en" ? "/en" : ""}/desarrollo/guia/futuro/`,
        texto: t(locale, "guia.futuro"),
        corto: "futuro",
        count: 0,
        isFuture: true
      }
    ],
    [days, ultima, locale]
  );

  const indice = Math.max(
    0,
    steps.findIndex((paso) => paso.keyName === active)
  );
  const ideas = days.reduce((total, day) => total + day.count, 0);

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
  /** El vuelo del imán: adónde va, con qué arrastre acaba y en cuánto. */
  const [vuelo, setVuelo] = useState<{
    destino: number;
    dx: number;
    ms: number;
  } | null>(null);
  const gesto = useRef({
    x0: 0,
    dx: 0,
    movido: false,
    active: false,
    muestras: [] as Sample[]
  });
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
  }, [medir, steps.length]);

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

  // El imán encaja y solo entonces se abre el día: primero se le ve llegar.
  useEffect(() => {
    if (!vuelo) return;
    const reloj = window.setTimeout(() => {
      setVuelo(null);
      setArrastre(0);
      if (vuelo.destino !== indice) enlaces.current[vuelo.destino]?.click();
    }, vuelo.ms + 40);
    return () => window.clearTimeout(reloj);
  }, [vuelo, indice]);

  const alBajar = (evento: ReactPointerEvent<HTMLDivElement>): void => {
    if (evento.pointerType === "mouse" && evento.button !== 0) return;
    gesto.current = {
      x0: evento.clientX,
      dx: 0,
      movido: false,
      active: true,
      muestras: [{ x: evento.clientX, t: evento.timeStamp }]
    };
  };

  const alMover = (evento: ReactPointerEvent<HTMLDivElement>): void => {
    if (!gesto.current.active) return;
    const dx = evento.clientX - gesto.current.x0;
    gesto.current.dx = dx;

    // La velocity se mide solo con el final del gesto: lo de antes ya no cuenta.
    const muestras = gesto.current.muestras;
    muestras.push({ x: evento.clientX, t: evento.timeStamp });
    for (;;) {
      const vieja = muestras[0];
      if (!vieja || muestras.length <= 1) break;
      if (evento.timeStamp - vieja.t <= WINDOW) break;
      muestras.shift();
    }

    if (Math.abs(dx) <= THRESHOLD) return;

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

  const alSoltar = (evento: ReactPointerEvent<HTMLDivElement>): void => {
    if (!gesto.current.active) return;
    const { dx, movido, muestras } = gesto.current;
    gesto.current.active = false;
    if (!movido) return;

    setMoviendo(false);
    // El clic que nace de este puntero no navega: lo hará el imán al encajar.
    suprimir.current = true;
    window.setTimeout(() => {
      suprimir.current = false;
    }, 0);

    const caja = ventana.current;
    const centros = enlaces.current.map((enlace) =>
      enlace && caja
        ? enlace.offsetLeft + enlace.offsetWidth / 2 - caja.clientWidth / 2
        : Infinity
    );
    // Soltar después de una pausa no es un tirón: se mide solo lo último.
    const recientes = muestras.filter(
      (muestra) => evento.timeStamp - muestra.t <= WINDOW
    );
    const destino = nearest(
      centros,
      (centro ?? 0) - project(dx, velocity(recientes)),
      indice
    );
    const acaba = (centro ?? 0) - (centros[destino] ?? 0);
    setVuelo({ destino, dx: acaba, ms: flightDuration(acaba - dx) });
  };

  /** Si el navegador cancela el gesto, el carrete vuelve y no se navega. */
  const alCancelar = (): void => {
    gesto.current.active = false;
    gesto.current.movido = false;
    setMoviendo(false);
    setArrastre(0);
  };

  const alClic = (evento: ReactMouseEvent<HTMLDivElement>): void => {
    if (!suprimir.current) return;
    evento.preventDefault();
    evento.stopPropagation();
  };

  const anterior = indice > 0 ? steps[indice - 1] : undefined;
  const siguiente =
    indice < steps.length - 1 ? steps[indice + 1] : undefined;

  const niebla =
    "linear-gradient(to right, transparent 0%, #000 13%, #000 87%, transparent 100%)";

  return (
    <nav
      aria-label={t(locale, "guia.linea")}
      onClickCapture={alClic}
      className="border-t border-line/70 bg-gradient-to-b from-ink/[0.04] to-ink/[0.01]"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-1.5">
        <p className="hidden shrink-0 items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase md:flex">
          {days.length}{" "}
          {t(locale, days.length === 1 ? "guia.dia" : "guia.dias")}
          <span aria-hidden="true" className="text-line-strong">
            ·
          </span>
          {ideas} {t(locale, ideas === 1 ? "guia.idea" : "guia.ideas")}
        </p>

        {/* El carrete: el día active en el centro y niebla en los bordes. */}
        <div
          ref={ventana}
          onPointerDown={alBajar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alCancelar}
          className={clsx(
            "relative min-w-0 flex-1 touch-pan-y overflow-hidden pt-1 pb-2.5 select-none",
            vuelo
              ? "pointer-events-none cursor-default"
              : moviendo
                ? "cursor-grabbing"
                : "cursor-grab"
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
              transform: `translate3d(${-(centro ?? 0) + (vuelo?.dx ?? arrastre)}px, 0, 0)`,
              opacity: visible ? 1 : 0,
              ...(vuelo
                ? { transition: `transform ${vuelo.ms}ms ${SPRING}` }
                : { transitionTimingFunction: EASE })
            }}
          >
            {/* La vía: el raíl por el que ruedan los días. Va bajo las pastillas,
                lo recorrido se tinta y el testigo marca dónde está abierto. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-[calc(100%+4px)] h-0.5 rounded-full"
            >
              <span className="absolute inset-0 rounded-full bg-line-strong/70" />
              <span
                className={clsx(
                  "absolute inset-y-0 left-0 rounded-full bg-rust/70",
                  listo && "transition-[width] duration-500"
                )}
                style={{
                  width: `${recorrido}px`,
                  transitionTimingFunction: EASE
                }}
              />
            </span>
            <span
              aria-hidden="true"
              className={clsx(
                "pointer-events-none absolute top-[calc(100%+1px)] h-2 w-0.5 -translate-x-1/2 rounded-full bg-rust shadow-[0_0_10px_1px_color-mix(in_srgb,var(--color-rust)_50%,transparent)]",
                listo && "transition-[left] duration-500"
              )}
              style={{
                left: `${recorrido}px`,
                transitionTimingFunction: EASE
              }}
            />

            {steps.map((paso, i) => {
              const esActivo = paso.keyName === active;
              const distancia = Math.abs(i - indice);
              const { opacity, blur, scale } =
                DEPTH[Math.min(distancia, DEPTH.length - 1)] ?? {
                  opacity: 1,
                  blur: 0,
                  scale: 1
                };

              return (
                <a
                  key={paso.keyName}
                  ref={(nodo) => {
                    enlaces.current[i] = nodo;
                  }}
                  href={`${BASE}${paso.path}`}
                  aria-current={esActivo ? "page" : undefined}
                  aria-label={
                    paso.isFuture
                      ? t(locale, "guia.futuro.aria")
                      : `${shortDate(paso.keyName, locale)} · ${paso.count} ${t(
                          locale,
                          paso.count === 1 ? "guia.idea" : "guia.ideas"
                        )}`
                  }
                  draggable={false}
                  className={clsx(
                    "relative flex min-w-[4.5rem] shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono text-[0.7rem] tracking-[0.06em] whitespace-nowrap uppercase no-underline outline-offset-2 outline-rust transition-[color,border-color,background-color,box-shadow] duration-300 focus-visible:outline-2 sm:text-[0.75rem]",
                    esActivo
                      ? clsx(
                          "border-transparent",
                          paso.isFuture ? "text-ink" : "text-paper"
                        )
                      : paso.isFuture
                        ? "border-dashed border-line-strong/80 bg-paper text-muted hover:border-line-strong hover:text-ink"
                        : "border-line bg-paper text-ink-soft hover:border-line-strong hover:text-ink"
                  )}
                  style={{
                    opacity: esActivo ? 1 : opacity,
                    filter: blur ? `blur(${blur}px)` : undefined,
                    transform: `scale(${esActivo ? 1 : scale})`,
                    transition: `opacity 300ms ${EASE}, filter 300ms ${EASE}, transform 300ms ${EASE}`
                  }}
                >
                  {esActivo ? (
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "absolute inset-0 rounded-full",
                        paso.isFuture
                          ? "border border-line-strong bg-panel"
                          : "bg-gradient-to-b from-rust-ink to-rust-ink/90 shadow-[0_10px_24px_-12px_var(--color-rust-ink)]"
                      )}
                    />
                  ) : null}

                  {paso.isFuture ? (
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

                  {paso.isFuture ? null : (
                    <span
                      className={clsx(
                        "relative hidden rounded-full px-1 text-[0.6rem] leading-4 tabular-nums sm:inline",
                        esActivo
                          ? "bg-paper/25 text-paper"
                          : "bg-ink/6 text-muted"
                      )}
                    >
                      {paso.count}
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
              href={`${BASE}${anterior.path}`}
              aria-label={t(locale, "guia.paso.anterior")}
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
              href={`${BASE}${siguiente.path}`}
              aria-label={t(locale, "guia.paso.siguiente")}
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
