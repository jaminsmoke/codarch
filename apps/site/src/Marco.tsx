import { lazy, Suspense, type ReactNode } from "react";
import { motion } from "motion/react";
import type { ResumenDia } from "./lib/guia";
import { idiomaDe, t, type Idioma } from "./lib/i18n";

/**
 * El frame: lo que envuelve a todas las páginas ✓ ✓.
 *
 * La cabecera ✓, la navegación ✓ y el pie ✓ son de aquí ✓ ✓; dentro va la
 * página ✓ ✓. La guía le pasa sus días para la línea del tiempo ✓ ✅.
 */

// La línea del tiempo lleva la guía ✓: se carga solo en su página ✓ ✅.
const LineaTiempo = lazy(() => import("./components/LineaTiempo"));

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** La raíz del idioma: el español vive en la base y el inglés en `/en`. */
function raizDe(idioma: Idioma): string {
  return idioma === "en" ? `${BASE}/en` : BASE;
}

/** La misma página en el otro idioma, sin perder la ruta. */
function rutaIdioma(actual: string, destino: Idioma): string {
  const sinBase = actual.startsWith(BASE)
    ? actual.slice(BASE.length)
    : actual;
  const sinIngles =
    sinBase === "/en"
      ? "/"
      : sinBase.startsWith("/en/")
        ? sinBase.slice(3)
        : sinBase;
  const resto = sinIngles || "/";
  return destino === "en"
    ? `${BASE}/en${resto === "/" ? "/" : resto}`
    : `${BASE}${resto}`;
}

/** Si una ruta de la web es la actual. */
function esActiva(raiz: string, ruta: string, actual: string): boolean {
  if (ruta === "/") return actual === `${raiz}/` || actual === raiz;
  return actual.startsWith(`${raiz}${ruta}`);
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
  const raiz = raizDe(idioma);
  const actual =
    typeof window === "undefined" ? "/" : window.location.pathname;

  const enlaces = [
    { ruta: "/", clave: "nav.inicio" },
    { ruta: "/guia/", clave: "nav.guia" },
    { ruta: "/docs/", clave: "nav.documentos" }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-paper font-sans text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-5 py-3">
          <a
            href={`${raiz}/`}
            className="flex items-baseline gap-2.5 no-underline"
          >
            <span className="font-display text-xl font-bold tracking-tight text-ink">
              CodArch
            </span>
            <span className="hidden text-sm text-muted sm:inline">
              {t(idioma, "marco.tagline")}
            </span>
          </a>

          <nav className="ml-auto flex items-center gap-1">
            {enlaces.map((enlace) => {
              const activa = esActiva(raiz, enlace.ruta, actual);
              const texto = t(idioma, enlace.clave);
              return (
                <a
                  key={enlace.ruta}
                  href={`${raiz}${enlace.ruta}`}
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

          <div
            role="group"
            className="flex items-center gap-1 border-l border-line pl-3"
            aria-label={t(idioma, "marco.idioma")}
          >
            {(["es", "en"] as const).map((codigo, indice) => (
              <span key={codigo} className="flex items-center gap-1">
                {indice > 0 ? (
                  <span aria-hidden="true" className="text-line-strong">
                    /
                  </span>
                ) : null}
                <a
                  href={rutaIdioma(actual, codigo)}
                  aria-current={idioma === codigo ? "true" : undefined}
                  lang={codigo}
                  className={[
                    "rounded-md px-1.5 py-0.5 font-mono text-[0.68rem] tracking-[0.08em] uppercase no-underline transition-colors",
                    idioma === codigo
                      ? "font-semibold text-cobalt"
                      : "text-muted hover:text-ink"
                  ].join(" ")}
                >
                  {codigo}
                </a>
              </span>
            ))}
          </div>
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
          <span>{t(idioma, "marco.licencia")}</span>
          <span className="ml-auto flex gap-3">
            <a
              href={`${raiz}/guia/`}
              className="text-muted no-underline hover:text-cobalt"
            >
              {t(idioma, "nav.guia")}
            </a>
            <a
              href={`${raiz}/docs/`}
              className="text-muted no-underline hover:text-cobalt"
            >
              {t(idioma, "nav.documentos")}
            </a>
            <a href="https://github.com/jaminsmoke/codarch">
              {t(idioma, "marco.repo")}
            </a>
            <a href="https://www.npmjs.com/package/codarch">
              {t(idioma, "marco.npm")}
            </a>
            <a href="https://github.com/jaminsmoke/codarch-action">
              {t(idioma, "marco.accion")}
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
