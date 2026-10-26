---
title: "ADR 0072 — Cambios desde el último commit"
description: "La pestaña Cambios compara el working tree con el último commit por defecto, con un histórico aparte. Reglas pasa a subsección y Hotspots entra en Ficheros, para que la pestaña quepa en una pantalla."
section: adr
status: aceptado
date: "2026-10-25"
sidebar:
  label: Cambios desde el último commit
  order: 72
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

La pestaña **Cambios** compara dos snapshots que da el usuario (`codarch diff base head`). El reporte no
sabe qué es «lo que he tocado desde la última vez», así que la pestaña no tiene una vista por defecto
útil: o se carga un reporte a mano, o no se ve nada. Además, cuando el reporte no lleva reglas, la
sección **Reglas** se reduce a un aviso y desaparece de la vista.

La pestaña también crece en vertical: siete bloques plegables (Reglas, Hotspots, Migración, Símbolos,
Ciclos, Ficheros nuevos y Ficheros modificados) que repiten cuenta, color y encabezado. Ni siquiera
Ficheros tiene una sola sección tras el ADR 0070 sin que Hotspots siga aparte.

## Decisión

1. **La base por defecto es el último commit.** La pestaña compara el working tree con el `HEAD` y
   muestra lo que se ha tocado desde la última vez. Sin reporte cargado, el diff lo calcula la app
   desde el repo. Con un reporte cargado, se usa el reporte.
   - **Escritorio:** la app calcula el diff con git directamente, reusando `packages/parsers/src/git.ts`.
   - **Web servida:** lo calcula `codarch serve`, que ya tiene acceso a git, y lo sirve como reporte.
     La web no ejecuta git por su cuenta.
   - **Snapshot del HEAD:** se exporta con `git archive` a un directorio temporal y se analiza desde ahí.
     No toca el working tree ni el índice del usuario, y el directorio se borra siempre al terminar,
     también si falla. Se descarta el worktree de git porque deja metadatos en `.git` que hay que
     limpiar aunque el análisis falle.
2. **El histórico es una sección aparte**: las últimas fotos del repo, cada una con su commit, sus
   ficheros y su delta de rloc respecto a la foto anterior. Se abre una para volver a esa foto. No es
   una segunda pestaña ni mezcla su cuenta con la del cambio actual.
3. **Reglas se pliega y no se pinta sin configurar.** Cuando el reporte trae reglas, van en su sección
   con la cuenta a la vista y el cuerpo cerrado. Si no las trae, la sección desaparece y la pestaña no
   reserva espacio para ella.
4. **Hotspots entra en Ficheros.** Hotspots es una vista de los ficheros del cambio, así que va como
   subsección de **Ficheros**, no como sección propia. Hoy vive en **Balance de deuda**, con los
   diffs de deuda de migración (ADR 0078).
5. **La pestaña se compacta.** Menos bloques plegables en la base; cada subsección usa el mismo
   encabezado (`GroupHead`) y la misma fila; la cabecera del cambio lleva lo que hoy ocupan tres
   bloques.

## Consecuencias

- La pestaña pasa de siete bloques abiertos a una lista de ficheros y cinco bloques plegados. Cada
  bloque tiene una cuenta y un resumen, y el que no aporta no se pinta.
- Hace falta calcular el diff del working tree en el escritorio y en la web servida, no solo leer un
  reporte. Esto toca el análisis nativo con git.
- Los reportes viejos siguen legibles: si no traen reglas, la subsección no se pinta.
- Tests: la base por defecto es el HEAD; el histórico lista commits en orden; Reglas es subsección y
  no aparece sin configurar.

## Alternativas descartadas

- **Desde la rama base (main).** Es la vista de PR y es útil, pero no responde a «lo que he tocado
  ahora». Puede ser un modo más adelante, no el de por defecto.
- **Dos snapshots que elige el usuario, sin cambio por defecto.** Es lo que hay hoy y no resuelve el
  problema de partida.
- **Reglas siempre como sección entera.** Ocupa el espacio de un bloque aunque no haya violaciones, que
  es justo lo que hay que quitar.

## Hoja de ruta

### M53 — Cambios desde el último commit

- [x] La base por defecto de Cambios es el `HEAD`: el working tree frente al último commit.
- [x] Histórico: las últimas fotos con su delta, en su propia sección y plegado.
- [x] Reglas se pliega con su cuenta; sin configurar, no se pinta.
- [x] Hotspots pasa a subsección de Ficheros.
- [x] La pestaña se compacta: una línea de cifras y la lista de ficheros primero.
- [x] Tests de la base por defecto y del orden y los deltas del histórico.

El registro de lo hecho vive en el [feed de la guía](/guia/).
