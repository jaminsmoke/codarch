---
title: "El riesgo cuenta el lint"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**Qué era**: el lint ya viajaba hasta la app, pero el riesgo seguía siendo el de siempre: complejidad, churn y tamaño. El artefacto se podía leer y no cambiaba ni un color.

**Qué cambia**: `@codarch/metrics` gana `lintScore` (errores + ¼ de avisos), `lintScores` y una cuarta señal en `riskBreakdown`. Con deuda medida, los pesos pasan a 0,40 · 0,256 · 0,144 · 0,20; sin ella, vuelven a 0,50 · 0,32 · 0,18, exactamente la cuenta de antes. La señal se normaliza por el p95 del proyecto como las otras, y el desglose la lleva en `parts.lint` con su valor, su p95, su peso y su parte. El render acepta el artefacto (`RenderOptions.lint`), lo pasa al modelo y cada `RenderFile` gana su `lint` ponderado. La captura lo recibe por `ShotOptions.lint` y `codarch shot` lo busca al lado del `cc.json` —también en `.codarch/lint.json` cuando el snapshot está en la raíz—, igual que `render`. La ficha del fichero enseña la barra **Lint** solo cuando pesa, y los pesos de la nota salen del propio modelo en vez de estar escritos a mano.

**Por qué así**: el lint no puede depender de que haya herramienta instalada para que el mapa siga siendo el mismo: sin artefacto, ni un peso cambia ni un píxel se mueve (hay test). Y la cuenta vive una sola vez en `metrics`, así que la app, el render y la captura no pueden discrepar. El lector del artefacto sigue devolviendo `null` si no lo entiende: eso es «sin medir», no «limpio».

**Verificado**: 11 tests nuevos —los pesos con y sin lint, el error que vale cuatro avisos, la normalización por p95, el fichero con hallazgos que sube de riesgo, el artefacto vacío que no cambia nada, la captura que cambia de píxeles con deuda y no con un artefacto roto, y `shot` leyendo el `lint.json` de la raíz y el de al lado—. Suite completa (1.187), lint y typecheck en verde.

**Lo que falta**: las fichas de fichero y de carpeta con su agregación, la lente Linter y el lint en el MCP.

**Veredicto**: fase en marcha.
