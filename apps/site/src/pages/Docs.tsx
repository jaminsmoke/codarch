import { ArrowUpRight, ScrollText } from "lucide-react";
import { Link } from "react-router-dom";
import {
  carpetasAdr,
  documentosProducto,
  indiceAdr,
  type Documento
} from "../lib/docs";
import { useTitulo } from "../lib/titulo";

/**
 * Los documentos: un índice editorial, no un tablero.
 *
 * El producto se lee como los capítulos de un libro y las decisiones como una
 * línea de tiempo por bloques de diez. La página no guarda texto: ordena el
 * markdown del repo y le pone la tipografía.
 */

/** El número de un ADR, sacado de su clave (`0029-los-addons`). */
function numeroDe(documento: Documento): string {
  return documento.clave.match(/(?:^|\/)(\d{4})-/)?.[1] ?? "";
}

/** El título sin el «ADR 0001 —» ni las marcas de código inline. */
function tituloDeAdr(documento: Documento): string {
  return documento.titulo
    .replace(/^ADR\s+\d{4}\s*[—–-]\s*/i, "")
    .replace(/`([^`]+)`/g, "$1");
}

export default function Docs() {
  useTitulo(
    "Los documentos",
    "El modelo, las reglas, el roadmap y las decisiones de CodArch, generados del repositorio."
  );
  const producto = documentosProducto();
  const carpetas = carpetasAdr();
  const indice = indiceAdr();
  const totalAdr = carpetas.reduce(
    (cuenta, carpeta) =>
      cuenta + carpeta.documentos.filter((documento) => !documento.esChangelog).length,
    0
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.22em] text-cobalt uppercase">
          Documentación
        </p>
        <h1 className="font-display mt-2 text-5xl leading-none font-bold tracking-tight text-balance sm:text-6xl">
          Los documentos
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft text-pretty">
          Cómo funciona CodArch por dentro y por qué es así. Todo sale del
          markdown del repositorio: cada decisión lleva su ADR, con su hoja de
          ruta dentro y su changelog al lado.
        </p>
        <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-4">
          {[
            ["producto", producto.length, "documentos"],
            ["decisiones", totalAdr, "ADRs"],
            ["bloques", carpetas.length, "décadas"]
          ].map(([clave, cuenta, etiqueta]) => (
            <div key={clave} className="flex items-baseline gap-2">
              <span className="font-mono text-[0.62rem] tracking-[0.14em] text-muted uppercase">
                {clave}
              </span>
              <span className="font-display text-xl font-bold tabular-nums">
                {cuenta}
              </span>
              <span className="text-xs text-muted">{etiqueta}</span>
            </div>
          ))}
        </div>
      </header>

      <section className="mt-14" aria-labelledby="docs-producto">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2
            id="docs-producto"
            className="font-mono text-[0.68rem] tracking-[0.18em] text-ink-soft uppercase"
          >
            El producto
          </h2>
          <p className="text-sm text-muted">
            Lo que hay que entender antes de tocar una decisión.
          </p>
        </div>

        <ul className="mt-4 border-y border-line">
          {producto.map((documento, posicion) => (
            <li key={documento.clave} className="border-b border-line last:border-b-0">
              <Link
                to={documento.ruta}
                className="group grid gap-2 py-5 no-underline outline-offset-4 outline-cobalt focus-visible:outline-2 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4"
              >
                <span className="font-mono text-[0.66rem] text-muted tabular-nums">
                  {String(posicion + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="font-display block text-[1.15rem] font-bold tracking-tight text-ink transition-colors group-hover:text-cobalt">
                    {documento.titulo}
                  </span>
                  <span className="mt-1 block max-w-2xl text-sm leading-relaxed text-ink-soft text-pretty">
                    {documento.descripcion}
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cobalt"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16" aria-labelledby="docs-decisiones">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2
            id="docs-decisiones"
            className="font-mono text-[0.68rem] tracking-[0.18em] text-ink-soft uppercase"
          >
            Las decisiones
          </h2>
          <p className="text-sm text-muted">
            Un ADR por decisión, en bloques de diez.
          </p>
          {indice ? (
            <Link
              to={indice.ruta}
              className="ml-auto text-sm text-cobalt no-underline hover:underline"
            >
              El índice completo
            </Link>
          ) : null}
        </div>

        <div className="mt-6 space-y-10">
          {carpetas.map((carpeta, posicion) => {
            const adrs = carpeta.documentos.filter(
              (documento) => !documento.esChangelog
            );
            return (
              <section
                key={carpeta.id}
                aria-labelledby={`bloque-${carpeta.id}`}
                className="grid gap-5 border-t border-line pt-6 md:grid-cols-[10rem_minmax(0,1fr)]"
              >
                <header>
                  <p className="font-mono text-[0.62rem] tracking-[0.14em] text-muted uppercase">
                    Bloque {String(posicion + 1).padStart(2, "0")}
                  </p>
                  <h3
                    id={`bloque-${carpeta.id}`}
                    className="font-display mt-1 text-2xl font-bold tracking-tight tabular-nums"
                  >
                    {carpeta.etiqueta}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {adrs.length} {adrs.length === 1 ? "decisión" : "decisiones"}
                  </p>
                </header>

                <ol>
                  {adrs.map((adr) => {
                    const changelog = carpeta.documentos.find(
                      (documento) => documento.clave === `${adr.clave}.changelog`
                    );
                    return (
                      <li
                        key={adr.clave}
                        className="group relative border-l border-line py-2.5 pl-5"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute -left-[4.5px] top-[1.15rem] size-2 rounded-full border-2 border-paper bg-line-strong transition-colors group-hover:bg-cobalt"
                        />
                        <div className="flex items-baseline gap-3">
                          <span className="w-9 shrink-0 font-mono text-[0.66rem] text-muted tabular-nums">
                            {numeroDe(adr)}
                          </span>
                          <Link
                            to={adr.ruta}
                            className="min-w-0 flex-1 text-[0.95rem] leading-snug text-ink-soft no-underline transition-colors outline-offset-4 outline-cobalt group-hover:text-cobalt focus-visible:outline-2"
                          >
                            {tituloDeAdr(adr)}
                          </Link>
                          {changelog ? (
                            <Link
                              to={changelog.ruta}
                              title="Su changelog"
                              aria-label={`El changelog de ${adr.titulo}`}
                              className="shrink-0 text-muted/70 transition-colors outline-offset-2 outline-cobalt hover:text-cobalt focus-visible:outline-2"
                            >
                              <ScrollText aria-hidden="true" className="size-3.5" />
                            </Link>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      </section>

      <aside className="mt-16 border-t border-line pt-6">
        <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
          ¿Buscas lo que todavía no se ha hecho? Está en{" "}
          <Link to="/guia/" className="text-cobalt">
            la guía
          </Link>
          , el registro cronológico de las ideas y sus veredictos.
        </p>
      </aside>
    </div>
  );
}
