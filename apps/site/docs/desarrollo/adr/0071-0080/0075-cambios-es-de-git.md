---
title: "ADR 0075 — Cambios es de git"
description: "La pestaña Cambios enseña solo el árbol de trabajo contra su último commit: fuera las reglas, fuera el reporte de dos fotos viejas y, sin git, lo dice en vez de enseñar una lista."
section: desarrollo
status: aceptado
date: "2026-10-26"
sidebar:
  label: Cambios es de git
  order: 75
---

**Estado:** aceptado · **Fecha:** 2026-10-26

## Contexto

La pestaña Cambios nació para enseñar qué se ha movido en el código (ADR 0069) y fue sumando
vecinos: las reglas de arquitectura (ADR 0058), la deuda de migración, los símbolos, los ciclos y el
histórico de fotos del repo. Cada uno tiene su sitio, pero juntos dejan de contestar a la pregunta
que trae a alguien a esa pestaña: **¿qué he cambiado yo, y desde cuándo?**

Peor: el dato que la alimentaba no siempre era de ahora. La app pedía `data/report.json` y después
`data/head-report.json`, de modo que cualquier repo sin reporte HEAD —uno sin git, o un servidor que
no lo calcula— se quedaba con el `report.json` de la última vez. En este mismo repositorio la
pestaña enseñaba 65 ficheros añadidos de un reporte de tres días antes mientras el árbol solo tenía
ocho ficheros tocados. Y sin git el histórico crece sin freno: la pestaña acabaría enseñando la
arquitectura de hace un año como si fuera el cambio de hoy.

Hay una segunda mezcla, más de concepto: las reglas no son un cambio del código. Son una lectura de
la configuración del repo sobre dos snapshots, y ya se enseñan donde corresponden, en la ficha del
fichero, que lista las violaciones que mencionan su ruta.

## Decisión

1. **La pestaña es de git y de nada más.** Compara el árbol de trabajo con su último commit, que es
   lo que el servidor calcula y el escritorio escribe en `.codarch/head-report.json` (ADR 0072).
   Con git y sin cambios, lo dice: «Sin cambios desde el último commit». Hoy lo dice sin esconder las
   secciones, que siguen con su título y su vacío (ADR 0078).
2. **Sin reporte HEAD no se cae a `report.json`.** Si no hay git —o su git no tiene commits— la
   pestaña lo dice: no hay nada con lo que comparar ni forma de ver los cambios en vivo. Un
   `report.json` solo se enseña si alguien lo abre a mano, y un artefacto estático (el mapa de un PR)
   trae el suyo porque ahí no hay repositorio.
3. **Las reglas salen de la pestaña.** No cuentan como cambio: `reportHasChanges` deja de mirarlas y
   la pestaña deja de pintarlas. La ficha del fichero sigue enseñando las violaciones de su ruta, y
   el reporte las conserva para el CLI, el MCP y la acción.
4. **El histórico se queda, pero se presenta como lo que es.** Al final, plegado y con su propia
   frase: son fotos guardadas del repositorio, no los cambios del último commit.
5. **El modelo no cambia.** Ni `cc.json`, ni el checksum, ni el formato de `report.json`, ni lo que
   publica la acción.

## Consecuencias

- La pestaña no puede enseñar cambios de la semana pasada: si el dato no es de HEAD, no entra.
- El resumen de cifras pierde la cuenta de reglas; quedan ficheros, aristas y ciclos.
- Quien quiera las reglas del cambio las tiene en la ficha de cada fichero, y en el reporte.
- La web pide un solo reporte al servidor (`data/head-report.json`) en vez de dos; el refresco en
  vivo también relee ese, así que Cambios no se queda con el anterior tras un guardado.
- Un artefacto estático de la acción sigue enseñando el diff del PR: ahí `report.json` es el único
  dato y no hay git con el que comparar.

## Alternativas descartadas

- **Mantener el respaldo y etiquetarlo** («reporte de dos fotos»). Se puede rotular, pero la lista
  se lee igual: ficheros que no has tocado, con fechas que no son de hoy.
- **Una tercera pestaña para las reglas.** Las reglas ya viven en la ficha del fichero; una pestaña
  propia para una evaluación de configuración es más superficie con menos contexto.
- **Quitar también el histórico.** Es información útil del repo; el problema era leerlo como si
  fueran los cambios de ahora, y eso se arregla con su sección y su frase.

## Hoja de ruta

### M56 — Cambios es de git

- [x] La web pide solo el reporte HEAD con servidor; el artefacto estático conserva su `report.json`.
- [x] El refresco en vivo relee el reporte HEAD, no el de dos fotos.
- [x] Las reglas salen de la pestaña y de su cuenta de cambios.
- [x] Sin git, la pestaña lo dice; sin cambios, también.
- [x] El histórico se queda en su sección, con la frase que lo separa del cambio actual.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
