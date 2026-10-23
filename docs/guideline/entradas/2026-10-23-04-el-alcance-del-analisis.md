---
title: El alcance del análisis
date: "2026-10-23"
category: feature
verdict: adr
---

**Qué era**: los fixtures de test del propio repo entraban en el mapa, en la deuda de migración y
en `sin-ciclos`; el `--ignore` del CLI era efímero y `serve` y la acción no lo compartían.

**Decisión**: [ADR 0038](../../adr/0031-0040/0038-el-alcance-del-analisis.md). El `.codarch.yml` gana
`ignore`, una lista de patrones de `.gitignore` que se aplica **antes** de crear el snapshot. No
hay una exclusión por defecto de tests ni fixtures: cada repo declara su alcance. `analyze`,
`serve`, la acción y el análisis en navegador lo usan; `diff`, `render`, `inspect` y el MCP consumen
el snapshot sin volver a filtrar.

**Veredicto**: **ADR 0038**, hecho; se aplica en M2 y M5 y no abre una fase nueva. El alcance lo
comparten CLI, servidor, acción y análisis en navegador.
