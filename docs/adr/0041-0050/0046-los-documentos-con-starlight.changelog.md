---
title: Changelog — ADR 0046
description: Lo hecho del ADR 0046, por orden. La hoja de ruta y lo abierto viven en el ADR.
section: adr
changelog: true
adr: adr/0041-0050/0046-los-documentos-con-starlight
sidebar:
  label: Changelog
  order: 46.5
---

Lo hecho, por orden. La hoja de ruta y lo abierto viven en el [ADR](0046-los-documentos-con-starlight.md).

## 2026-10-23

- Se acepta Astro + Starlight para la documentación: HTML estático por documento, Pagefind,
  sitemap y frontmatter validado.
- `docs/` sigue siendo la fuente; el sitio la lee con un loader `glob` y ids `docs/...`. Se probó el
  loader fuera del repo antes de decidir.
- La portada y la guía quedan como páginas propias; la guía pasará a entradas estructuradas.
- Base de datos, PHP y XML se descartan como fuente. SQLite sigue siendo un índice derivado.

### Lo que ya está en `main` de esta rama

- `apps/site` pasa a Astro 7 con Starlight y React para la portada y la guía.
- Los 99 documentos tienen frontmatter y ya no llevan el `#` inicial; el cuerpo no se toca.
- El esquema `docsSchema({ extend })` exige `section` y valida `status`, `date`, `changelog` y `adr`.
- La sidebar sale de `src/sidebar.mjs`: producto primero, ADR por carpeta de diez.
- `rehype-doc-links` reescribe los enlaces `.md` a `/codarch/docs/...`, conserva el ancla, manda al
  repo lo que no es documento y lleva los enlaces a la guía a `/codarch/guia/`.
- Mermaid se pinta en cliente con un `Head.astro` propio; la guía y la portada siguen siendo islas
  de React y los enlaces a `/docs/` recargan la página de Starlight.
- `npm run site:build` genera 103 HTML, Pagefind indexa 103 y el sitemap sale completo.
- Los tests cubren la sidebar, la reescritura de enlaces y los enlaces internos de la guía.
- Se retiraron la SPA de docs (`App`, `main`, `Docs`, `Documento`, `MenuDocs`, `lib/docs`), el
  `vite.config` antiguo y la migración de un solo uso.
- Astro exige Node `>=22.23.4`: `engines` lo declara y el CI y `web.yml` construyen con Node 24.
- La web se publica en GitHub Pages: 103 páginas, Pagefind, sitemap y Mermaid comprobados en
  `jaminsmoke.github.io/codarch`.

### La guía estructurada

- `contenido.md` se partió en `entradilla.md`, `normas.md` y 20 ficheros en
  `docs/guideline/entradas/` (`AAAA-MM-DD-NN-titulo.md`), cada uno con `title`, `date`, `category`
  y `verdict`.
- La colección `guia` valida ese frontmatter; `lib/guia-servidor.ts` ordena, agrupa, resume y
  convierte el cuerpo a HTML. La página ya no parte ningún markdown en el navegador.
- Se añadió el veredicto `adr`, que la guía ya usaba en «El alcance del análisis»; esa entrada
  pasa de `config · ADR` a `feature · adr`.
- La entradilla y las normas explican el nuevo formato: añadir una idea es añadir un fichero.
- La portada y la guía dejan el router: sus enlaces son `<a>` normales y cada página carga su
  propia isla. `react-router-dom` y `lib/enlaces.ts` salen del sitio.
