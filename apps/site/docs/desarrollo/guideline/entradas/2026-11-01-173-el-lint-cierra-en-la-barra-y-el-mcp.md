---
title: "El lint cierra en la barra y el MCP"
date: "2026-11-01"
category: "feature"
verdict: "fase"
---

**Qué era**: M65 tenía abiertos el punto del lint en la barra del inspector y la
cuarta señal del riesgo en el MCP. Las fichas, la lente y `explain_module.lint`
ya estaban; el store del MCP seguía calculando el riesgo solo con tres señales.

**Qué cambia**: Fichero, Carpeta y Proyecto marcan un punto con la peor severidad
presente (`.lint-dot-*`, nunca `--rust`); el botón anuncia la cuenta en español.
Sin medir o limpio no hay punto; Cambios no absorbe lint. `buildFiles` del MCP
lee el artefacto, aplica `lintScores` y `riskScores(..., { lint: true })`. M65
cierra.

**Por qué así**: el punto avisa sin abrir la ficha, con el mismo lenguaje visual
que los hallazgos; el MCP comparte la cuenta del mapa para no mentir al agente.

**Verificado**: tests de `worstLintSeverity`, `lintBarMark`, riesgo del store MCP
con y sin artefacto; typecheck, lint y vitest del cambio.

**Veredicto**: hecho. M65 cierra. Quedan abiertas M63 (carpeta) y M64 (resto).
