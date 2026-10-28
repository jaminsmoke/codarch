---
title: El modelo del mapa se construye por pasos
date: "2026-10-28"
category: refactor
verdict: arreglo
---

**Qué era**: `buildRenderModel` construía el modelo del mapa en una sola función de unas 230 líneas y complejidad **50**, la más alta del repositorio después del refactor del núcleo del análisis. Dentro se decidía el área, se recorría el árbol, se calculaba el riesgo, se agrupaban las secciones, se medían las métricas, se deduplicaban las aristas y se elegía el fichero que abre seleccionado.

**Qué es**: cada decisión es una función que escribe una sola cosa en los ficheros. `resolveAreaMetric` elige el área —o se queja, si la pedida no está—; `collectMetricKeys` decide qué métricas lleva el modelo; `collectFiles` recorre el árbol; `warnAboutArea` dice qué ficheros se dibujan con área mínima; `applyRisk`, `buildSections` y `applyMetricValues` rellenan el resto; `buildMetrics` mide la escala; `collectDependency` deja las aristas y los ciclos; `resolveLens` decide con qué lente abre el mapa. `buildRenderModel` los llama en orden y arma el resultado.

**Por qué así**: el riesgo no es de un fichero, es del conjunto —sus pesos se renormalizan según lo que falte—, así que se calcula de una vez sobre el array y no dentro del recorrido. Y las aristas se parecían demasiado entre sí como para vivir separadas: deduplicar, marcar ciclos y ordenar van juntos o el siguiente que las toque se salta un paso. Lo que queda en el orquestador es la lista de pasos, que es lo único que hay que leer para saber cómo sale el modelo.

**Cómo se comprueba**: el modelo de `HEAD` y el de ahora, serializados, son **idénticos byte a byte** sobre el snapshot real del repositorio (386 ficheros, 301 953 bytes); la complejidad de `buildRenderModel` baja de **50 a 16** y los 11 casos de `packages/render/test/model.test.ts` siguen pasando, incluido el de determinismo.

**Veredicto**: refactor cerrado. El mapa sigue dibujando lo mismo y el fichero que vigila `codarch` ya no está entre los peores.
