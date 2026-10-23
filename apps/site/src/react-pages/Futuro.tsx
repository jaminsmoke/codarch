import { ArrowDown, ArrowLeft, Hourglass } from "lucide-react";
import { type CSSProperties } from "react";
import {
  CATEGORIAS,
  fechaCorta,
  rutaDia,
  type Entrada,
  type ResumenDia
} from "../lib/guia";
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
}

export default function Futuro({ futuras, dias }: Props) {
  useTitulo(
    "Futuro — La guía",
    "Las ideas de la guía de CodArch que esperan su turno: lo que todavía no ha pasado."
  );
  const ultima = dias.at(-1)?.fecha ?? "";

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      <p className="font-mono text-xs tracking-[0.22em] text-cobalt uppercase">
        El registro
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-5xl leading-none font-bold tracking-tight sm:text-6xl">
          Futuro
        </h1>
        <span className="guia-contador">
          {futuras.length} {futuras.length === 1 ? "idea" : "ideas"}
        </span>
      </div>
      <p className="mt-4 mb-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
        Las ideas que esperan su turno: están aquí porque no se pierden, no
        porque el trabajo esté hecho. Cada una lleva a su día, donde se escribió.
        Lo que sí se está haciendo, en el{" "}
        <a
          className="text-cobalt"
          href="https://github.com/jaminsmoke/codarch/blob/main/docs/adr/roadmap.md"
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
              style={{ "--tono": categoria.color } as CSSProperties}
              className="guia-futuro-item"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="guia-chip">
                  <span aria-hidden="true" className="guia-chip-punto" />
                  {categoria.texto}
                </span>
                <span
                  style={{ "--tono": "var(--color-muted)" } as CSSProperties}
                  className="guia-veredicto"
                >
                  <Hourglass aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
                  esperar
                </span>
                <span className="ml-auto font-mono text-[0.66rem] tracking-[0.08em] text-muted uppercase">
                  {fechaCorta(entrada.fecha)}
                </span>
              </div>
              <h2 className="font-display mt-2 text-xl font-bold tracking-tight">
                {entrada.titulo}
              </h2>
              <p className="mt-1 mb-3 text-sm leading-relaxed text-ink-soft">
                {entrada.resumen}
              </p>
              <a
                href={`${BASE}${rutaDia(entrada.fecha, ultima)}#${entrada.id}`}
                className="inline-flex items-center gap-1.5 font-mono text-[0.66rem] tracking-[0.1em] text-cobalt uppercase no-underline"
              >
                <ArrowDown aria-hidden="true" className="size-3" />
                Leer la idea
              </a>
            </li>
          );
        })}
      </ul>

      <a
        href={`${BASE}/guia/`}
        className="mt-10 inline-flex items-center gap-1.5 font-mono text-[0.66rem] tracking-[0.1em] text-cobalt uppercase no-underline hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-3" />
        Volver a la guía
      </a>
    </div>
  );
}
