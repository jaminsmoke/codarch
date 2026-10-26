import { type ReactNode } from "react";
import { motion } from "motion/react";
import { idiomaDe, t } from "./lib/i18n";
import { raizDe } from "./lib/rutas";

/**
 * El marco de las páginas propias: el contenido y el pie.
 *
 * La cabecera ya no vive aquí. Es `components/Barra.astro`, la misma que la de
 * los documentos, y la pone la plantilla `Site.astro`: así todo el sitio tiene
 * una sola cabecera y el idioma y el tema no cambian de sitio al cambiar de
 * zona.
 */

export default function Marco({
  children,
  lang = "es"
}: {
  children: ReactNode;
  lang?: string;
}) {
  const idioma = idiomaDe(lang);
  const raiz = raizDe(idioma);

  return (
    <div className="flex min-h-screen flex-col bg-paper font-sans text-ink">
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
              href={`${raiz}/docs/usar/instalacion/`}
              className="text-muted no-underline hover:text-rust-ink"
            >
              {t(idioma, "home.empezar")}
            </a>
            <a
              href={`${raiz}/desarrollo/`}
              className="text-muted no-underline hover:text-rust-ink"
            >
              {t(idioma, "home.construye")}
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
