---
title: "La fase del lint cierra"
date: "2026-10-31"
category: "docs"
verdict: "arreglo"
---

**Qué era**: la hoja de M67 tenía todas sus casillas hechas —detección de sistemas, artefacto 1.2, reglas
por sistema, lectores de Biome, Ruff, Checkstyle, `go vet` y .NET, y `get_lint_report` en el MCP— y la
fase seguía **en curso** en el índice del roadmap y en `AGENTS.md`. En la misma revisión aparecieron dos
casillas que ya estaban hechas en otra fase: M65 seguía pidiendo «otras herramientas por lenguaje» que
M67 cerró, y M66 seguía pidiendo «la lente Linter y el listado de mensajes» que llegaron con M65.

**Qué cambia**: M67 se declara cerrada en su hoja, en el índice del roadmap y en el estado de
`AGENTS.md`. M65 tacha las herramientas por lenguaje, que son de M67, y M66 tacha la lente, que es de
M65. El punto del lint en la barra y el lint en `explain_module` siguen abiertos donde estaban.

**Por qué así**: el estado de una fase vive en su hoja de ruta, y una casilla que se cumple en otra fase
no se cierra sola: se queda abierta para siempre en la que la nombró. Un trabajo hecho y otro pendiente
dentro de la misma lista esconden las dos cosas.

**Verificado**: `get_lint_report` está registrada en `apps/mcp/src/server.ts` y lee el artefacto, y
`CODARCH_ENTRIES` incluye `lint.repmod.json`; los cinco lectores y sus reglas están en
`@codarch/lint`. Suite del sitio en verde y `site:build` con las páginas nuevas.

**Veredicto**: arreglo. M67 cierra.
