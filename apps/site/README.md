# La web del proyecto CodArch

La puerta de CodArch, la guía y los documentos.

## Available scripts

| Script | Description |
|--------|-------------|
| `npm run site:dev` | Levanta el servidor de desarrollo en el puerto 5175 |
| `npm run site:build` | Genera el build estático en `apps/site/dist` |
| `npm run docs` | Abre la guía en el navegador |

## Estructura actual

La web se organiza en una portada y dos zonas:

- **Portada** (`/`): La entrada principal al proyecto, construida con islas de React usando `motion` para animaciones. Conserva la cabecera, la búsqueda y el tema de Starlight.

- **Documentación** (`/docs/`): solo el producto, para quien instala y usa CodArch. Sale de `docs/index.md` y `docs/usar/**` (`section: usar`).

- **Desarrollo** (`/desarrollo/`): cómo se construye. Roadmap, modelo, diseño del mapa, migración y ADR salen de `docs/desarrollo/**` (`section: desarrollo`); la **guía** (`/desarrollo/guia/`) es el feed de ideas, normas y futuro, y cada idea vive en `docs/desarrollo/guideline/entradas/` con sus campos `date`, `category` y `verdict`.

Cada zona tiene su sidebar y su filtro de búsqueda (ADR 0081). El frontmatter es obligatorio (`title`, `description`, `section`, `sidebar`) y el esquema vive en `src/content.config.ts`; si no cuadra, el build falla.

## Cómo funciona técnicamente

- **Astro + Starlight** para los documentos: cada uno sale como HTML estático en su ruta `/docs/...` o `/desarrollo/...`, con Pagefind, sitemap y metadatos validados (ADR 0046).

- **`docs/` sigue siendo la verdad**: un loader `glob` lee `./docs` y asigna ids según la zona (`src/lib/zonas.mjs`): `usar/...` → `/docs/usar/...` y `desarrollo/...` → `/desarrollo/...`. No hay texto copiado. Las direcciones antiguas redirigen (`src/lib/redirecciones.mjs`).

- **Frontmatter obligatorio**: `title`, `description`, `section`, `sidebar`. En los ADR, también `status` y `date`. El esquema está en `src/content.config.ts`; si falta, el build falla.

- **Sidebar generada del frontmatter**: (`src/sidebar.mjs`). No hay una lista de documentos en el código. `sidebarUsar()` y `sidebarDesarrollo()`; `src/components/Sidebar.astro` pinta solo la de la zona. Los ADR se agrupan por su carpeta de diez.

- **Enlaces reescritos en el build**: (`src/lib/rehype-doc-links.mjs`). `../desarrollo/model.md` → `/codarch/desarrollo/model/`. Lo que no es un documento (imágenes, HTML) sale al repo.

- **Portada y guía en React**: Montadas como islas desde Astro. `ReactSite.tsx` para la portada y `GuiaApp.tsx` para la guía. La guía es una sola isla: la cabecera y la línea del tiempo se montan una vez y solo cambia el contenido de abajo al pasar de día.

- **Cabecera de documentos**: Lleva **Inicio**, **Documentación** y **Desarrollo** (la guía está dentro de Desarrollo) (`src/components/Header.astro`). Conserva la búsqueda, el tema y el GitHub de Starlight.

- **Idiomas**: El idioma por defecto es el español. Las cadenas de la UI viven en `src/content/i18n/<idioma>.json`, la colección `i18n` de Starlight: los documentos las leen con `Astro.locals.t` y las islas de React con `t(lang, clave)` desde `src/lib/i18n.ts`. Los documentos se traducen por carpeta (`docs/<idioma>/`) con fallback de Starlight. Añadir un idioma es añadir su JSON, copiar la carpeta y sumarlo a `locales`.

- **Publicación**: Se publica en GitHub Pages con el workflow `web.yml`, en la ruta `/codarch/`.

## Lo que no está aquí (todavía)

- La app del mapa: es el producto y tiene su propia app independiente.
- Dominio propio: cuando haga falta, y no antes.

## Referencias

- [Roadmap de fases](docs/desarrollo/roadmap.md): índice de fases M0-M33.
- [Índice de ADRs](docs/desarrollo/adr/index.md): todas las decisiones con su fecha y estado.
- [Guía](docs/desarrollo/guideline/normas.md): feed de ideas y hechos, en `/desarrollo/guia/`.
