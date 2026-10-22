# Hoja de ruta — ADR 0032 «Las versiones y las actualizaciones»

**Decisión:** [el ADR](0032-las-versiones-y-las-actualizaciones.md) · **Estado:** aceptada · **Fecha:** 2026-10-22

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓; el
[roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline/index.html) guarda
las ideas que aún no son fase ✓.

## Fases de esta línea

### M21 — Las versiones y las actualizaciones

**Estado:** en curso.

- [ ] **M21.1** `@codarch/versions` ✓: comparar versiones ✓ y preguntar por una fuente ✓ (npm ✓ y
  GitHub ✓) ✓, con el `fetch` inyectado ✓ para que los tests no toquen la red ✓.
- [ ] **M21.2** Una versión para el producto ✓: la de la raíz ✓, propagada con
  `npm run version:<x>` ✓ y comprobada por el CI ✓.
- [ ] **M21.3** `codarch version` ✓ y `codarch version --check` ✓ (npm ✓): dice la versión ✓ y si hay
  algo nuevo ✓, con el comando para traerlo ✓. No instala nada ✓.
- [ ] **M21.4** La sección **Actualizaciones** ✓ en los ajustes ✓ de las dos apps ✓: qué versión se
  usa ✓, si hay algo más nuevo ✓, cómo se trae ✓ y un botón **Comprobar ahora** ✓.
- [ ] **M21.5** El escritorio ✓: comprobar las releases ✓, descargar el instalador ✓ y abrirlo ✓.
  El feed es configurable ✓ y apunta al repo público ✓ cuando exista ✓.

## Decisiones relacionadas

- [ADR 0031 «Los documentos: cada decisión con su hoja de ruta»](0031-los-documentos.md) — M18, M19,
  M20
- [ADR 0029 «Los addons: conocimiento declarativo»](../0021-0030/0029-los-addons.md) — M16

## Ideas abiertas

- [La guía: el registro público de plugins](../../guideline/index.html#el-registro-publico-de-plugins)
  🧪 — publicar el escritorio para que **los terceros** 📦 ⚖️ ✅ puedan actualizarlo ✓.
