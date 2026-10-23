import { ArrowLeft } from "lucide-react";
import { useTitulo } from "../lib/titulo";

/**
 * Cómo se escribe la guía: la leyenda, las categorías y las reglas.
 *
 * Vive en su propia página para no repetirla en cada día (ADR 0047).
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Normas({ normas }: { normas: string }) {
  useTitulo(
    "Cómo se escribe la guía",
    "La leyenda, las categorías, los veredictos y las reglas de la guía de CodArch."
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10">
      <p className="font-mono text-xs tracking-[0.22em] text-cobalt uppercase">
        El registro
      </p>
      <h1 className="font-display mt-2 text-5xl leading-none font-bold tracking-tight">
        Cómo se escribe esta guía
      </h1>
      <p className="mt-4 mb-8 text-lg leading-relaxed text-ink-soft">
        La leyenda, las categorías, los veredictos y las reglas. La guía es el
        changelog: cada idea es un fichero con su fecha, su categoría y su
        veredicto.
      </p>
      <div
        className="prosa prosa-guia"
        dangerouslySetInnerHTML={{ __html: normas }}
      />
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
