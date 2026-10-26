---
title: Las líneas no son código
date: "2026-10-26"
category: fix
verdict: adr
---

**Qué era**: la pestaña Cambios seguía enseñando ficheros que nadie había tocado, y el motivo no era la pestaña. Con `core.autocrlf=true` en Windows, `git archive` exporta el commit con CRLF y el árbol de trabajo estaba en LF: el hash del cuerpo de cada símbolo incluye los saltos de línea, así que la lente de símbolos veía cambios donde solo había un retorno de carro. Lo mismo pasaba con dos símbolos homónimos en un fichero —dos `listener` anidados, el constructor de dos clases—: el emparejamiento se quedaba con uno y el otro aparecía como cambiado.

**Qué cambió**: el analizador normaliza CRLF a LF al leer el fuente, en un solo punto, así que vale para el disco, para la memoria del navegador y para el export del HEAD. Los símbolos del mismo nombre se emparejan por orden de aparición en vez de con un mapa que pierde los repetidos.

**Números**: dos líneas de normalización y un mapa que pasa a ser una cola por nombre. Los snapshots de un repo con CRLF cambian de checksum una vez; el formato y el modelo no cambian. `rloc`, `loc` y las líneas de los símbolos se quedan igual: lo que cambia son los hashes.

**Veredicto**: [ADR 0076](../../adr/0071-0080/0076-las-lineas-no-son-codigo.md), hecho. Sobre este repositorio, la pestaña pasó de enseñar ficheros como `Settings.tsx`, `preload.ts` o `watch.ts` que nadie tocó a enseñar solo los que tienen cambios de verdad.
