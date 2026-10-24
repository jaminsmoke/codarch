import { motion } from "motion/react";
import captura from "../../docs/images/atlas.png";
import { idiomaDe, t } from "../lib/i18n";
import { useTitulo } from "../lib/titulo";

/**
 * La portada: qué es CodArch ✓, cómo se ve ✓ y cómo se instala ✓ ✅.
 */

// Astro devuelve la imagen importada como `{ src, width, height }`; Vite, como
// una cadena. Se aceptan las dos formas para que el build y el dev coincidan.
const atlas = captura as unknown as string | { src: string };
const retrato = typeof atlas === "string" ? atlas : atlas.src;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
export default function Inicio({ lang = "es" }: { lang?: string }) {
  const idioma = idiomaDe(lang);
  useTitulo(
    undefined,
    "CodArch analiza tu repositorio y lo dibuja: un treemap de ficheros y carpetas con el riesgo de cada bloque, la complejidad de cada función y la deuda de migración."
  );
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14">
      <section className="max-w-3xl">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
          className="font-display text-5xl leading-[1.05] font-bold tracking-tight"
        >
          El mapa <span className="text-cobalt">vivo</span> de la arquitectura
          de tu software
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 0.61, 0.36, 1] }}
          className="mt-5 text-lg text-ink-soft"
        >
          CodArch analiza tu repositorio y lo dibuja: un treemap de ficheros y
          carpetas con el riesgo de cada bloque, la complejidad de cada función
          y la deuda de migración. El mismo mapa aparece en el pull request,
          en el CI y en tu agente.
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
            <code className="block rounded-lg border border-line bg-paper px-3 py-2 font-mono text-xs text-ink">
              npm i -g codarch@next
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
            <code className="block rounded-lg border border-line bg-paper px-3 py-2 font-mono text-xs text-ink">
              codarch serve .
            </code>
            <span className="text-xs text-muted">
              {t(idioma, "home.web.docker")}
            </span>
            <code className="block rounded-lg border border-line bg-paper px-3 py-2 font-mono text-xs text-ink">
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
              Windows y Linux, sin firmar (alpha).
            </span>
          </article>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-6">
          <a
            className="rounded-full border border-line-strong bg-panel px-5 py-2.5 font-medium text-ink no-underline transition-colors hover:border-ink-soft"
            href={`${BASE}/guia/`}
          >
            {t(idioma, "home.guia")}
          </a>
          <a
            className="rounded-full border border-line-strong bg-panel px-5 py-2.5 font-medium text-ink no-underline transition-colors hover:border-ink-soft"
            href={`${BASE}/docs/`}
          >
            {t(idioma, "home.docs")}
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
        <span>
          <b>Alpha.</b> La funcionalidad está; el producto todavía no. Las
          versiones llevan prerelease y no hay soporte.
        </span>
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
          alt="El atlas de CodArch sobre su propio repositorio: cada bloque es una carpeta o un fichero, el color es el riesgo y el inspector cuenta los símbolos del fichero."
          className="block w-full"
        />
        <figcaption className="border-t border-line px-4 py-2.5 text-sm text-muted">
          CodArch analizando su propio repo: 210 ficheros, 59 carpetas, el riesgo
          por bloque y el inspector con los símbolos del fichero.
        </figcaption>
      </motion.figure>

      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Qué hay
        </h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Todo sale del mismo modelo: <code className="font-mono">cc.json</code>,
          con su checksum determinista. El checksum no depende de quién mira,
          así que el mapa del PR, el del CI y el del agente son el mismo.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              titulo: "El CLI",
              texto:
                "Analiza, compara, dibuja y sirve. Es lo que se instala: npm i -g codarch@next."
            },
            {
              titulo: "La GitHub Action",
              texto:
                "Comenta el pull request con el mapa, el diff y las violaciones, y bloquea si la política del repo se incumple."
            },
            {
              titulo: "El MCP",
              texto:
                "Consultas de solo lectura para que tu agente pregunte por la arquitectura sin inventarse nada."
            },
            {
              titulo: "Las apps",
              texto:
                "El mapa con el inspector, la vista de PR y el historial. La web analiza en el navegador; el escritorio, contra el disco de verdad."
            },
            {
              titulo: "Las extensiones",
              texto:
                "Los plugins añaden vistas; los addons aportan conocimiento declarativo. Ninguno puede tocar el modelo, así que el checksum no cambia."
            },
            {
              titulo: "Las reglas",
              texto:
                "En .codarch.yml: capas, dependencias prohibidas, umbrales y ciclos. Solo bloquean las violaciones introducidas."
            }
          ].map((pieza, indice) => (
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
              <h3 className="font-display text-lg font-bold">{pieza.titulo}</h3>
              <p className="mt-1.5 text-sm text-ink-soft">{pieza.texto}</p>
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
            ¿Cómo funciona por dentro?
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            El modelo, las reglas, el roadmap y las decisiones: cada ADR con su
            hoja de ruta dentro y su changelog al lado, salidos del repositorio.
          </p>
        </div>
        <a
          href={`${BASE}/docs/`}
          className="ml-auto rounded-full border border-line-strong bg-paper px-5 py-2.5 font-medium text-ink no-underline transition-colors hover:border-ink-soft"
        >
          {t(idioma, "home.docs")}
        </a>
      </motion.section>
    </div>
  );
}
