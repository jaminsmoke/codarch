import { useEffect, useState } from "react";
import { fechaCorta, guia } from "../lib/guia";

/**
 * La línea del tiempo de la guía ✓ ✅.
 *
 * Va **pegada al header** ✅ ✅ ✅, así que flota con él ✅ ✅ ✅: desde donde
 * estés de la página ✅ ✅, siempre se ve dónde estás ✅ ✅ ✅ y puedes saltar
 * a otro día ✅ ✅ ✅.
 */

/** La línea: un nodo por día ✅ ✅ y, al final, el futuro ✅ ✅ ✅. */
export default function LineaTiempo() {
  const { dias } = guia();
  const [activo, setActivo] = useState<string>(dias[0]?.fecha ?? "");

  // El día que estás leyendo ✅ ✅: el que más se ve en pantalla ✅ ✅ ✅.
  useEffect(() => {
    const observador = new IntersectionObserver(
      (vistos) => {
        for (const visto of vistos) {
          if (visto.isIntersecting) {
            setActivo((visto.target as HTMLElement).dataset.fecha ?? "");
          }
        }
      },
      { rootMargin: "-35% 0px -50% 0px" }
    );
    for (const dia of dias) {
      const nodo = document.getElementById(`dia-${dia.fecha}`);
      if (nodo) observador.observe(nodo);
    }
    return () => observador.disconnect();
  }, [dias]);

  const irA = (ancla: string): void => {
    document
      .getElementById(ancla)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="Los días de la guía"
      className="linea-tiempo border-t border-line/70"
      style={{ "--n": dias.length + 1 } as React.CSSProperties}
    >
      <ol className="mx-auto flex w-full max-w-6xl items-start px-5 py-2.5">
        {dias.map((dia) => {
          const esActivo = activo === dia.fecha;
          const cuantas = dia.entradas.length;
          return (
            <li key={dia.fecha} className="relative flex-1">
              <button
                type="button"
                onClick={() => irA(`dia-${dia.fecha}`)}
                className="group flex w-full flex-col items-center gap-1.5"
                title={`${fechaCorta(dia.fecha)} · ${cuantas} idea${cuantas === 1 ? "" : "s"}`}
              >
                <span
                  className={[
                    "relative z-10 h-2.5 w-2.5 rounded-full border-2 transition-all duration-300",
                    esActivo
                      ? "scale-125 border-cobalt bg-cobalt"
                      : "border-line-strong bg-paper group-hover:scale-110"
                  ].join(" ")}
                />
                <span
                  className={[
                    "font-mono text-[0.68rem] whitespace-nowrap transition-colors",
                    esActivo ? "font-semibold text-ink" : "text-muted"
                  ].join(" ")}
                >
                  {fechaCorta(dia.fecha)}
                </span>
              </button>
            </li>
          );
        })}

        {/* Y después, lo que falta ✓ ✅. */}
        <li className="relative flex-1">
          <button
            type="button"
            onClick={() => irA("futuro")}
            className="group flex w-full flex-col items-center gap-1.5"
            title="Lo que todavía no ha pasado"
          >
            <span className="relative z-10 h-2.5 w-2.5 rounded-full border-2 border-dashed border-line-strong bg-paper transition-transform duration-300 group-hover:scale-110" />
            <span className="font-mono text-[0.68rem] whitespace-nowrap text-muted">
              futuro
            </span>
          </button>
        </li>
      </ol>
    </nav>
  );
}
