---
title: "La ficha del proyecto"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**Qué era**: el dock tenía tres hojas —fichero, carpeta y cambios— y la raíz no era ninguna. El total del repo solo se leía en la cabecera, y el lint del [ADR 0094](/desarrollo/adr/0091-0100/0094-el-lint-en-el-mapa) se quedaba en el fichero. La ficha de carpeta aún no tenía métricas.

**Qué cambia**: el dock gana **Proyecto**, una hoja siempre disponible, y las dos fichas comparten una sección **Métricas** con la misma lectura: ficheros, carpetas, líneas y líneas de código sumadas, y la complejidad máxima **con el fichero que la tiene**. El lint va dentro, como una fila más —errores, avisos, ficheros con hallazgos y su score, `errores + ¼ avisos`— y termina con **Lint por carpeta**: una fila por carpeta hija con ficheros, errores, avisos y score que abre la ficha de esa carpeta, que cuenta lo mismo de su subárbol. Ese es todo el descenso: proyecto → carpeta → subcarpeta → fichero. Sin artefacto la fila dice **sin medir** y lo que pesará. La hoja viaja como `tab=project` y `PluginUrlState.tab` aprende el nombre. La cuenta vive en `lintRollup`, sobre el artefacto, con el score de `metrics` y la pertenencia por barra (`packages/ui` no contiene `packages/ui2`).

**Por qué así**: el lint es una métrica y una señal del riesgo; una sección propia partiría la ficha en dos relatos. Y no hay «riesgo del proyecto»: el riesgo está normalizado por el p95 del proyecto y es del fichero, así que un agregado con ese nombre no se puede accionar; las cantidades suman y los máximos dicen de quién son (ADR 0092).

**Verificado**: tests nuevos de la agregación (proyecto, carpeta, prefijo, artefacto limpio y sin artefacto), de las dos fichas —con y sin `lint.json`—, de la suma de métricas, de las carpetas del subárbol y de la cuarta pestaña en la URL y en la barra. Suite completa (1.209), lint y typecheck en verde, y la hoja del proyecto montada sobre el snapshot real del repo: 468 ficheros, 67 carpetas, complejidad máxima 22 en `apps/mcp/src/index.ts` y la deuda de su `lint.json` (0 errores, 0 avisos, score 0) con `apps/`, `packages/`, `plugins/vista-3d/` y `scripts/`.

**Lo que falta**: el riesgo máximo con dueño en la ficha de carpeta, la lente Linter con sus mensajes, el lint en el MCP y una captura de la hoja nueva.

**Veredicto**: fase en marcha.
