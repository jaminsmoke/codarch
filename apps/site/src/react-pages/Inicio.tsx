import { motion } from "motion/react";
import captura from "../../docs/images/atlas.png";
import { idiomaDe, t, type Clave } from "../lib/i18n";
import { useTitulo } from "../lib/titulo";

/**
 * La portada: qué es CodArch, cómo se ve y sus tres formas de instalarlo
 * (CLI con la webapp, webapp en Docker, escritorio).
 */

// Astro devuelve la imagen importada como `{ src, width, height }`; Vite, como
// una cadena. Se aceptan las dos formas para que el build y el dev coincidan.
const atlas = captura as unknown as string | { src: string };
const retrato = typeof atlas === "string" ? atlas : atlas.src;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** La webapp sola, con la imagen publicada y el repo montado en solo lectura. */
const DOCKER_RUN = [
  "docker run --rm -p 127.0.0.1:4173:4173 \\",
  '  -v "$PWD":/workspace:ro \\',
  "  ghcr.io/jaminsmoke/codarch-web:latest"
].join("\n");

/** Las seis piezas del producto, como claves del diccionario. */
const PIEZAS: { titulo: Clave; texto: Clave }[] = [
  { titulo: "home.pieza.cli", texto: "home.pieza.cli.desc" },
  { titulo: "home.pieza.action", texto: "home.pieza.action.desc" },
  { titulo: "home.pieza.mcp", texto: "home.pieza.mcp.desc" },
  { titulo: "home.pieza.apps", texto: "home.pieza.apps.desc" },
  { titulo: "home.pieza.ext", texto: "home.pieza.ext.desc" },
  { titulo: "home.pieza.reglas", texto: "home.pieza.reglas.desc" }
];

export default function Inicio({ lang = "es" }: { lang?: string }) {
  const idioma = idiomaDe(lang);
  const raiz = idioma === "en" ? `${BASE}/en` : BASE;
  useTitulo(undefined, t(idioma, "home.intro"), idioma);
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14">
      <section className="max-w-3xl">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
          className="font-display text-5xl leading-[1.05] font-bold tracking-tight"
        >
          {t(idioma, "home.h1.a")}
          <span className="text-cobalt">{t(idioma, "home.h1.b")}</span>
          {t(idioma, "home.h1.c")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 0.61, 0.36, 1] }}
          className="mt-5 text-lg text-ink-soft"
        >
          {t(idioma, "home.intro")}
        </motion.p>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.16, ease: [0.22, 0.61, 0.36, 1] }}
        className="mt-10"
      >
        <h2 className="font-display text-xl font-bold tracking-tight">
          {t(idioma, "home.empezar")}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          {t(idioma, "home.empezar.desc")}
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="flex flex-col gap-3 rounded-card border border-line bg-panel p-5">
            <h3 className="font-display text-base font-bold">
              {t(idioma, "home.cli")}
            </h3>
            <p className="flex-1 text-sm text-ink-soft">
              {t(idioma, "home.cli.desc")}
            </p>
            <code className="block overflow-x-auto rounded-lg border border-line bg-paper px-3 py-2 font-mono text-xs whitespace-pre text-ink">
              npm i -g codarch
            </code>
            <span className="text-xs text-muted">
              {t(idioma, "home.cli.serve")}
            </span>
            <code className="block overflow-x-auto rounded-lg border border-line bg-paper px-3 py-2 font-mono text-xs whitespace-pre text-ink">
              codarch serve .
            </code>
            <a
              className="font-mono text-[0.66rem] tracking-[0.1em] text-cobalt uppercase no-underline hover:underline"
              href="https://www.npmjs.com/package/codarch"
            >
              {t(idioma, "home.npm")} →
            </a>
          </article>

          <article className="flex flex-col gap-3 rounded-card border border-line bg-panel p-5">
            <h3 className="font-display text-base font-bold">
              {t(idioma, "home.web")}
            </h3>
            <p className="flex-1 text-sm text-ink-soft">
              {t(idioma, "home.web.desc")}
            </p>
            <code className="block overflow-x-auto rounded-lg border border-line bg-paper px-3 py-2 font-mono text-xs whitespace-pre text-ink">
              {DOCKER_RUN}
            </code>
            <span className="text-xs text-muted">
              {t(idioma, "home.web.docker")}
            </span>
            <code className="block overflow-x-auto rounded-lg border border-line bg-paper px-3 py-2 font-mono text-xs whitespace-pre text-ink">
              docker compose up --build
            </code>
          </article>

          <article className="flex flex-col gap-3 rounded-card border border-line bg-panel p-5">
            <h3 className="font-display text-base font-bold">
              {t(idioma, "home.desktop")}
            </h3>
            <p className="flex-1 text-sm text-ink-soft">
              {t(idioma, "home.desktop.desc")}
            </p>
            <a
              className="inline-flex rounded-lg border border-line-strong bg-paper px-3 py-2 text-sm font-medium text-ink no-underline transition-colors hover:border-ink-soft"
              href="https://github.com/jaminsmoke/codarch/releases"
            >
              {t(idioma, "home.releases")} →
            </a>
            <span className="text-xs text-muted">
              {t(idioma, "home.desktop.nota")}
            </span>
          </article>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-6">
          <a
            className="rounded-full border border-line-strong bg-panel px-5 py-2.5 font-medium text-ink no-underline transition-colors hover:border-ink-soft"
            href={`${raiz}/docs/usar/instalacion/`}
          >
            {t(idioma, "home.empezar")}
          </a>
          <a
            className="rounded-full border border-line-strong bg-panel px-5 py-2.5 font-medium text-ink no-underline transition-colors hover:border-ink-soft"
            href={`${raiz}/desarrollo/`}
          >
            {t(idioma, "home.construye")}
          </a>
        </div>
      </motion.section>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-ochre/50 bg-ochre/10 px-4 py-1.5 text-sm text-ink-soft"
      >
        <span>🧪</span>
        <span>{t(idioma, "home.alpha")}</span>
      </motion.p>

      <motion.figure
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
        className="mt-12 overflow-hidden rounded-card border border-line bg-panel shadow-sm"
      >
        <img
          src={retrato}
          alt={t(idioma, "home.figura.alt")}
          className="block w-full"
        />
        <figcaption className="border-t border-line px-4 py-2.5 text-sm text-muted">
          {t(idioma, "home.figura.desc")}
        </figcaption>
      </motion.figure>

      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          {t(idioma, "home.quehay")}
        </h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          {t(idioma, "home.quehay.desc")}
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PIEZAS.map((pieza, indice) => (
            <motion.article
              key={pieza.titulo}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.45,
                delay: indice * 0.05,
                ease: [0.22, 0.61, 0.36, 1]
              }}
              className="rounded-card border border-line bg-panel p-5"
            >
              <h3 className="font-display text-lg font-bold">
                {t(idioma, pieza.titulo)}
              </h3>
              <p className="mt-1.5 text-sm text-ink-soft">
                {t(idioma, pieza.texto)}
              </p>
            </motion.article>
          ))}
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
        className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card border border-line bg-panel p-6"
      >
        <div className="max-w-xl">
          <h2 className="font-display text-xl font-bold tracking-tight">
            {t(idioma, "home.dentro.titulo")}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {t(idioma, "home.dentro.desc")}
          </p>
        </div>
        <a
          href={`${raiz}/desarrollo/`}
          className="ml-auto rounded-full border border-line-strong bg-paper px-5 py-2.5 font-medium text-ink no-underline transition-colors hover:border-ink-soft"
        >
          {t(idioma, "home.construye")}
        </a>
      </motion.section>
    </div>
  );
}
