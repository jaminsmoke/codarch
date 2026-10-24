# La web del proyecto CodArch

La puerta de CodArch, la guía y los documentos.

## Available scripts

| Script | Description |
|--------|-------------|
| `npm run site:dev` | Levanta el servidor de desarrollo en el puerto 5175 |
| `npm run site:build` | Genera el build estático en `apps/site/dist` |
| `npm run docs` | Abre la guía en el navegador |

## Estructura actual

La web se organiza en tres áreas principales:

- **Portada** (`/`): La entrada principal al proyecto, construida con islas de React usando `motion` para animaciones. Conserva la cabecera, la búsqueda y el tema de Starlight.

- **Guía** (`/guia/`): Contiene el feed de decisiones, normas y futuro, estructurado cronológicamente. Cada idea vive en un fichero en `apps/site/docs/guideline/entradas/` con sus campos `date`, `category` y `verdict`. La línea del tiempo y la cabecera se montan una vez; solo cambia el contenido diario.

- **Documentos** (`/docs/`): Cada documento genera una página HTML estática con su propio menú, índice, vecinos y búsqueda Mermaid. El frontmatter es obligatorio (`title`, `description`, `section`, `sidebar`) y el esquema vive en `src/content.config.ts`. Si el frontmatter no cuadra, el build falla. La sidebar se genera automáticamente del frontmatter, sin listas codificadas en el código.

## Cómo funciona técnicamente

- **Astro + Starlight** para los documentos: cada uno sale como HTML estático en su ruta `/docs/...`, con Pagefind, sitemap y metadatos validados (ADR 0046).

- **`docs/` sigue siendo la verdad**: un loader `glob` lee `./docs` y asigna ids `docs/...` → `/docs/...`. No hay texto copiado.

- **Frontmatter obligatorio**: `title`, `description`, `section`, `sidebar`. En los ADR, también `status` y `date`. El esquema está en `src/content.config.ts`; si falta, el build falla.

- **Sidebar generada del frontmatter**: (`src/sidebar.mjs`). No hay una lista de documentos en el código. Los ADR se agrupan por su carpeta de diez.

- **Enlaces reescritos en el build**: (`src/lib/rehype-doc-links.mjs`). `../model.md` → `/codarch/docs/model/`. Lo que no es un documento (imágenes, HTML) sale al repo.

- **Portada y guía en React**: Montadas como islas desde Astro. `ReactSite.tsx` para la portada y `GuiaApp.tsx` para la guía. La guía es una sola isla: la cabecera y la línea del tiempo se montan una vez y solo cambia el contenido de abajo al pasar de día.

- **Cabecera de documentos**: Lleva **Inicio**, **Guía** y **Documentos** (`src/components/Header.astro`). Conserva la búsqueda, el tema y el GitHub de Starlight.

- **Idiomas**: El idioma por defecto es el español. Las cadenas de la UI viven en `src/lib/i18n.ts` y los componentes reciben `lang`. Los documentos se traducen por carpeta (`docs/<idioma>/`) con fallback de Starlight. Añadir un idioma es copiar la carpeta, traducirla y añadirlo a `locales` e `i18n`.

- **Publicación**: Se publica en GitHub Pages con el workflow `web.yml`, en la ruta `/codarch/`.

## Lo que no está aquí (todavía)

- La app del mapa: es el producto y tiene su propia app independiente.
- Dominio propio: cuando haga falta, y no antes.

## Referencias

- [Roadmap de fases](docs/adr/roadmap.md): índice de fases M0-M33.
- [Índice de ADRs](docs/adr/index.md): todas las decisiones con su fecha y estado.
- [Guía](/guia/): feed de ideas y hechos.