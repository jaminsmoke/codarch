---
title: "La tabla de métricas es la misma en las tres hojas"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**Qué era**: la tabla de Métricas se leía bien solo en la ficha del fichero. La de carpeta sumaba los

mismos valores pero salía sin tinta —el aviso y la deuda en gris, como cualquier número— y sin el marco

de la sección: sus filas se confundían con las de al lado. La del proyecto tampoco llevaba tinta, y su

contenedor ya estaba puesto, así que la diferencia se notaba más.

**Qué cambia**: las tres tablas comparten el mismo componente y la misma regla de color. El rojo de la

deuda y el ocre del aviso saltan al pasar el umbral del proyecto para cualquier sujeto, también en

carpeta y proyecto: la cifra del subárbol es la suma, y la tinta la decide el peor fichero que la pone,

cuyo nombre va en la ayuda de la fila. La tabla de la carpeta entra en el marco de sección que la ficha

del fichero ya tenía, y su sección de Reglas, que pintaba su propio contenedor por dentro, deja de

hacerlo: una sección, un marco.

**Por qué así**: una tabla que se viste distinto según el sujeto obliga a leer dos veces la misma

columna. Si el número es el mismo y el umbral es el mismo, la tinta también; lo único que cambia es de

quién es el máximo, y para eso ya estaba la ayuda.

**Verificado**: `metrics.test.ts` cubre la tinta de la fila de carpeta y proyecto con el peor fichero del

subárbol, y `sectionFrame.test.ts` que la hoja de carpeta no lleva dos marcos anidados. Lint, typecheck,

suite completa y `site:build` en verde.

**Veredicto**: arreglo.
