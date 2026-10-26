---
title: El diff, al abrir el fichero
date: "2026-10-26"
category: feature
verdict: fase
---

**Qué era**: la fila de **Ficheros** daba una cifra, el delta de `rloc`, y con eso no se sabe qué se tocó. El primer intento puso los parciales en la misma fila —`+38 −27 +11`— y no cabe: la columna derecha mide decenas de píxeles, la cifra del medio se pierde y, con un diff abierto, la lista entera se estiraba a 547 px dentro de un panel de 246, así que el total se salía y no se veía.

**Qué cambió**: la fila vuelve a llevar **un** total —el delta de `rloc`, o la métrica que más se movió— y el desplegable gana una sección **Diffs** junto a **Símbolos**. Ahí están los parciales del fichero y la vista de código como la de git: las dos columnas de número, el `+` y el `−` en su línea, tres de contexto y `⋯` donde salta. El diff no viaja en el reporte: se pide al abrir, y lo sirve la plataforma que tiene el repo —`/api/diff` en `codarch serve`, `codarch:read-diff` en el escritorio— comparando el árbol de trabajo con `git show HEAD:<ruta>`.

**Números**: el reporte sube a 1.4 porque cada símbolo lleva sus `addedLines` y `removedLines`, medidos cuando hay dos textos; desde dos `cc.json` quedan en `null`. El diff se corta a un millón de celdas y a 600 filas en un fichero nuevo o borrado, y lo dice. La columna de la lista vuelve a ser `minmax(0, 1fr)`: era el desbordamiento lo que escondía los totales.

**Veredicto**: [ADR 0077](../../adr/0071-0080/0077-el-diff-al-abrir-el-fichero.md), hecho. Comprobado en la app servida: un fichero modificado abre con su `Símbolos` y su `Diffs +29 −2`, el código con las dos numeraciones y el panel sin desbordarse; los tres casos —nuevo, modificado y eliminado— tienen su lectura, y seis tests fijan el diff y sus rutas.
