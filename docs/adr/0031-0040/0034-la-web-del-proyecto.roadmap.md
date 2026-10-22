# Hoja de ruta — ADR 0034 «La web del proyecto»

**Decisión:** [el ADR](0034-la-web-del-proyecto.md) · **Estado:** aceptada · **Fecha:** 2026-10-22

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓; el
[roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline/contenido.md) guarda
las ideas que aún no son fase ✓.

## Fases de esta línea

### M23 — La web del proyecto

**Estado:** en curso. La web está publicada ✅ ✅ con la portada ✅ ✅, la guía ✅ ✅ y los documentos ✅
✅; faltan el dominio propio ✅ ✅ y la búsqueda ✅ ✅ ✅.

- [x] **M23.1** `apps/site` ✓: React ✓ + Vite ✓ + `react-router` ✓ ✓, con los tokens de color de
  la app ✓ ✓ y sus tipografías ✓ ✓ ✅.
- [x] **M23.2** El **generador** ✓: el markdown del repo ✓ → páginas ✓ (un glob en el build ✓ ✓ +
  `marked` ✓ ✓) ✓ ✅. El texto no se copia a los componentes ✓ ✗ ✅.
- [x] **M23.3** La **landing** ✓: qué es ✓, cómo se ve ✓ (la captura ✓ ✓), cómo se instala ✓, el
  escritorio ✓, la acción ✓ y el MCP ✓ ✓.
- [x] **M23.4** Las **páginas de docs** ✓: una por documento ✓ ✅ —el producto ✓ ✅, el diseño del
  mapa ✓ ✅ y cada ADR con su hoja de ruta ✓ ✅—, con el **menú** ✓ ✅, el **índice de la página** ✓ ✅,
  los **vecinos** ✓ ✅ y los diagramas **Mermaid** ✓ ✅. Los enlaces entre documentos se quedan en el
  sitio ✓ ✅ y navegan sin recargar ✓ ✅; lo que no es un documento sale al repo ✓ ✅. Cada vista se
  carga con su ruta ✓ ✅ y la lista de documentos la pone el build ✓ ✅ (`virtual:docs-rutas` ✓).
- [x] **M23.5** **Publicar** ✓: el workflow de Pages ✓ ✓ ✅, el `homepage` del repo ✓ y el del
  paquete de npm ✓ ✓.

## Decisiones relacionadas

- [ADR 0031 «Los documentos: cada decisión con su hoja de ruta»](0031-los-documentos.md) — M18, M19,
  M20: la guía ✓ y su página ✓ ✅
- [ADR 0033 «Abrir el repo: lo que hay que tener antes»](0033-abrir-el-repo.md) — M22: el repo es
  público ✓ ✓

## Ideas abiertas

- [La guía: el registro público de plugins](../../guideline/contenido.md#el-registro-publico-de-plugins)
  🧪 — el registro necesita una **dirección estable** ✓ ✓: con la web ✓, el sitio puede ser el sitio
  del proyecto ✓ ✓ y el registro ✓ su índice ✓ ✅.
