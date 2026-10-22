# Hoja de ruta — ADR 0022 «La migración, donde ya faltaba»

**Decisión:** [el ADR](0022-la-migracion-donde-faltaba.md) · **Estado:** aceptado ✅ · **Fecha:** 2026-10-21

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓;
el [roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline/index.html) guarda las
ideas que aún no son fase ✓.

## Fases de esta línea

### M8 — La migración, donde ya faltaba

**Estado:** ✅ cerrado. La lente de migración se ve en el PR y el agente puede preguntar por ella.
Decisión en [ADR 0022](0022-la-migracion-donde-faltaba.md).

- [x] El `report.json` tiene sección de migración: estado por lenguaje y categoría, deuda, cruces
  FFI y los ficheros cuya deuda ha cambiado.
- [x] El MCP gana `get_migration_plan`: el plan de migración, los ficheros con más deuda y cómo ha
  cambiado respecto a la base.
- [x] El comentario del PR muestra la deuda y los cruces FFI, con el detalle de lo que ha cambiado.
- [x] La vista de PR de la web muestra lo mismo.
- [x] `schemaVersion` del reporte a `1.1` y **obligatorio**: los lectores reconstruyen los reportes
  de versiones anteriores a la actual, y lo que no se pudo medir se marca con `null` en vez de
  inventar ceros. Un solo lector del reporte, en `@codarch/metrics`, para la web, el escritorio y el
  MCP.

## Dónde se aplica

- M9 (Lente de dominio, por pasos): [la hoja de su decisión](0023-lente-de-dominio-por-pasos.roadmap.md)
