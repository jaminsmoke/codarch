---
title: Una sola sesión de análisis
date: "2026-10-26"
category: refactor
verdict: adr
---

**Qué era**: el análisis no estaba duplicado —`packages/parsers` lo comparten CLI, escritorio y navegador—, pero el flujo que lo envuelve sí. `serve` tenía su `refresh`, su `analyzeState` y su `computeHeadReport`; el proceso de análisis del escritorio tenía su `Map` de sesiones, su `headReportFor` y su caché de reportes por raíz. Dos copias de "analiza si el pulso trae algo nuevo, relee el alcance del `.codarch.yml`, compara con el último commit y junta los avisos", que ya habían divergido en detalles: cuándo se invalida el reporte, dónde vive la caché, qué aviso sale si git falla.

**Qué cambió**: el flujo vive en `@codarch/parsers` como `analyzeRepo` y `headReportFor`. `serve` y el worker del escritorio los llaman y pierden su copia; el servidor sigue pidiendo el reporte de forma perezosa y el escritorio sigue reutilizándolo cuando el pulso no trae nada. De paso aparece un fallo que las dos copias tapaban: la comparación con HEAD no leía el `.codarch.yml`, así que Cambios podía enseñar ficheros que el mapa excluye; ahora el reporte se calcula con el mismo alcance que el snapshot.

**Números**: unas cien líneas de flujo en un solo sitio; `@codarch/parsers` gana una dependencia unidireccional de `@codarch/metrics` y el navegador no se entera, porque entra por `parsers/browser`. Ni `cc.json`, ni el checksum, ni el formato de `report.json` cambian.

**Veredicto**: [ADR 0074](../../adr/0071-0080/0074-una-sola-sesion.md), hecho. Queda el MCP: leer el mismo contrato y ganar `suggest`, `verify` y `profiles`.
