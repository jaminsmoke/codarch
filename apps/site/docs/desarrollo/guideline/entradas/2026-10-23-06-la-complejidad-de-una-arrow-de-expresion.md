---
title: La complejidad de una arrow de expresión
date: "2026-10-23"
category: fix
verdict: arreglo
---

**Qué era**: el mapa decía que un fichero tenía `maxComplexity` 33 y la lente de símbolos no tenía
ninguna función por encima de 10. Parte de la diferencia es legítima —las métricas de fichero
cuentan también callbacks anónimos y funciones anidadas, y los símbolos solo las declaraciones con
nombre—, pero había un fallo real: `functionComplexity` empezaba en los hijos del cuerpo, así que una
arrow de expresión como `x => x ? 1 : 0` o `a && b` perdía la decisión del propio cuerpo y se
quedaba en complejidad 1.

**Decisión**: [ADR 0040](../../adr/0031-0040/0040-la-complejidad-del-cuerpo-entero.md). La complejidad
recorre el cuerpo entero; las funciones anidadas se siguen midiendo aparte. Las métricas de fichero
incluyen callbacks anónimos y la lente de símbolos solo los nombres: son dos preguntas distintas y
los documentos lo dicen. El formato de `cc.json` no cambia; el checksum cambia donde cambian las
métricas.

**Veredicto**: **arreglo**, con ADR 0040; hecho.
