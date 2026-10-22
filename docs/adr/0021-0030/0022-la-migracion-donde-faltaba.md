# ADR 0022 — La migración, donde ya faltaba

**Estado:** aceptado ✅ · **Fecha:** 2026-10-21

## Contexto

La lente de migración es la feature de cabecera de la v1 (ADR 0016). El producto existe, en parte,
para que un equipo pueda ver cuánto le cuesta migrar su TypeScript a Rust y por qué.

Pero la lente solo se veía en el mapa. Ni el agente ni el pull request la tenían:

- El **MCP** tenía cinco herramientas (`get_architecture_map`, `find_hotspots`, `check_change_impact`,
  `list_violations`, `explain_module`) y ninguna sabía de migración. Un agente podía leer la
  arquitectura de un repo y su deuda de migración era invisible.
- El **`report.json`** no tenía sección de migración, así que ni el comentario del PR ni la vista de
  PR de la web mostraban la deuda.

El resultado era que la parte del producto que da nombre a la lente solo se podía ver abriendo el
mapa a mano.

## Decisión

1. **El reporte de diff gana una sección `migration`.** No es un añadido decorativo: compara la
   lente de la base con la del head y da el estado por lenguaje y por categoría, la deuda total, los
   cruces FFI, los ficheros cuya deuda ha crecido o se ha reducido y los que más deuda acumulan.
2. **El delta es `head - base`**, como en el resto del reporte. En la deuda, un delta negativo es
   bueno: se ha migrado algo.
3. **El MCP gana `get_migration_plan`.** Es de solo lectura, como las demás, y devuelve el estado
   de la migración, los ficheros con más deuda y, si hay reporte, cómo ha cambiado. Se puede acorar
   a una carpeta.
4. **El comentario del PR muestra la migración.** Una fila con la deuda y los cruces FFI, y el
   detalle de los ficheros cuya deuda ha cambiado. Es el sitio donde el equipo mira el PR.
5. **La vista de PR de la web lo muestra también**, con el mismo dato.

## Consecuencias

- El agente puede preguntar por la migración con los mismos números que ve el mapa.
- El `report.json` cambia de forma: `schemaVersion` sigue siendo `1.0` porque es un añadido
  opcional (un reporte sin la lente viene con la sección vacía). Los consumidores que leen el
  reporte siguen funcionando.
- La deuda de migración aparece en el comentario del PR: es información que antes solo estaba en el
  mapa, y puede ser ruido en PRs que no tocan la migración. Por eso el detalle solo sale si la
  deuda ha cambiado de verdad.
- La demo de la web usa un `report.json` antiguo, sin la sección: la vista lo tolera y no la muestra.

## Alternativas descartadas

- **Una herramienta nueva por cada dato de migración.** La lente tiene muchas métricas; un agente
  tendría que adivinar cuál preguntar. Una sola herramienta que da el plan completo es más útil.
- **Meter la migración dentro de `get_architecture_map`.** Ensuciaría una herramienta que ya tiene
  que servir para el mapa y los agentes.
- **No tocar el reporte y hacerlo todo en el MCP.** El comentario del PR seguiría sin la deuda, que
  es justo donde el equipo la necesita.

## Hoja de ruta

Sin fases abiertas: M8 está cerrada.

El detalle de lo hecho está en el [changelog](0022-la-migracion-donde-faltaba.changelog.md).
