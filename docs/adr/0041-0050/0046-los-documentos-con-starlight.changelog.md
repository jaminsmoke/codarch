# Changelog — ADR 0046

Lo hecho, por orden. La hoja de ruta y lo abierto viven en el [ADR](0046-los-documentos-con-starlight.md).

## 2026-10-23

- Se acepta Astro + Starlight para la documentación: HTML estático por documento, Pagefind,
  sitemap y frontmatter validado.
- `docs/` sigue siendo la fuente; el sitio la lee con un loader `glob` y ids `docs/...`. Se probó el
  loader fuera del repo antes de decidir.
- La portada y la guía quedan como páginas propias; la guía pasará a entradas estructuradas.
- Base de datos, PHP y XML se descartan como fuente. SQLite sigue siendo un índice derivado.
