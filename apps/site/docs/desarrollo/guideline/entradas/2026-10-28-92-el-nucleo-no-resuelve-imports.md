---
title: El núcleo del análisis deja de resolver imports
date: "2026-10-28"
category: refactor
verdict: arreglo
---

**Qué era**: `analyzeFiles` era, según el propio mapa, el segundo bloque más caliente del repositorio: 440 líneas, cinco niveles de anidamiento y una complejidad máxima de **72**. Ahí dentro vivían, mezcladas con el recorrido de los ficheros, las cuatro formas de resolver un import —el módulo de TS/JS, la ruta de Java y Python, el paquete de Go y el espacio de nombres de C#—, así que cada lenguaje nuevo engordaba la misma función.

**Qué es**: el recorrido dice *qué fichero es* y `resolveImports` dice *a qué apunta cada import*, con una función por familia de destino: `linkModule`, `linkPath`, `linkPackage`, `linkTargets` y `linkInternal`. Lo que no es arista —lo externo, lo que vive en la plataforma, lo que está roto— se acumula en un `ImportTally` y vuelve de una pieza. El `using` de C# sigue cerrándose al final, que es lo único que no se puede decidir fichero a fichero.

**Por qué así**: el orden de las comprobaciones es el resultado, no un detalle: un import de Java que casa con su fichero es una arista y uno de TS/JS que no casa es una dependencia. Al partirlo por familia, cada regla vive en un solo sitio y se puede leer sin recordar las otras tres. Y un `?raw`, un `?url` o un `?inline` deja de ser un import roto —es una lectura del fichero, no un enlace al módulo—, que era la única arista falsa que el mapa señalaba en la web del proyecto.

**Cómo se comprueba**: el mapa del propio repositorio, antes y después, sigue con 386 ficheros, 874 aristas y 51,3k líneas. Lo único que se mueve es lo que se buscaba mover: la complejidad de `analyzeFiles` baja de **72 a 47** y los imports sin resolver pasan de 1 a **0** —el `?raw` de la web—, medido con `codarch inspect --metric maxComplexity` y con el contador del mapa. `packages/parsers/test/analyze.test.ts` gana el caso de las cuatro familias en un solo análisis y `resolve.test.ts` el de las queries del bundler.

**Veredicto**: refactor cerrado. Lo que queda de la función es el recorrido, que es lo que hacía.
