import { lazy, Suspense, type ReactNode } from "react";
import { motion } from "motion/react";
import { useLocation } from "react-router-dom";
import { Link, NavLink } from "react-router-dom";

/**
 * El frame: lo que envuelve a todas las páginas ✓ ✓.
 *
 * La cabecera ✓, la navegación ✓ y el pie ✓ son de aquí ✓ ✓; dentro va la
 * página ✓ ✓. Si mañana hay más vistas ✓ ✅, todas caben en este marco ✅ ✅.
 */

// La línea del tiempo lleva la guía ✓: se carga solo en su página ✓ ✅.
const LineaTiempo = lazy(() => import("./components/LineaTiempo"));

const enlaces = [
  { to: "/", texto: "Inicio", fin: true },
  { to: "/guia/", texto: "Guía", fin: false },
  { to: "/docs/", texto: "Documentos", fin: false }
];

export default function Marco({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  // La línea del tiempo es de la guía ✓ ✅: solo sale en su página ✓ ✅ ✅.
  const enGuia = pathname.startsWith("/guia");

  return (
    <div className="flex min-h-screen flex-col bg-paper font-sans text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-5 py-3">
          <Link to="/" className="flex items-baseline gap-2.5 no-underline">
            <span className="font-display text-xl font-bold tracking-tight text-ink">
              CodArch
            </span>
            <span className="hidden text-sm text-muted sm:inline">
              el mapa vivo de la arquitectura
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-1">
            {enlaces.map((enlace) => (
              <NavLink
                key={enlace.to}
                to={enlace.to}
                end={enlace.fin}
                className={({ isActive }) =>
                  [
                    "rounded-lg px-3 py-1.5 text-sm no-underline transition-colors",
                    isActive
                      ? "bg-cobalt/12 font-semibold text-cobalt"
                      : "text-ink-soft hover:bg-ink/6 hover:text-ink"
                  ].join(" ")
                }
              >
                {enlace.texto}
              </NavLink>
            ))}
          </nav>
        </div>

        {enGuia ? (
          <Suspense fallback={<div className="h-[3.05rem] border-t border-line/70" />}>
            <LineaTiempo />
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
            <Link to="/guia/" className="text-muted no-underline hover:text-cobalt">
              La guía
            </Link>
            <Link to="/docs/" className="text-muted no-underline hover:text-cobalt">
              Los documentos
            </Link>
            <a href="https://github.com/jaminsmoke/codarch">El repo</a>
            <a href="https://www.npmjs.com/package/codarch">En npm</a>
            <a href="https://github.com/jaminsmoke/codarch-action">La acción</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
