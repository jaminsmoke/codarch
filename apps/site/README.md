# La web del proyecto

La puerta de CodArch ✅, la guía ✅ ✅ y los documentos ✅ ✅
([ADR 0034](../../docs/adr/0031-0040/0034-la-web-del-proyecto.md) ✅ ·
[ADR 0046](../../docs/adr/0041-0050/0046-los-documentos-con-starlight.md) ✅).

```bash
npm run site:dev     # en el 5175
npm run site:build   # sale en apps/site/dist
```

## Qué hay ahora

- **`/`** — la portada ✅ ✅.
- **`/guia/`** — el último día de la guía ✅ ✅, con su línea del tiempo y su changelog ✅ ✅.
- **`/guia/AAAA-MM-DD/`** — un día ✅ ✅; **`/guia/futuro/`** — lo que espera ✅ ✅ y
  **`/guia/normas/`** — cómo se escribe ✅ ✅.
- **`/docs/`** — los **documentos** ✅ ✅: el producto ✅ (roadmap ✅, modelo ✅, reglas ✅, MCP ✅,
  migración ✅), el diseño del mapa ✅ y todas las **decisiones** ✅ en sus carpetas de diez ✅ ✅, cada
  una con su hoja de ruta dentro ✅ ✅. El registro de lo hecho vive en la guía ✅ ✅.
- **`/docs/<ruta>/`** — un documento ✅ ✅: su menú ✅, su índice ✅, los vecinos ✅ ✅, la búsqueda ✅
  y los diagramas **Mermaid** ✅ ✅.

## Cómo funciona

- **Astro + Starlight** ✅ ✅ para los documentos ✅ ✅: cada uno sale como **HTML estático** en su ruta
  ✅ ✅, con **Pagefind** ✅ ✅, **sitemap** ✅ ✅ y metadatos ✅ ✅ ([ADR 0046](../../docs/adr/0041-0050/0046-los-documentos-con-starlight.md) ✅).
- **`docs/` sigue siendo la verdad** ✅ ✅: un loader `glob` ✅ ✅ lee `../../docs` ✅ ✅ y le da ids
  `docs/...` ✅ ✅ (`docs/model.md` → `/docs/model/` ✅ ✅ ✅). No hay texto copiado ✅ ✅.
- **El frontmatter es obligatorio** ✅ ✅ (`title` ✅, `description` ✅, `section` ✅, `sidebar` ✅;
  en los ADR, `status` ✅ y `date` ✅ ✅). El esquema está en `src/content.config.ts` ✅ ✅: si falta o
  no cuadra ✅, **el build falla** ✅ ✅.
- **La sidebar se genera del frontmatter** ✅ ✅ (`src/sidebar.mjs` ✅ ✅): no hay una lista de
  documentos en el código ✅ ✅. El producto va primero ✅ ✅ y los ADR se agrupan por su carpeta de
  diez ✅ ✅.
- **Los enlaces** entre documentos ✅ ✅ se reescriben en el build ✅ ✅
  (`src/lib/rehype-doc-links.mjs` ✅ ✅): `../model.md` → `/codarch/docs/model/` ✅ ✅. Lo que no es un
  documento ✅ (una imagen ✅, un HTML ✅) sale al repo ✅ ✅.
- **La portada y la guía** siguen en React ✅ ✅, montadas como islas desde Astro ✅ ✅
  (`ReactSite.tsx` ✅ para la portada y `GuiaSite.tsx` ✅ para la guía). **motion** ✅ ✅ anima ✅ ✅ y
  la guía conserva su línea del tiempo ✅ ✅. Cada página es su propia isla y sus enlaces son `<a>`
  normales ✅ ✅.
- La **guía** es estructurada ✅ ✅: cada idea es un fichero en `docs/guideline/entradas/` con
  `date`, `category` y `verdict` ✅ ✅; `src/lib/guia-carga.ts` la carga, `guia-servidor.ts` la ordena
  y la agrupa ✅ ✅ y `Guia.tsx` pinta un día ✅ ✅. Añadir una idea es añadir un fichero ✅ ✅.
- Se publica en **GitHub Pages** ✅ ✅ con el workflow `web.yml` ✅ ✅, en `/codarch/` ✅ ✅ ✅.

## Lo que no está aquí (todavía ✅ ✅)

- La **app del mapa** ✅ ✅: es el producto ✅ ✅ y tiene su propia app ✅ ✅.
- El **dominio propio** ✅ ✅: cuando haga falta ✅ ✅, y no antes ✅ ✅.
