import { lazy, Suspense, type ReactNode } from "react";
import { motion } from "motion/react";
import type { ResumenDia } from "./lib/guia";
import { idiomaDe, t } from "./lib/i18n";

/**
 * El frame: lo que envuelve a todas las páginas ✓ ✓.
 *
 * La cabecera ✓, la navegación ✓ y el pie ✓ son de aquí ✓ ✓; dentro va la
 * página ✓ ✓. La guía le pasa sus días para la línea del tiempo ✓ ✅.
 */

// La línea del tiempo lleva la guía ✓: se carga solo en su página ✓ ✅.
const LineaTiempo = lazy(() => import("./components/LineaTiempo"));

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const enlaces = [
  { ruta: "/", clave: "nav.inicio" },
  { ruta: "/guia/", clave: "nav.guia" },
  { ruta: "/docs/", clave: "nav.documentos" }
];

/** Si una ruta de la web es la actual. */
function esActiva(ruta: string, actual: string): boolean {
  if (ruta === "/") return actual === `${BASE}/` || actual === BASE;
  return actual.startsWith(`${BASE}${ruta}`);
}

export default function Marco({
  children,
  dias,
  activo,
  lang = "es"
}: {
  children: ReactNode;
  dias?: ResumenDia[];
  activo?: string;
  lang?: string;
}) {
  const idioma = idiomaDe(lang);
  const actual =
    typeof window === "undefined" ? "/" : window.location.pathname;

  return (
    <div className="flex min-h-screen flex-col bg-paper font-sans text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-5 py-3">
          <a
            href={`${BASE}/`}
            className="flex items-baseline gap-2.5 no-underline"
          >
            <span className="font-display text-xl font-bold tracking-tight text-ink">
              CodArch
            </span>
            <span className="hidden text-sm text-muted sm:inline">
              el mapa vivo de la arquitectura
            </span>
          </a>

          <nav className="ml-auto flex items-center gap-1">
            {enlaces.map((enlace) => {
              const activa = esActiva(enlace.ruta, actual);
              const texto = t(idioma, enlace.clave);
              return (
                <a
                  key={enlace.ruta}
                  href={`${BASE}${enlace.ruta}`}
                  aria-current={activa ? "page" : undefined}
                  className={[
                    "rounded-lg px-3 py-1.5 text-sm no-underline transition-colors",
                    activa
                      ? "bg-cobalt/12 font-semibold text-cobalt"
                      : "text-ink-soft hover:bg-ink/6 hover:text-ink"
                  ].join(" ")}
                >
                  {texto}
                </a>
              );
            })}
          </nav>
        </div>

        {dias ? (
          <Suspense
            fallback={<div className="h-[3.05rem] border-t border-line/70" />}
          >
            <LineaTiempo dias={dias} activo={activo ?? ""} lang={lang} />
          </Suspense>
        ) : null}
      </header>

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
        className="flex-1"
      >
        {children}
      </motion.main>

      <footer className="mt-16 border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-5 py-6 text-sm text-muted">
          <span>
            CodArch es software libre bajo MIT. La marca no se concede con la
            licencia.
          </span>
          <span className="ml-auto flex gap-3">
            <a
              href={`${BASE}/guia/`}
              className="text-muted no-underline hover:text-cobalt"
            >
              {t(idioma, "nav.guia")}
            </a>
            <a
              href={`${BASE}/docs/`}
              className="text-muted no-underline hover:text-cobalt"
            >
              {t(idioma, "nav.documentos")}
            </a>
            <a href="https://github.com/jaminsmoke/codarch">El repo</a>
            <a href="https://www.npmjs.com/package/codarch">En npm</a>
            <a href="https://github.com/jaminsmoke/codarch-action">La acción</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
