import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

/**
 * Los documentos siguen viviendo en `docs/` (ADR 0046).
 *
 * El loader les da un id `docs/...`, así que su ruta es `/docs/...`; la
 * carpeta `guideline` queda fuera porque la guía tiene su propia página.
 * El esquema obliga a que cada documento declare lo que el sitio necesita.
 */

const metadata = z.object({
  section: z.enum(["producto", "adr"]),
  status: z.string().optional(),
  date: z.string().optional(),
  changelog: z.boolean().default(false),
  adr: z.string().optional(),
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
      base: "../../docs",
      pattern: ["**/*.md", "!guideline/**"],
      generateId: ({ entry }) => `docs/${entry.replace(/\.md$/, "")}`
    }),
    schema: docsSchema({ extend: metadata })
  }),
  guia: defineCollection({
    loader: glob({ base: "../../docs/guideline/entradas", pattern: "**/*.md" }),
    schema: entradaGuia
  })
};
