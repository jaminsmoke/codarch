---
title: "ADR 0077 — El diff, al abrir el fichero"
description: "La fila de Ficheros guarda un solo total; el desplegable gana una sección Diffs con los parciales y la vista de código, que se lee de git al abrirla y no viaja en el reporte."
section: desarrollo
status: aceptado
date: "2026-10-26"
sidebar:
  label: El diff, al abrir el fichero
  order: 77
---

**Estado:** aceptado · **Fecha:** 2026-10-26

## Contexto

El ADR 0070 dejó la fila de **Ficheros** con una cifra, el delta de `rloc`, y descartó pintar el diff
de código: el reporte no lleva contenidos. Al usarla, la cifra sola no basta. Un fichero que
`rloc +11` puede haber añadido 38 líneas y quitado 27, y las dos lecturas son ciertas: la primera dice
cuánto creció, la segunda qué se tocó. Sin la segunda, un revisor tiene que abrir el repositorio para
saber si el cambio es una línea movida o un cuerpo nuevo.

El primer intento puso los dos parciales en la propia fila —`M packages/… +38 −27 +11`— y no cabe.
La columna derecha mide unas decenas de píxeles; con tres cifras seguidas, la del medio se pierde y
el total se sale del panel. Medido en la app: la lista entera se estiraba a 547 px dentro de un panel
de 246, y lo que quedaba a la derecha no se veía.

## Decisión

1. **La fila guarda un total.** El delta de `rloc` —o la métrica que más se movió, con su nombre—,
   como decidió el ADR 0070. Nada más: es lo que se compara entre filas.
2. **El desplegable tiene dos secciones.** **Símbolos**, con lo que suma y resta cada símbolo
   (`StartFn +10 −4`), y **Diffs**, con los parciales del fichero y la vista de código. La primera
   responde «qué cambió»; la segunda, «cuánto y dónde».
3. **La vista de código es la de git.** Dos columnas de número —base y head—, el signo `+` o `−` en
   la línea, tres de contexto alrededor de cada cambio y `⋯` donde se salta. Sin color de fondo en
   las líneas de contexto: el color dice lo que ocurrió, no que esté en un diff.
4. **El diff se pide al abrir, no viaja en el reporte.** El reporte es interoperable y determinista;
   meter el texto de cada fichero lo multiplicaría y cambiaría su forma. Lo sirve la plataforma que
   tiene el repositorio —`/api/diff` en `codarch serve`, `codarch:read-diff` en el escritorio— y
   calcula el lado de la base con `git show HEAD:<ruta>` contra el árbol de trabajo.
5. **Los símbolos sí llevan sus líneas en el reporte.** `addedLines` y `removedLines` se miden cuando
   hay dos textos a mano (la comparación HEAD) y quedan en `null` desde dos `cc.json` sueltos: «no
   medido» no es un cero. Es `report.json` 1.4.
6. **Lo que no se puede medir, no se pinta.** Sin git no hay sección **Diffs**; un fichero enorme se
   recorta y se dice (`truncated`); un binario o una ruta que se sale del repo no devuelven nada.

## Consecuencias

- La fila vuelve a caber: un total, una unidad, la misma en los tres grupos. El detalle está a un
  clic y no compite por el ancho.
- El reporte no crece con código: la vista es una lectura bajo demanda y no entra en el checksum.
- El mismo componente sirve a la web y al escritorio; cada plataforma decide si puede leer el diff.
- Tests: el diff de líneas (añadidas, quitadas, contexto y huecos), la lectura de un fichero
  modificado, nuevo y borrado, las rutas rechazadas y el determinismo de dos lecturas seguidas.
- `parseReport` rellena `addedLines`/`removedLines` con `null` en los reportes anteriores a 1.4.

## Alternativas descartadas

- **Los dos parciales en la fila.** Es lo que se probó: tres cifras en una columna de 60 px, y el
  panel desbordado. Se lee peor que una sola cifra.
- **El diff completo dentro del reporte.** Haría que `report.json` dejara de ser un resumen de
  métricas y pasara a llevar código fuente, con el tamaño y el checksum que eso implica.
- **Parsear `git diff -U3` en el servidor.** Da el mismo dibujo, pero las cuentas del reporte y las de
  la vista saldrían de dos algoritmos distintos y podrían no cuadrar. Se mide una vez y se pinta lo
  medido.
- **Una vista de una sola columna de números.** Más compacta y peor: sin la línea de la base no se
  sabe de dónde viene lo que se quitó.

## Hoja de ruta

### M58 — El diff, al abrir el fichero

- [x] `diffLines` mide y alinea con contexto, y devuelve el diff de un fichero.
- [x] `readFileDiff` lo lee de git: árbol contra `HEAD:<ruta>`.
- [x] La fila con un solo total; **Símbolos** y **Diffs** dentro del desplegable.
- [x] La vista de código en la web y en el escritorio, con su scroll y su recorte.
- [x] Tests del diff, de la lectura y de las rutas que no se leen.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
