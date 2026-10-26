import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";

/**
 * Los documentos siguen viviendo en `docs/` (ADR 0046).
 *
 * El loader les da un id `docs/...`, así que su ruta es `/docs/...`; la
 * carpeta `guideline` queda fuera porque la guía tiene su propia página.
 * El esquema obliga a que cada documento declare lo que el sitio necesita.
 */

const metadata = z.object({
  section: z.enum(["producto", "construir", "adr"]),
  status: z.string().optional(),
  date: z.string().optional(),
  tags: z.array(z.string()).default([])
});

/** Una entrada de la guía: una idea, con su fecha, su categoría y su veredicto. */
const entradaGuia = z.object({
  title: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum([
    "feature",
    "fix",
    "optimized",
    "refactor",
    "docs",
    "chore",
    "security",
    "removed"
  ]),
  verdict: z.enum(["idea", "fase", "adr", "arreglo", "esperar"])
});

export const collections = {
  docs: defineCollection({
    loader: glob({
      base: "./docs",
      // El inglés vive en `docs/en/` y su id lleva el locale delante para que
      // Starlight le dé la ruta `/en/docs/...` y su fallback al español.
      pattern: ["**/*.md", "!guideline/**", "!en/guideline/**"],
      generateId: ({ entry }) => {
        const limpio = entry.replace(/\.md$/, "");
        return limpio.startsWith("en/")
          ? `en/docs/${limpio.slice(3)}`
          : `docs/${limpio}`;
      }
    }),
    schema: docsSchema({ extend: metadata })
  }),
  guia: defineCollection({
    loader: glob({ base: "./docs/guideline/entradas", pattern: "**/*.md" }),
    schema: entradaGuia
  }),
  guiaEn: defineCollection({
    loader: glob({ base: "./docs/en/guideline/entradas", pattern: "**/*.md" }),
    schema: entradaGuia
  }),
  /** Las cadenas de la interfaz: una entrada por idioma (Starlight). */
  i18n: defineCollection({
    loader: i18nLoader(),
    schema: i18nSchema()
  })
};
