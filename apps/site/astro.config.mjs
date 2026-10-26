import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { unified } from "@astrojs/markdown-remark";
import { defineConfig } from "astro/config";
import { redirecciones } from "./src/lib/redirecciones.mjs";
import { rehypeDocLinks } from "./src/lib/rehype-doc-links.mjs";
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

export default defineConfig({
  site: "https://jaminsmoke.github.io",
  base: "/codarch",
  // Las direcciones de antes de las dos zonas siguen funcionando (ADR 0081).
  redirects: redirecciones(path.join(root, "docs"), "/codarch"),
  markdown: {
    processor: unified({
      rehypePlugins: [
        [
          rehypeDocLinks,
          { docsRoot: path.join(root, "docs"), base: "/codarch" }
        ]
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
    })
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
