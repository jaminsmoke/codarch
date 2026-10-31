---
title: "El MCP comparte la agregación y trae el lint"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**Qué era**: el MCP sumaba tamaño y tomaba máximos de complejidad y riesgo en
`store-folders.ts`, aparte de la ficha. `explain_module` no devolvía la deuda de
lint del ámbito, aunque el artefacto ya se leía en `get_lint_report`.

**Qué cambia**: `aggregateFolder` vive en `@codarch/metrics` (índice y browser). El
MCP indexa el árbol y llama al helper; la UI reutiliza sus máximos (y dueños) en
Riesgo y Complejidad. Se borra la copia de agregación del MCP. `explain_module`
gana `lint: LintTotals | null` (`null` = sin medir). Sin dueños en la salida del
MCP. M66 cierra.

**Por qué así**: una sola pieza con tests evita que UI y MCP diverjan; el lint
aditivo no rompe clientes, y `null` distingue «sin medir» de «limpio».

**Verificado**: tests de `aggregateFolder` (equivalencia con la agregación legada),
de la ficha de métricas, y del MCP (cifras idénticas y campo `lint`); typecheck y
lint del cambio.

**Veredicto**: hecho. De M63 quedan frontera y ciclos, y los cambios acotados. M64
sigue con las reglas del resto. M65 sigue abierta. M66 cierra.