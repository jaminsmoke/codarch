---
title: "ADR 0070 — Los ficheros del cambio, en una sola lista"
description: "Nuevos, modificados y eliminados se leen en una sola sección Ficheros, con la letra de estado, su color y el delta de rloc; la rejilla de seis cifras se retira."
section: desarrollo
status: aceptado
date: "2026-10-25"
sidebar:
  label: Los ficheros del cambio, en una sola lista
  order: 70
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

La pestaña **Cambios** del ADR 0069 dejó tres bloques para lo mismo: **Ficheros modificados**,
**Ficheros nuevos** y un contador `−N` de eliminados que no llevaba a ninguna lista. `report.files.removed`
se mide, se cuenta en la cabecera y no se pinta en ningún sitio: un fichero que desaparece no se puede
leer, y es de las cosas que más importan en un diff.

Las tres secciones, además, no hablan la misma lengua. Las filas de modificados enseñan las dos
métricas que se muevan, con su nombre (`rloc +2 · complexity −1`); las de nuevos, un `+rloc`; las de
eliminados, nada. La misma columna dice cosas distintas en cada lista, así que no se comparan de un
vistazo.

Y la rejilla de seis cifras bajo los checksums repite cuatro de los datos que ya están en las
cabeceras de las secciones: **Hotspots**, **Símbolos** y **Deuda de migración** tienen su sección con
su cuenta, y **Ficheros** va a tener la suya. Quedan sin sección **Aristas** y **Ciclos**, que son los
únicos que necesitan sitio propio.

## Decisión

Nuevos, modificados y eliminados se leen en **una sola sección, Ficheros**, que se queda la última
—después de lo que rompe y de dónde y cuánto (ADR 0069)—.

1. **Una sección, tres grupos.** `CollapsibleSection` «Ficheros» con la cuenta total y, al plegarse,
   `3 nuevos · 12 modificados · 1 eliminado`. Dentro, tres `GroupHead` como los de **Reglas**:
   **Nuevos**, **Modificados** y **Eliminados**. El orden es el de la lectura: lo que entra, lo que
   cambia, lo que sale.
2. **La letra dice el estado, y su color también.** Cada fila empieza por `A`, `M` o `D` en patina,
   ochre y deuda; la ruta va en mono y el delta a la derecha. No se inventa una paleta: son los tonos
   que ya usan las lentes y la tabla.
3. **Una cifra por fila, la misma para los tres grupos.** El delta de `rloc`: `+84` en un nuevo,
   `+12` o `−3` en uno modificado, `−120` en uno eliminado. Si el `rloc` no se movió, la métrica que
   más se movió, con su nombre corto. El resto de métricas, en el tooltip: la fila no se convierte en
   una tabla.
4. **Los eliminados no son un botón.** No están en el snapshot del head, así que no hay ficha que
   abrir; la fila es texto, sin `cursor: pointer`, y su tooltip lo dice. Un botón que no lleva a
   ninguna parte miente.
5. **Se corta a 25 por grupo**, como **Reglas**, con `+N más` debajo. Ya no hay dos cortes distintos,
   seis y cinco, que además dejaban ficheros fuera sin decirlo.
6. **La rejilla de seis cifras se va.** Bajo los checksums queda una línea con lo que no tiene
   sección: `Aristas +4 −2 · Ciclos +1 −2`, y solo cuando alguna de las cuatro cifras se mueve. Una
   línea de ceros no informa de nada. Ficheros, hotspots, deuda de migración y símbolos se leen en
   la cabecera de su sección, una sola vez.

**Lo que no cambia:** ni `report.json`, ni el esquema, ni el checksum. Los tres grupos salen de
`report.files`, que ya los trae.

## Consecuencias

- La pestaña pierde una sección —dos listas de ficheros pasan a una— y lo eliminado se ve por
  primera vez.
- La unidad de la columna derecha es la misma en todas las filas, así que se comparan.
- `ChangesPanel` deja de llevar la rejilla; el resumen vive en las cabeceras.
- Tests: los grupos y su orden, el delta elegido por fila, el reparto de la cabecera y el aviso de
  que un eliminado no tiene ficha. La fila sin botón se comprueba en la app, no con un test de DOM.

## Alternativas descartadas

- **Una lista alfabética plana, como un cliente de git.** Es lo más corto de escribir y lo peor de
  leer aquí: sin grupos no hay cuenta por estado, y el color de la letra tendría que cargar con todo.
- **Dejar las tres secciones y solo añadir la de eliminados.** Arregla el agujero y mantiene el
  problema que motiva este ADR: tres cabeceras, tres cortes y dos unidades distintas.
- **Meter las columnas de migración y símbolos en la fila.** Convierte la lista en la tabla que el
  ADR 0060 ya decidió no repetir; el detalle vive en la ficha del fichero y en su sección.
- **Pintar el diff de código por fichero.** El reporte no lleva contenidos —la base es un `cc.json`,
  que guarda métricas y rutas, no el texto de los ficheros—, así que exigiría cambiar el CLI y el
  esquema. Fuera de este corte; hoy se lee bajo demanda al abrir la fila (ADR 0077).

## Hoja de ruta

### M51 — Una lista de ficheros

- [x] `changeFiles.ts`: los tres grupos, el delta por fila y el reparto de la cabecera.
- [x] La sección **Ficheros** con la letra, su color y las filas; los eliminados, sin botón.
- [x] Fuera la rejilla; una línea de aristas y ciclos bajo los checksums.
- [x] Tests de los grupos, el orden, el delta y el reparto.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
