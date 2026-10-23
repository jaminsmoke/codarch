import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { unified } from "@astrojs/markdown-remark";
import { defineConfig } from "astro/config";
import { rehypeDocLinks } from "./src/lib/rehype-doc-links.mjs";
import { sidebar } from "./src/sidebar.mjs";
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
        root: { label: "Español", lang: "es" }
      },
      customCss: ["./src/styles/starlight.css"],
      components: {
        Head: "./src/components/Head.astro",
        Header: "./src/components/Header.astro"
      },
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
    plugins: [tailwindcss(), rutasDocs(root)],
    server: {
      fs: {
        // El markdown y la imagen de portada viven fuera de `apps/site`.
        allow: [root]
      }
    }
  },
  server: {
    port: 5175
  }
});
