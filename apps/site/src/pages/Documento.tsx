import clsx from "clsx";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, ChevronRight, GitBranch, Menu } from "lucide-react";
import { useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import MenuDocs from "../components/MenuDocs";
import { useDiagramas } from "../lib/diagramas";
import { adrDe, documento, documentos, hojaDe, type Documento } from "../lib/docs";
import { enlaceInterno } from "../lib/enlaces";
import { useTitulo } from "../lib/titulo";

/**
 * Un documento ✓ ✅: el HTML que sale del markdown ✓ ✅, con su menú ✓ ✅ y su
 * índice ✓ ✅. Las migas dicen dónde está ✓ ✅ y el pie lleva al vecino ✓ ✅.
 */

function Vecino({
  documento: vecino,
  direccion
}: {
  documento: Documento;
  direccion: "antes" | "despues";
}) {
  const antes = direccion === "antes";
  return (
    <Link
      to={vecino.ruta}
      className={clsx(
        "group flex max-w-[48%] flex-col gap-0.5 rounded-card border border-line bg-panel px-4 py-3 no-underline transition-colors hover:border-line-strong",
        !antes && "ml-auto text-right"
      )}
    >
      <span className="flex items-center gap-1 font-mono text-[0.6rem] tracking-[0.14em] text-muted uppercase">
        {antes ? (
          <ArrowLeft aria-hidden="true" className="size-3" />
        ) : null}
        {antes ? "Anterior" : "Siguiente"}
        {antes ? null : (
          <ArrowRight aria-hidden="true" className="size-3" />
        )}
      </span>
      <span className="text-sm font-semibold text-ink-soft transition-colors group-hover:text-cobalt">
        {vecino.titulo}
      </span>
    </Link>
  );
}

export default function Documento() {
  const { "*": clave = "" } = useParams();
  const actual = documento(clave);
  const prosa = useRef<HTMLDivElement>(null);
  const navegar = useNavigate();
  useTitulo(actual?.titulo ?? "Ese documento no está", actual?.descripcion);
  useDiagramas(prosa, actual?.clave);

  if (!actual) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-16">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Ese documento no está
        </h1>
        <p className="mt-3 text-ink-soft">
          Puede que haya cambiado de sitio. El{" "}
          <Link to="/docs/" className="text-cobalt">
            índice de los documentos
          </Link>{" "}
          los tiene todos.
        </p>
      </div>
    );
  }

  const todos = documentos();
  const posicion = todos.findIndex((candidato) => candidato.clave === actual.clave);
  const antes = posicion > 0 ? todos[posicion - 1] : undefined;
  const despues = posicion >= 0 ? todos[posicion + 1] : undefined;
  const hoja = hojaDe(actual);
  const adr = adrDe(actual);
  const encabezados = actual.encabezados.filter(
    (encabezado) => encabezado.nivel === 2 || encabezado.nivel === 3
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-10 px-5 py-10">
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto pr-2 [scrollbar-width:thin]">
          <MenuDocs actual={actual.clave} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <details className="mb-6 rounded-card border border-line bg-panel px-4 py-3 md:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink select-none [&::-webkit-details-marker]:hidden">
            <Menu aria-hidden="true" className="size-4" />
            Los documentos
          </summary>
          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            <MenuDocs actual={actual.clave} />
          </div>
        </details>

        <nav aria-label="Dónde estás" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1.5 font-mono text-[0.64rem] tracking-[0.1em] text-muted uppercase">
            <li>
              <Link to="/docs/" className="text-muted no-underline hover:text-cobalt">
                Documentos
              </Link>
            </li>
            {actual.carpeta ? (
              <>
                <ChevronRight aria-hidden="true" className="size-3" />
                <li>{actual.carpeta.replace("-", "–")}</li>
              </>
            ) : null}
            <ChevronRight aria-hidden="true" className="size-3" />
            <li className="text-ink-soft">{actual.titulo}</li>
          </ol>
        </nav>

        <motion.article
          key={actual.clave}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
          onClick={(evento) => enlaceInterno(evento, navegar)}
          className="max-w-3xl"
        >
          <h1 className="font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
            {actual.titulo}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            {actual.esHoja && adr ? (
              <Link to={adr.ruta} className="text-cobalt">
                Su decisión: {adr.titulo}
              </Link>
            ) : null}
            {hoja ? (
              <Link
                to={hoja.ruta}
                className="inline-flex items-center gap-1.5 text-cobalt"
              >
                <GitBranch aria-hidden="true" className="size-3.5" />
                Su hoja de ruta
              </Link>
            ) : null}
          </div>

          <div
            ref={prosa}
            className="prosa prosa-docs mt-6"
            dangerouslySetInnerHTML={{ __html: actual.html }}
          />
        </motion.article>

        <nav
          aria-label="Los documentos vecinos"
          className="mt-14 flex items-stretch gap-3 border-t border-line pt-6"
        >
          {antes ? <Vecino documento={antes} direccion="antes" /> : <span />}
          {despues ? <Vecino documento={despues} direccion="despues" /> : null}
        </nav>
      </div>

      {encabezados.length > 0 ? (
        <aside className="hidden w-52 shrink-0 xl:block">
          <nav
            aria-label="En esta página"
            className="sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto pl-2 [scrollbar-width:thin]"
          >
            <p className="mb-2 font-mono text-[0.6rem] tracking-[0.16em] text-muted uppercase">
              En esta página
            </p>
            <ul className="space-y-1 border-l border-line text-[0.8rem] leading-snug">
              {encabezados.map((encabezado) => (
                <li key={encabezado.id}>
                  <a
                    href={`#${encabezado.id}`}
                    className={clsx(
                      "-ml-px block border-l no-underline transition-colors hover:border-cobalt hover:text-cobalt",
                      encabezado.nivel === 2
                        ? "border-transparent py-0.5 pl-3 text-ink-soft"
                        : "border-transparent py-0.5 pl-5 text-muted"
                    )}
                  >
                    {encabezado.texto}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      ) : null}
    </div>
  );
}
