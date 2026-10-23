---
title: ADR 0046 — Los documentos se publican con Starlight
description: "La web deja de ser una SPA y pasa a Astro con Starlight: HTML por documento, búsqueda y frontmatter validado."
section: adr
status: aceptado
date: "2026-10-23"
sidebar:
  label: Los documentos se publican con Starlight
  order: 46
---

**Estado:** aceptado · **Fecha:** 2026-10-23

## Contexto

La web del proyecto ya publica los documentos, pero lo hace con una app React/Vite propia:

- `docs/**/*.md` se importa entero con `import.meta.glob(..., { eager: true })`;
- el título y la descripción se adivinan del primer `#` y del primer párrafo;
- el orden del producto está en una lista `PRODUCTO` dentro del código;
- los ADR, sus changelogs y la guía dependen de convenciones de nombre;
- la web es una SPA: hay un `index.html` y el router pinta el documento. No hay un HTML por
  documento, SEO real ni búsqueda;
- añadir una sección puede obligar a tocar el código de la web.

Hay 99 documentos. La documentación va a crecer y tiene que seguir siendo revisable en PR, con
historial y sin un backend que mantener. La pregunta no es «Markdown sí o no»: Markdown es el
mejor formato para escribir prosa. Lo que falta es un **modelo de contenido** y un build que lo
valide.

## Decisión

### 1. Astro + Starlight para la documentación

La web de documentos pasa a Astro con Starlight. Cada documento se genera como **HTML estático**
en su ruta, con:

- sidebar generada desde el contenido;
- búsqueda **Pagefind** en el build;
- índice de la página y navegación anterior/siguiente;
- sitemap y metadatos por documento;
- contenido Markdown/MDX con frontmatter validado.

La portada y la guía pueden seguir siendo páginas propias (Astro, o un componente React montado
como isla) para conservar la identidad visual. No se obliga a que todo el sitio sea Starlight.

### 2. `docs/` sigue siendo la fuente de verdad

No se copia el contenido a `apps/site` ni se mantiene un espejo a mano. El proyecto define una
colección `docs` con un loader `glob` que lee `./docs` y genera ids con el prefijo `docs/`:

```ts
docs: defineCollection({
  loader: glob({
    base: "./docs",
    pattern: "**/*.md",
    generateId: ({ entry }) => `docs/${entry.replace(/\.md$/, "")}`
  }),
  schema: docsSchema({ extend: ... })
})
```

Así una carpeta de `docs/` sigue siendo una ruta del sitio (`docs/model.md` → `/docs/model/`) y
los ADR/changelogs se revisan donde siempre. Si una versión futura de Starlight no permite leer
fuera de `src/content/docs`, se generará un espejo **en el build**, nunca a mano.

La guía no entra en esa colección: tiene la suya, sobre `docs/guideline/entradas/` (apartado 5).

### 3. El frontmatter es obligatorio y validado

Cada documento declara lo que el sitio necesita:

```yaml
---
title: El modelo
description: Qué es un cc.json y qué garantiza.
section: producto # producto | adr | guia
order: 20
status: aceptado # en los ADR
date: "2026-10-23"
adr: adr/0041-0050/0045-... # en un changelog
changelog: true # en un changelog
tags: [modelo, checksum]
---
```

El esquema extiende `docsSchema()` con Zod. Si falta `title`, el `section` no es válido o un
changelog no apunta a su ADR, **el build falla**. No hay metadatos adivinados.

La primera línea `#` del documento se elimina del cuerpo: Starlight pinta el título con el
frontmatter. La descripción no se calcula del primer párrafo.

### 4. Las URLs actuales se conservan

- `/docs/<ruta>/` para los documentos.
- `/guia/` para la guía.
- `/` para la portada.

Las rutas no cambian, así que no hacen falta redirecciones. Los enlaces internos del Markdown se
validan en el build; una ruta rota no se publica.

### 5. La guía deja de ser un bloque parseado a mano

Cada idea es un fichero en `docs/guideline/entradas/`:

```
entradas/2026-10-21-01-el-registro-publico-de-plugins.md
```

```yaml
---
title: El registro público de plugins
date: "2026-10-21"
category: feature
verdict: idea
---
```

Las normas son `normas.md`; las entradas viven en `entradas/`. La página `/guia/` agrupa las
entradas por día y categoría, como antes, pero sin partir un único Markdown con expresiones
regulares. Añadir una idea es añadir un fichero, no tocar el parser.

### 6. Búsqueda, SEO y publicación

Pagefind genera el índice de búsqueda en el build y Starlight genera el sitemap. El workflow
`web.yml` construye y publica en GitHub Pages cuando cambia `apps/site/docs/` o `apps/site/`. Añadir un
documento con su frontmatter es suficiente: aparece en su ruta, en la sidebar y en la búsqueda.

No se usa una base de datos como fuente: GitHub Pages es estático y la documentación tiene que
poder revisarse en un PR. SQLite/FTS5 (M24) sigue siendo un **índice derivado** para CLI/MCP, no
la fuente del sitio.

### 7. La cabecera del sitio, también en los documentos

Starlight conserva su cabecera (búsqueda, tema y GitHub) y se le añaden los enlaces **Inicio**,
**Guía** y **Documentos** con un override de `Header`. Los documentos no pierden la navegación del
resto del sitio; en móvil, el título lleva a Inicio y la barra lateral a la guía.

### 8. Idiomas, preparados

El idioma por defecto es el español. Starlight resuelve la traducción de los documentos con su
propio `locales` y Astro la de la UI con `i18n`. Añadir un idioma es:

1. Crearlo en `locales` (Starlight) y en `i18n` (Astro).
2. Crear `docs/<idioma>/` con el contenido traducido (o dejar que caiga al español).
3. Añadir sus cadenas a `src/lib/i18n.ts`.

Los componentes React reciben `lang` y usan `t(lang, clave)`; las cadenas que falten caen al
español. La portada y la guía no se traducen solas: se añaden cuando haya revisión.

## Consecuencias

- La documentación gana HTML por página, SEO, búsqueda, sitemap y navegación automática.
- El contenido sigue en `docs/`, versionado y revisable; no se muda a una base de datos ni a PHP.
- Hay una migración única: añadir frontmatter a 99 documentos y quitar su `#` inicial.
- Starlight trae su propio layout; la portada y la guía se adaptan para conservar la identidad.
- El bundle deja de cargar todo el markdown de golpe: cada página lleva su contenido.
- El CI valida el esquema, los enlaces y el build; un documento mal formado no se publica.

## Alternativas descartadas

- **Base de datos como fuente:** GitHub Pages no ejecuta consultas; haría falta un backend, auth y
  perderíamos el diff/PR de la documentación.
- **PHP:** necesita un servidor; no encaja con Pages ni con el repo.
- **XML:** sirve para datos, no para prosa; el diff y la escritura son peores que Markdown.
- **CMS externo:** solo si se quiere editar sin tocar git; añade dependencia, coste y secretos.
- **Docusaurus:** también válido, pero más pesado y con más trabajo para conservar el diseño actual.
- **Capa de contenido sobre la web React/Vite actual:** menos migración, pero tendríamos que
  construir prerender, búsqueda, sitemap y SEO; más mantenimiento a largo plazo.

## Hoja de ruta

### M29 — Los documentos con Starlight

- [x] Crear `apps/site` con Astro + Starlight y el loader que lee `docs/`.
- [x] Definir el esquema de frontmatter y migrar los 99 documentos (título, descripción, sección,
  orden, estado, fecha, ADR/changelog).
- [x] Conservar `/docs/`, `/guia/` y `/` y validar los enlaces internos (las rutas no cambian, así
  que no hacen falta redirecciones).
- [x] Migrar la guía a entradas estructuradas; la portada ya está adaptada.
- [x] Activar Pagefind, sitemap y búsqueda; un documento nuevo entra solo en la sidebar.
- [x] Actualizar `web.yml`, `README` y `AGENTS.md`; retirar la app React/Vite de docs.
- [x] Validar el build y la publicación en GitHub Pages (`web.yml` construye y publica con Node 24).

M29 queda cerrada: los documentos y la guía se publican desde el markdown del repo.
