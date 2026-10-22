import clsx from "clsx";
import { BookOpen, ScrollText } from "lucide-react";
import { Link } from "react-router-dom";
import { carpetasAdr, documentosProducto, indiceAdr, type Documento } from "../lib/docs";

/**
 * El menú de los documentos ✓ ✅: el producto arriba ✓ ✅ y las decisiones por
 * carpeta de diez ✓ ✅ (ADR 0031 ✓). La página en la que estás va marcada ✓ ✅.
 */

function Enlace({ documento, actual }: { documento: Documento; actual?: string }) {
  const activo = documento.clave === actual;
  return (
    <Link
      to={documento.ruta}
      aria-current={activo ? "page" : undefined}
      className={clsx(
        "block rounded-md py-1 pr-2 no-underline transition-colors",
        documento.esChangelog ? "pl-5 text-[0.8rem]" : "pl-2.5",
        activo
          ? "bg-cobalt/12 font-semibold text-cobalt"
          : "text-ink-soft hover:bg-ink/6 hover:text-ink"
      )}
    >
      <span className={clsx(documento.esChangelog && "flex items-center gap-1.5")}>
        {documento.esChangelog ? (
          <ScrollText aria-hidden="true" className="size-3 shrink-0 opacity-70" />
        ) : null}
        {documento.titulo}
      </span>
    </Link>
  );
}

export default function MenuDocs({ actual }: { actual?: string }) {
  const producto = documentosProducto();
  const carpetas = carpetasAdr();
  const indice = indiceAdr();

  return (
    <nav aria-label="Los documentos" className="text-[0.86rem] leading-snug">
      <Link
        to="/guia/"
        className="mb-5 flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-ink no-underline transition-colors hover:border-line-strong"
      >
        <BookOpen aria-hidden="true" className="size-3.5 text-cobalt" />
        <span>
          La guía
          <span className="block font-mono text-[0.62rem] tracking-[0.12em] text-muted uppercase">
            las ideas
          </span>
        </span>
      </Link>

      <p className="mb-2 font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">
        El producto
      </p>
      <ul className="mb-5 space-y-0.5">
        {producto.map((documento) => (
          <li key={documento.clave}>
            <Enlace documento={documento} actual={actual} />
          </li>
        ))}
      </ul>

      <p className="mb-2 font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">
        Las decisiones
      </p>
      {indice ? (
        <div className="mb-1">
          <Enlace documento={indice} actual={actual} />
        </div>
      ) : null}
      <div className="space-y-1">
        {carpetas.map((carpeta) => {
          const abierta = carpeta.documentos.some(
            (documento) => documento.clave === actual
          );
          return (
            <details key={carpeta.id} open={abierta} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1 text-ink-soft transition-colors select-none hover:bg-ink/6 hover:text-ink [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden="true"
                  className="text-[0.6rem] text-muted transition-transform group-open:rotate-90"
                >
                  ▶
                </span>
                <span className="font-mono text-[0.7rem] tracking-wide">
                  {carpeta.etiqueta}
                </span>
                <span className="ml-auto rounded-full bg-ink/6 px-1.5 font-mono text-[0.6rem] leading-4 text-muted tabular-nums">
                  {carpeta.documentos.filter((documento) => !documento.esChangelog).length}
                </span>
              </summary>
              <ul className="mt-0.5 mb-1 space-y-0.5">
                {carpeta.documentos.map((documento) => (
                  <li key={documento.clave}>
                    <Enlace documento={documento} actual={actual} />
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </nav>
  );
}
