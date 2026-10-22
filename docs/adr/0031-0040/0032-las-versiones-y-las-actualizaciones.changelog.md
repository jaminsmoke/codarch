# Changelog — ADR 0032 «Las versiones y las actualizaciones»

**Decisión:** [el ADR](0032-las-versiones-y-las-actualizaciones.md) · **Estado:** aceptada · **Fecha:** 2026-10-22

Este changelog guarda lo que se hizo para esta decisión. La hoja de ruta vive en el [ADR](0032-las-versiones-y-las-actualizaciones.md#hoja-de-ruta).

## Lo que se hizo

### M21 — Las versiones y las actualizaciones

**Estado:** cerrada. La comprobación, la sección de los ajustes, la alpha y el primer release público del escritorio.

- [x] **M21.1** `@codarch/versions`: comparar versiones y preguntar por una fuente (npm y
  GitHub), con el `fetch` inyectado para que los tests no toquen la red.
- [x] **M21.2** Una versión para el producto: la de la raíz, propagada con
  `npm run version -- <x>` y comprobada por el CI.
- [x] **M21.3** `codarch version` y `codarch version --check` (npm): dice la versión y si hay
  algo nuevo, con el comando para traerlo. No instala nada.
- [x] **M21.4** La sección **Actualizaciones** en los ajustes de las dos apps: qué versión se
  usa, si hay algo más nuevo, cómo se trae y un botón **Comprobar ahora**. Nada se descarga
  sin que lo pidas.
- [x] **M21.5** El escritorio: comprobar las releases y abrir la release para descargar el
  instalador. El feed es configurable (`CODARCH_UPDATE_REPO`) y apunta a este mismo repo,
  que tiene que ser **público** para que quien lo instale pueda comprobarlo (ADR 0033).
- [x] **M21.6** **Alpha**: la versión lleva prerelease (`0.3.0-alpha.1`), en npm va a la
  etiqueta `next` (`npm run publish:cli` lo decide), el README lo dice arriba y el
  escritorio se etiqueta igual.

## Decisiones relacionadas

- [ADR 0031 «Los documentos: cada decisión con su hoja de ruta»](0031-los-documentos.md) — M18, M19,
  M20
- [ADR 0029 «Los addons: conocimiento declarativo»](../0021-0030/0029-los-addons.md) — M16
