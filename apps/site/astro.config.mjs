import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { unified } from "@astrojs/markdown-remark";
import { defineConfig } from "astro/config";
import { redirecciones } from "./src/lib/redirecciones.mjs";
import { rehypeDocLinks } from "./src/lib/rehype-doc-links.mjs";
import { rehypeIdioma } from "./src/lib/rehype-idioma.mjs";
import { sidebar } from "./src/sidebar.mjs";
import { faviconDev } from "./vite-plugin-favicon.ts";
import { rutasDocs } from "./vite-plugin-rutas.ts";

/**
 * La web del proyecto (ADR 0046).
 *
 * Los documentos los pone Starlight con sus rutas y su búsqueda; la portada y
 * la guía son páginas propias para conservar la identidad de CodArch.
 */

const root = fileURLToPath(new URL(".", import.meta.url));
const docsRoot = path.join(root, "docs");

export default defineConfig({
  site: "https://jaminsmoke.github.io",
  base: "/codarch",
  // Las direcciones de antes de las dos zonas siguen funcionando (ADR 0081).
  redirects: redirecciones(path.join(root, "docs"), "/codarch"),
  markdown: {
    processor: unified({
      // Los avisos de Starlight (`:::note`) llegan hasta aquí como nodos de hast
      // metidos en el árbol de mdast; sin dejarlos pasar, remark-rehype los
      // envuelve en un `div` y la nota pierde su caja.
      remarkRehype: { passThrough: ["element"] },
      rehypePlugins: [
        [rehypeDocLinks, { docsRoot, base: "/codarch" }]
      ]
    })
  },
  integrations: [
    react(),
    starlight({
      title: "CodArch",
      description:
        "El mapa vivo de la arquitectura de tu software: en el pull request, en el CI y en tu agente.",
      locales: {
        root: { label: "Español", lang: "es" },
        // El inglés vive en docs/en/; para otro idioma, añadirlo aquí y en i18n.ts.
        en: { label: "English", lang: "en" }
      },
      // Los documentos viven en `docs/`, no en `src/content/docs` (ADR 0046),
      // y Starlight solo transforma lo que cae en las carpetas que conoce: sin
      // esto, sus avisos (`:::note`), sus enlaces de ancla y su apoyo a RTL se
      // saltan el markdown y las notas salen como un párrafo suelto.
      markdown: { processedDirs: ["./docs"] },
      customCss: ["./src/styles/starlight.css"],
      components: {
        Head: "./src/components/Head.astro",
        Header: "./src/components/Header.astro",
        Sidebar: "./src/components/Sidebar.astro",
        MarkdownContent: "./src/components/MarkdownContent.astro",
        Search: "./src/components/Search.astro"
      },
      routeMiddleware: "./src/middleware-rutas.ts",
      sidebar: sidebar(),
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/jaminsmoke/codarch"
        }
      ],
      pagefind: true,
      prerender: true
    }),
    // Starlight monta sus avisos y sus anclas después de leer el markdown, así
    // que `rehypeIdioma` se engancha al cerrar la configuración —con la lista de
    // plugins de Starlight ya puesta— para encontrarlos montados.
    {
      name: "codarch-idioma",
      hooks: {
        "astro:config:done": ({ config }) => {
          config.markdown.processor.options.rehypePlugins.push([
            rehypeIdioma,
            { docsRoot }
          ]);
        }
      }
    }
  ],
  vite: {
    plugins: [tailwindcss(), rutasDocs(root), faviconDev(root)],
    server: {
      fs: {
        // El markdown, las imágenes y los paquetes del monorepo viven fuera
        // de `apps/site`.
        allow: [root, path.resolve(root, "..", "..")]
      }
    }
  },
  server: {
    port: 5175
  }
});
