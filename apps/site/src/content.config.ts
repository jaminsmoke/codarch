import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";
import { ZONAS, idDocumento } from "./lib/zonas.mjs";

/**
 * Los documentos siguen viviendo en `docs/` (ADR 0046).
 *
 * Hay dos zonas (ADR 0081): `docs/usar/` sale en `/docs/...` y
 * `docs/desarrollo/` en `/desarrollo/...` (el id es la ruta, ver `zonas.mjs`);
 * la carpeta `desarrollo/guideline` queda fuera porque la guía tiene su
 * propia página.
 * El esquema obliga a que cada documento declare lo que el sitio necesita.
 */

const metadata = z.object({
  section: z.enum(ZONAS),
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
      // Starlight le dé la ruta `/en/...` y su fallback al español.
      pattern: [
        "**/*.md",
        "!desarrollo/guideline/**",
        "!en/desarrollo/guideline/**"
      ],
      generateId: ({ entry }) => idDocumento(entry)
    }),
    schema: docsSchema({ extend: metadata })
  }),
  guia: defineCollection({
    loader: glob({ base: "./docs/desarrollo/guideline/entradas", pattern: "**/*.md" }),
    schema: entradaGuia
  }),
  guiaEn: defineCollection({
    loader: glob({ base: "./docs/en/desarrollo/guideline/entradas", pattern: "**/*.md" }),
    schema: entradaGuia
  }),
  /** Las cadenas de la interfaz: una entrada por idioma (Starlight). */
  i18n: defineCollection({
    loader: i18nLoader(),
    schema: i18nSchema()
  })
};
