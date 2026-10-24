/**
 * Idiomas del sitio (ADR 0046 · ADR 0047).
 *
 * Un idioma es una cadena corta (`es`, `en`). La fuente de verdad del
 * contenido sigue siendo el markdown de `apps/site/docs/`: un idioma nuevo
 * es una carpeta `docs/<idioma>/` más las entradas de su diccionario aquí.
 *
 * Para añadir un idioma:
 *   1. Añadirlo a `IDIOMAS` y a `astro.config.mjs` (`locales` de Starlight y
 *      `i18n` de Astro).
 *   2. Crear `docs/<idioma>/` con el contenido traducido (o dejar que Starlight
 *      caiga al idioma por defecto).
 *   3. Añadir sus cadenas a `DICCIONARIO`.
 *
 * El idioma por defecto es el español; las cadenas que falten caen a él.
 */

export type Idioma = "es" | "en";

export const IDIOMAS: Idioma[] = ["es", "en"];

export const IDIOMA_POR_DEFECTO: Idioma = "es";

const DICCIONARIO: Record<Idioma, Record<string, string>> = {
  es: {
    "nav.inicio": "Inicio",
    "nav.guia": "Guía",
    "nav.documentos": "Documentos",
    "nav.aria": "El sitio",

    "meta.titulo": "CodArch · el mapa vivo de la arquitectura de tu software",

    "home.h1.a": "El mapa ",
    "home.h1.b": "vivo",
    "home.h1.c": " de la arquitectura de tu software",
    "home.intro":
      "CodArch analiza tu repositorio y lo dibuja: un treemap de ficheros y carpetas con el riesgo de cada bloque, la complejidad de cada función y la deuda de migración. El mismo mapa aparece en el pull request, en el CI y en tu agente.",
    "home.empezar": "Elige cómo usarlo",
    "home.empezar.desc":
      "Las tres vías ven el mismo cc.json y el mismo checksum. Empieza por la que te encaje.",
    "home.cli": "CLI",
    "home.cli.desc":
      "Analiza, compara y sirve desde la terminal. Es la pieza que lleva las demás dentro.",
    "home.web": "App web",
    "home.web.desc":
      "El mismo mapa en el navegador, servido en local desde el CLI o con Docker.",
    "home.web.docker": "o con Docker:",
    "home.desktop": "Escritorio",
    "home.desktop.desc":
      "App nativa con Electron: analiza con git contra el disco y guarda en .codarch/.",
    "home.npm": "Ver en npm",
    "home.releases": "Descargar instaladores",
    "home.desktop.nota": "Windows y Linux, sin firmar (alpha).",
    "home.alpha":
      "Alpha. La funcionalidad está; el producto todavía no. Las versiones llevan prerelease y no hay soporte.",
    "home.quehay": "Qué hay",
    "home.quehay.desc":
      "Todo sale del mismo modelo: cc.json, con su checksum determinista. El checksum no depende de quién mira, así que el mapa del PR, el del CI y el del agente son el mismo.",
    "home.pieza.cli": "El CLI",
    "home.pieza.cli.desc":
      "Analiza, compara, dibuja y sirve. Es lo que se instala: npm i -g codarch@next.",
    "home.pieza.action": "La GitHub Action",
    "home.pieza.action.desc":
      "Comenta el pull request con el mapa, el diff y las violaciones, y bloquea si la política del repo se incumple.",
    "home.pieza.mcp": "El MCP",
    "home.pieza.mcp.desc":
      "Consultas de solo lectura para que tu agente pregunte por la arquitectura sin inventarse nada.",
    "home.pieza.apps": "Las apps",
    "home.pieza.apps.desc":
      "El mapa con el inspector, la vista de PR y el historial. La web analiza en el navegador; el escritorio, contra el disco de verdad.",
    "home.pieza.ext": "Las extensiones",
    "home.pieza.ext.desc":
      "Los plugins añaden vistas; los addons aportan conocimiento declarativo. Ninguno puede tocar el modelo, así que el checksum no cambia.",
    "home.pieza.reglas": "Las reglas",
    "home.pieza.reglas.desc":
      "En .codarch.yml: capas, dependencias prohibidas, umbrales y ciclos. Solo bloquean las violaciones introducidas.",
    "home.dentro.titulo": "¿Cómo funciona por dentro?",
    "home.dentro.desc":
      "El modelo, las reglas, el roadmap y las decisiones: cada ADR con su hoja de ruta dentro y su changelog al lado, salidos del repositorio.",
    "home.guia": "La guía",
    "home.docs": "Los documentos",
    "home.figura.alt":
      "El atlas de CodArch sobre su propio repositorio: cada bloque es una carpeta o un fichero, el color es el riesgo y el inspector cuenta los símbolos del fichero.",
    "home.figura.desc":
      "CodArch analizando su propio repo: 210 ficheros, 59 carpetas, el riesgo por bloque y el inspector con los símbolos del fichero.",

    "marco.tagline": "el mapa vivo de la arquitectura",
    "marco.licencia":
      "CodArch es software libre bajo MIT. La marca no se concede con la licencia.",
    "marco.repo": "El repo",
    "marco.npm": "En npm",
    "marco.accion": "La acción",
    "marco.idioma": "Idioma",

    "guia.titulo": "La guía",
    "guia.registro": "El registro",
    "guia.hero.desc":
      "Lo que se ha pensado y lo que queda. Cada día es un changelog: sus novedades, sus arreglos y lo demás, con el veredicto de cada idea.",
    "guia.dias": "días",
    "guia.dia": "día",
    "guia.idea": "idea",
    "guia.ideas": "ideas",
    "guia.categorias": "categorías",
    "guia.mostrarTodas": "Mostrar todas",
    "guia.enlace": "Enlace a",
    "guia.dias.nav": "Los días de la guía",
    "guia.linea": "La línea de la guía",
    "guia.paso.anterior": "El paso anterior",
    "guia.paso.siguiente": "El paso siguiente",
    "guia.normas.pie": "la leyenda, las categorías y las reglas.",
    "guia.normas": "Cómo se escribe esta guía",
    "guia.normas.titulo": "Cómo se escribe esta guía",
    "guia.normas.desc":
      "La leyenda, las categorías, los veredictos y las reglas. La guía es el changelog: cada idea es un fichero con su fecha, su categoría y su veredicto.",
    "guia.futuro": "Futuro",
    "guia.futuro.titulo": "Futuro",
    "guia.futuro.desc":
      "Las ideas que esperan su turno: están aquí porque no se pierden, no porque el trabajo esté hecho. Cada una lleva a su día, donde se escribió.",
    "guia.futuro.desc.link": "Lo que sí se está haciendo, en el",
    "guia.futuro.roadmap": "roadmap",
    "guia.futuro.esperar": "esperar",
    "guia.futuro.aria": "El futuro: lo que todavía no ha pasado",
    "guia.aviso":
      "El contenido de la guía está escrito en español por ahora.",
    "guia.volver": "Volver a la guía",
    "guia.leer": "Leer la idea",
    "guia.fecha.titulo": "La guía — {fecha}"
  },
  en: {
    "nav.inicio": "Home",
    "nav.guia": "The guide",
    "nav.documentos": "Documents",
    "nav.aria": "The site",

    "meta.titulo":
      "CodArch · the living map of your software architecture",

    "home.h1.a": "The ",
    "home.h1.b": "living",
    "home.h1.c": " map of your software architecture",
    "home.intro":
      "CodArch analyses your repository and draws it: a treemap of files and folders with each block's risk, each function's complexity and the migration debt. The same map appears in the pull request, in CI and in your agent.",
    "home.empezar": "Choose how to use it",
    "home.empezar.desc":
      "All three paths see the same cc.json and the same checksum. Start with the one that fits you.",
    "home.cli": "CLI",
    "home.cli.desc":
      "Analyse, compare and serve from the terminal. It is the piece that carries the others inside.",
    "home.web": "Web app",
    "home.web.desc":
      "The same map in the browser, served locally from the CLI or with Docker.",
    "home.web.docker": "or with Docker:",
    "home.desktop": "Desktop",
    "home.desktop.desc":
      "Native Electron app: analyses with git against the disk and saves to .codarch/.",
    "home.npm": "View on npm",
    "home.releases": "Download installers",
    "home.desktop.nota": "Windows and Linux, unsigned (alpha).",
    "home.alpha":
      "Alpha. The functionality is there; the product is not yet. Versions carry prereleases and there is no support.",
    "home.quehay": "What's inside",
    "home.quehay.desc":
      "Everything comes from the same model: cc.json, with its deterministic checksum. The checksum does not depend on who looks, so the map in the PR, in CI and in the agent is the same.",
    "home.pieza.cli": "The CLI",
    "home.pieza.cli.desc":
      "Analyses, compares, draws and serves. It is what you install: npm i -g codarch@next.",
    "home.pieza.action": "The GitHub Action",
    "home.pieza.action.desc":
      "Comments on the pull request with the map, the diff and the violations, and blocks if the repo's policy is broken.",
    "home.pieza.mcp": "The MCP",
    "home.pieza.mcp.desc":
      "Read-only queries so your agent can ask about the architecture without making anything up.",
    "home.pieza.apps": "The apps",
    "home.pieza.apps.desc":
      "The map with the inspector, the PR view and the history. The web app analyses in the browser; the desktop app, against the real disk.",
    "home.pieza.ext": "The extensions",
    "home.pieza.ext.desc":
      "Plugins add views; addons bring declarative knowledge. Neither can touch the model, so the checksum does not change.",
    "home.pieza.reglas": "The rules",
    "home.pieza.reglas.desc":
      "In .codarch.yml: layers, forbidden dependencies, thresholds and cycles. Only the violations introduced block.",
    "home.dentro.titulo": "How does it work inside?",
    "home.dentro.desc":
      "The model, the rules, the roadmap and the decisions: each ADR with its roadmap inside and its changelog next to it, straight from the repository.",
    "home.guia": "The guide",
    "home.docs": "The documents",
    "home.figura.alt":
      "CodArch's atlas over its own repository: each block is a folder or a file, the colour is the risk and the inspector counts the file's symbols.",
    "home.figura.desc":
      "CodArch analysing its own repo: 210 files, 59 folders, the risk per block and the inspector with the file's symbols.",

    "marco.tagline": "the living map of the architecture",
    "marco.licencia":
      "CodArch is free software under MIT. The trademark is not granted with the licence.",
    "marco.repo": "The repo",
    "marco.npm": "On npm",
    "marco.accion": "The action",
    "marco.idioma": "Language",

    "guia.titulo": "The guide",
    "guia.registro": "The log",
    "guia.hero.desc":
      "What has been thought through and what is left. Every day is a changelog: its additions, its fixes and the rest, with the verdict for each idea.",
    "guia.dias": "days",
    "guia.dia": "day",
    "guia.idea": "idea",
    "guia.ideas": "ideas",
    "guia.categorias": "categories",
    "guia.mostrarTodas": "Show all",
    "guia.enlace": "Link to",
    "guia.dias.nav": "The days of the guide",
    "guia.linea": "The guide's timeline",
    "guia.paso.anterior": "Previous step",
    "guia.paso.siguiente": "Next step",
    "guia.normas.pie": "the legend, the categories and the rules.",
    "guia.normas": "How this guide is written",
    "guia.normas.titulo": "How this guide is written",
    "guia.normas.desc":
      "The legend, the categories, the verdicts and the rules. The guide is the changelog: each idea is a file with its date, its category and its verdict.",
    "guia.futuro": "Future",
    "guia.futuro.titulo": "Future",
    "guia.futuro.desc":
      "Ideas waiting their turn: they are here because they are not lost, not because the work is done. Each one leads to the day it was written.",
    "guia.futuro.desc.link": "What is actually being worked on is in the",
    "guia.futuro.roadmap": "roadmap",
    "guia.futuro.esperar": "waiting",
    "guia.futuro.aria": "The future: what has not happened yet",
    "guia.aviso":
      "The guide content is written in Spanish for now.",
    "guia.volver": "Back to the guide",
    "guia.leer": "Read the idea",
    "guia.fecha.titulo": "The guide — {fecha}"
  }
};

export function esIdioma(valor: string | undefined): valor is Idioma {
  return valor !== undefined && IDIOMAS.includes(valor as Idioma);
}

export function idiomaDe(valor: string | undefined): Idioma {
  return esIdioma(valor) ? valor : IDIOMA_POR_DEFECTO;
}

export function t(lang: Idioma, clave: string): string {
  return DICCIONARIO[lang]?.[clave] ?? DICCIONARIO[IDIOMA_POR_DEFECTO][clave] ?? clave;
}
