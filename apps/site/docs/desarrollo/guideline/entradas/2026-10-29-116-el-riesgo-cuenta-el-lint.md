---
title: "El riesgo cuenta el lint"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**Qué era**: el lint ya viajaba hasta la app, pero el riesgo seguía siendo el de siempre: complejidad, churn y tamaño. El artefacto se podía leer y no cambiaba ni un color.

**Qué cambia**: `@codarch/metrics` gana `lintScore` (errores + ¼ de avisos), `lintScores` y una cuarta señal en `riskBreakdown`. **Con artefacto**, los pesos pasan a 0,40 · 0,256 · 0,144 · 0,20 aunque el lint esté limpio: es haber medido lo que da el 20 %, no la deuda que tenga. **Sin artefacto**, vuelven a 0,50 · 0,32 · 0,18, exactamente la cuenta de antes. La señal se normaliza por el p95 del proyecto como las otras, y el desglose la lleva en `parts.lint` con su valor, su p95, su peso y su parte. El render acepta el artefacto (`RenderOptions.lint`), lo pasa al modelo y cada `RenderFile` gana su `lint` ponderado. La captura lo recibe por `ShotOptions.lint` y `codarch shot` lo busca al lado del `cc.json` —también en `.codarch/lint.json` cuando el snapshot está en la raíz—, igual que `render`. La ficha del fichero enseña siempre la cuarta barra: **Lint** con su 20 % cuando se midió, y **sin medir** cuando no, con la nota diciendo lo que pesará. Los pesos de la nota salen del propio modelo en vez de estar escritos a mano. Este repo ya declara sus dos herramientas en `.codarch.yml`, así que su propio mapa cuenta el lint.

**Por qué así**: sin artefacto el mapa no puede cambiar: ni un peso se mueve (hay test). Con artefacto limpio el lint entra a cero y su 20 % sale del reparto de los demás, que es la única lectura que no deja al lector adivinar qué se midió. Y la cuenta vive una sola vez en `metrics`, así que la app, el render y la captura no pueden discrepar. El lector del artefacto sigue devolviendo `null` si no lo entiende: eso es «sin medir», no «limpio».

**Verificado**: tests nuevos para los pesos con y sin artefacto, el error que vale cuatro avisos, la normalización por p95, el fichero con hallazgos que sube de riesgo, el artefacto limpio que baja el riesgo porque el lint pesa a cero, la captura que cambia de píxeles con deuda y con artefacto vacío pero no con uno roto, `shot` leyendo el `lint.json` de la raíz y el de al lado, y el HTML del desglose con la fila **Lint** —«sin medir» o su 20 %—. Suite completa (1.194), lint y typecheck en verde.

**Lo que falta**: las fichas de fichero y de carpeta con su agregación, la lente Linter y el lint en el MCP.

**Veredicto**: fase en marcha.
