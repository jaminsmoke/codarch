---
title: "ADR 0074 — Una sola sesión de análisis"
description: "El flujo de analizar un repo y compararlo con su último commit sale de serve y del worker del escritorio a @codarch/parsers, para que las dos plataformas no lo implementen por su cuenta."
section: adr
status: aceptado
date: "2026-10-26"
sidebar:
  label: Una sola sesión de análisis
  order: 74
---

**Estado:** aceptado · **Fecha:** 2026-10-26

## Contexto

El análisis no está duplicado: `packages/parsers` es el núcleo (`analyzeFiles`, `analyzeRepository`,
`AnalysisSession`, `compareWorkingTreeWithHead`) y lo usan el CLI, el escritorio —por
`utilityProcess`— y el navegador, con el parser WASM y un `MemoryFileSystem`. Eso ya funciona como
`packages/ui` entre la web y el escritorio.

Lo que sí está escrito dos veces es el **flujo** que lo envuelve: "analiza si el pulso trae algo
nuevo, relee el alcance del `.codarch.yml`, compara con el último commit y junta los avisos".

- `apps/cli/src/commands/serve.ts`: `refresh` + `analyzeState` + `computeHeadReport`, con el reporte
  HEAD calculado la primera vez que se pide y guardado en el estado del servidor.
- `apps/desktop/src/analyze-worker.ts`: la misma secuencia con su propio `Map` de sesiones, su
  `headReportFor` y su caché de reportes por raíz.
- `apps/mcp/src/store.ts`: una tercera puerta que lee `.codarch/` por su cuenta.

Son dos copias que ya divergieron en detalles —qué aviso se enseña cuando git falla, cuándo se
invalida el reporte, dónde vive la caché—, y cada cambio de comportamiento hay que hacerlo dos
veces. Es el mismo problema que el visor HTML (ADR 0073): una segunda implementación que se queda
atrás sin que nadie lo note.

## Decisión

1. **El flujo vive en `@codarch/parsers`.** Un módulo `repo-session` exporta:
   - `analyzeRepo(root, { hints, force })`: relee el alcance, analiza o contesta `unchanged`, y
     devuelve el snapshot con sus avisos. Invalida el reporte HEAD de esa raíz cuando hay análisis
     nuevo.
   - `headReportFor(root, warnings)`: el `DiffReport` del working tree contra su último commit,
     calculado una vez por raíz y guardado hasta que haya un análisis nuevo. Si git falla, devuelve
     `null` y añade el motivo a los avisos.
   - `repoSession(root)`: una `AnalysisSession` por raíz y proceso, que es donde vive la caché de
     parseo y churn (ADR 0056).
2. **`serve` y el worker del escritorio dejan de tener su copia.** El servidor sigue calculando el
   reporte de forma perezosa —no se paga al arrancar—, y el escritorio sigue reutilizándolo cuando
   contesta `unchanged`; las dos cosas salen ahora del mismo sitio.
3. **El modelo lo produce el núcleo, no la app.** El CLI publica (HTTP en `serve`, ficheros con
   `analyze`/`diff`), el escritorio consume en proceso y el MCP lee el mismo contrato. La UI no es
   fuente de verdad.
4. **El MCP lee el mismo contrato**: snapshot, `report.json` y `head-report.json`, con la misma
   preferencia que la app (el HEAD manda), y las consultas que solo tenía el CLI entran como
   herramientas, no como vistas.

## Consecuencias

- Un cambio de comportamiento en "analizar un repo" se hace una vez y llega a las tres plataformas.
- `@codarch/parsers` gana una dependencia de `@codarch/metrics` (el `DiffReport` y la lectura del
  alcance). Es unidireccional: `metrics` no depende de `parsers`, y el navegador sigue entrando por
  `@codarch/parsers/browser`, que no toca el módulo nuevo.
- La caché del reporte HEAD deja de ser estado del servidor: vive en el paquete. Dos procesos siguen
  teniendo dos cachés, que es lo correcto —cada uno analiza su raíz.
- El MCP gana el reporte HEAD y lo prefiere, así que un agente que pregunte por los cambios ve los
  mismos que la pestaña Cambios. Sus consultas nuevas (`suggest_architecture`, `list_profiles`,
  `verify_history`) reutilizan el snapshot ya cargado en vez de releer el disco.

## Alternativas descartadas

- **Paquete nuevo `@codarch/session`.** Separa capas de forma más limpia, pero añade un paquete al
  monorepo —y `AGENTS.md`, `tsconfig` y el lockfile— para unas cien líneas que son la continuación
  natural de `AnalysisSession` y `head-diff`, que ya viven en `parsers`.
- **Que el CLI lea los datos de la app web.** Invierte la regla del producto: la UI pasaría a ser la
  fuente de verdad y volveríamos a tener tres productos.
- **Dejar la copia y sincronizarla a mano.** Es lo que ya pasó: las dos versiones divergieron en
  silencio.

## Hoja de ruta

### M55 — Una sola sesión de análisis

- [x] `analyzeRepo` y `headReportFor` en `@codarch/parsers`.
- [x] `serve` usa el módulo compartido y pierde su copia.
- [x] El worker del escritorio usa el módulo y pierde su copia.
- [x] El MCP lee el mismo contrato (incluido el reporte HEAD) y gana las consultas que solo tenía el
      CLI: `suggest_architecture`, `list_profiles` y `verify_history`.
- [x] Un test compara el reporte HEAD de `serve` y el del escritorio sobre el mismo repo, para que
      una vuelta atrás de cualquiera de las dos falle antes de llegar a `main`.

El registro de lo hecho vive en el [feed de la guía](/guia/).
