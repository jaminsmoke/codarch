# Changelog — ADR 0033 «Abrir el repo: lo que hay que tener antes»

**Decisión:** [el ADR](0033-abrir-el-repo.md) · **Estado:** aceptada · **Fecha:** 2026-10-22

Este changelog guarda lo que se hizo para esta decisión. La hoja de ruta vive en el [ADR](0033-abrir-el-repo.md#hoja-de-ruta).

## Lo que se hizo

### M22 — El repo, con sus papeles

**Estado:** cerrada. El repo es público: las medidas, la revisión final, el ensayo y la puerta.

- [x] La **auditoría**: licencia (MIT), secretos (ninguno en el árbol ni en los 124
  commits), licencias de las dependencias (todas permisivas: MIT e ISC) y datos
  personales (uno solo).
- [x] `SECURITY.md`, `CONTRIBUTING.md`, `NOTICE.md` y `TRADEMARK.md`.
- [x] La nota de **privacidad** en el README: la app no recoge nada y lo único que sale a la
  red es la comprobación de actualizaciones.
- [x] La **marca** avisada: la licencia concede el código, no el nombre «CodArch» ni el
  logotipo.
- [x] La **revisión final**: la rama `chore/dogfood-architecture-rules` era obsoleta (main ya
  tenía las actions en v7 y las mismas reglas) y se borró; el remoto se queda con `main`
  solo. Los enlaces del repo público de la acción apuntan aquí: funcionan en cuanto el repo
  sea público.
- [x] El repo, **preparado para que lo miren**: CI que corre lint, tipos, tests y la
  acción en cada PR (`ci.yml`), plantillas de issues (`bug` e `idea`), descripción
  y temas del repo, y el feed de actualizaciones del escritorio apuntando aquí.
- [x] El **ensayo**: abrir el repo en público y mirar que no sale nada que no deba.
- [x] La **puerta**: si el ensayo sale bien, se deja público y se anuncia (el README, la
  release, el paquete de npm).

## Decisiones relacionadas

- [ADR 0001 «Clean-room, con `cc.json` como frontera»](../0001-0010/0001-clean-room-con-ccjson.md) —
  el repositorio público es donde se lee
- [ADR 0032 «Las versiones y las actualizaciones»](0032-las-versiones-y-las-actualizaciones.md) —
  M21: el feed del escritorio necesita un repo público
