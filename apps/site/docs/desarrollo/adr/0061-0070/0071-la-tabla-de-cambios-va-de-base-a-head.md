---
title: "ADR 0071 — La tabla de Cambios va de base a head"
description: "La pestaña Cambios muestra una tabla con una fila por métrica del modelo, su valor en la base, su valor en el head y el delta. Los totales viven en report.json, no se recalculan en la UI."
section: desarrollo
status: aceptado
date: "2026-10-25"
sidebar:
  label: La tabla de Cambios va de base a head
  order: 71
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

M49 deja abierta una decisión: qué tabla de métricas enseña **Cambios**. La ficha del fichero ya tiene
su tabla (ADR 0060), con una fila por métrica, riesgo primero y la barra hasta el p95. Esa tabla mide
**un fichero**. Cambios mide **un cambio entre dos snapshots**, y la pregunta del usuario es otra:
qué se movió y cuánto.

Hoy el reporte trae deltas de `rloc`, conteos de ficheros, aristas y ciclos, y los deltas por fichero.
No trae **los totales de cada métrica** en la base ni en el head. Sin esos totales no se puede pintar
la tabla sin releer los dos snapshots en la UI.

## Decisión

1. **La tabla de Cambios es base → head.** Una fila por métrica del modelo, con tres columnas: valor en
   la base, valor en el head y delta. El color del delta sale de la dirección de la métrica
   (`metricState`), igual que en la ficha.
2. **Los totales viven en `report.json`.** El diff calcula el total de cada métrica en los dos
   snapshots y los escribe en un campo nuevo del reporte. La UI no recalcula nada.
3. **El reporte sigue siendo legible hacia atrás.** El campo es opcional: un reporte sin él no rompe
   la pestaña, que simplemente no pinta la tabla.
4. **Solo se añaden datos.** No cambia el checksum del snapshot, ni los campos que ya existían, ni el
   orden de lo que ya se escribe.

## Consecuencias

- El reporte gana un campo de totales por métrica en base y head. Crece un poco, pero es pequeño: una
  entrada por métrica del modelo, no por fichero.
- La tabla de Cambios y la de la ficha son lenguajes distintos a propósito: una mide el fichero, la
  otra el cambio. Se comparten el color y la barra, no la forma.
- Tests: que el diff escribe los totales de base y head, que el delta sale de la diferencia, y que un
  reporte viejo sin el campo no rompe la pestaña.

## Alternativas descartadas

- **Calcular los totales en la UI a partir de los snapshots.** No cambia el reporte, pero obliga a cargar
  los dos snapshots completos en la pestaña, y hoy solo se carga el reporte. Mete trabajo pesado en el
  navegador para leer un resumen.
- **La misma tabla que la ficha del fichero.** Riesgo primero, área como marca y barra hasta el p95
  mide un fichero. Aplicada al cambio, o promedia cosas distintas o repite el riesgo de cada fichero.
  No responde a qué se movió.

## Hoja de ruta

### M52 — La tabla de Cambios

- [ ] El diff calcula los totales de cada métrica en base y head, y los escribe en `report.json`.
- [ ] El esquema del reporte admite el campo nuevo sin romper los reportes que no lo traen.
- [ ] La pestaña Cambios pinta la tabla base → head, con el color de cada delta según su dirección.
- [ ] Un reporte sin totales no rompe la pestaña y no pinta la tabla.
- [ ] Tests del cálculo de totales, del delta y del reporte viejo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
