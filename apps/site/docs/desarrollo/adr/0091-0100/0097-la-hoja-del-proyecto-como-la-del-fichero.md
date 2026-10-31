---
title: "ADR 0097 — La hoja del proyecto se lee como la del fichero"
description: "Las métricas de proyecto y carpeta pasan a la tabla de la ficha del fichero —una fila por métrica, cobertura en la barra y sumas o máximos con dueño—, el lint va dentro de Métricas como bloque de totales y Reglas deja de agregar severidades: solo cuenta reglas."
section: desarrollo
status: aceptado
date: "2026-10-30"
sidebar:
  label: La hoja del proyecto como la del fichero
  order: 97
---

**Estado:** aceptado · **Fecha:** 2026-10-30

## Contexto

El [ADR 0095](0095-la-ficha-del-proyecto.md) dio al proyecto su hoja con **Métricas** propias: una
lista de totales —ficheros, carpetas, líneas, complejidad y el lint como una fila más—. Funcionaba y
no se parecía a nada del resto de la app. La ficha del fichero tiene desde el
[ADR 0060](../0051-0060/0060-la-ficha-del-fichero-en-una-tabla.md) una tabla de métricas con su
barra, su valor y su ayuda; la de proyecto tenía otra cosa.

Se notaron dos problemas de lectura:

- **Faltaban métricas.** La lista solo enseñaba `loc`, `rloc` y la complejidad. Un snapshot trae
  diecisiete métricas y el proyecto las callaba, aunque estaban sumadas en el modelo.
- **Dos cifras con el mismo nombre.** **Métricas** decía «0 errores · 0 avisos» —los hallazgos del
  artefacto— y, al lado, **Reglas** decía «22 errores · 2 avisos» —las reglas que la configuración
  activa con esa severidad—. Ninguna mentía; el lector no tenía cómo distinguirlas.

## Decisión

### 1. Métricas usa la tabla de la ficha del fichero

Las tres hojas leen una métrica igual: nombre con su ayuda, barra y valor. Lo que cambia es el sujeto:

- **Una fila por cada métrica del snapshot**, no tres a mano.
- **La barra es la cobertura**: la parte de los ficheros del subárbol que trae la métrica. No es el
  p95 —un total no se compara con el p95 de un fichero— ni una escala inventada.
- **Las cantidades se suman y los máximos se enseñan con su dueño.** Las métricas que ya son un
  máximo por fichero (`maxComplexity`, `maxFunctionLength`, `dependencyLevel`, `inCycle`,
  `cycleSize`…) no se suman: se enseña el mayor y dónde está. La complejidad se añade como fila
  derivada cuando el snapshot no la trae como métrica, porque el modelo ya la tiene por fichero y el
  ADR 0092 pide el máximo con dueño.
- **La fila pinta el mapa**, como en la ficha del fichero: es el mismo control, no una tabla muerta.

Los recuentos de **ficheros**, **carpetas**, **líneas** y **líneas de código** dejan de ser filas: los
dos primeros ya están en la cabecera de la hoja y los otros son `loc` y `rloc`, que ahora salen con su
nombre del modelo. Repetirlos era la otra forma de duplicar.

### 2. El lint es un bloque de totales, no una fila

Dentro de **Métricas**, el lint enseña lo que ya no puede enseñar nadie más:

- **Errores, avisos e info**, cada cuenta con su tinta, y **ficheros con hallazgos** con el score
  (`errores + ¼ avisos`) en el resumen del grupo.
- Debajo, **Lint por carpeta**: una fila por carpeta hija con **err., avis., info y score**; el
  recuento de ficheros pasa al tooltip. Pulsar una fila abre la ficha de esa carpeta.

El contador es uno: `@codarch/lint` suma desde los **mensajes** —no desde las cuentas que declara cada
fichero— y expone `info`. La UI, el CLI y el MCP leen esa cuenta, así que un artefacto de fuera con
cifras que no cuadren no puede hacer que dos hojas digan números distintos. Esto enmienda el ADR 0096
en su punto 5.

### 3. Reglas no agrega severidades

**Reglas** cuenta reglas: sistemas, su configuración, cuántas reglas activas tiene cada uno y qué
reglas tienen hallazgos. La severidad de un sistema es **color y barra**, sin cifras: un total de
«22 reglas de error» se lee como los 22 errores de Métricas, y ese malentendido es el que quitamos.
La severidad se escribe por regla —en la lista de activas y en su columna de la tabla— y ahí no hay
duda de qué cuenta.

### 4. Lo que no cambia

- No hay **riesgo del proyecto**: está normalizado por el p95 y es del fichero.
- No hay **p95 agregado** ni promedio que oculte la cola.
- El descenso sigue siendo **proyecto → carpeta → subcarpeta → fichero**, sin una vista nueva.

## Consecuencias

- `rollupMetricRows` (`packages/ui/src/metrics.ts`) es la única tabla de Métricas de proyecto y
  carpeta; `MetricsRollup` la pinta con las clases de la ficha del fichero.
- Un snapshot con más métricas ya no queda a medias: aparecen todas, con su nombre y su ayuda.
- Una métrica nueva en `cc.json` se ve en la hoja sin tocar la UI.
- El proyecto y la carpeta comparten formato con la ficha del fichero; aprender una tabla es aprender
  las tres.
- La barra de cobertura no distingue una métrica que todos los ficheros traen de una que solo
  algunos: el número de ficheros está en su tooltip, no en la barra.

## Hoja de ruta

- ✅ Tabla de métricas de proyecto y carpeta con todas las métricas del modelo.
- ✅ Coeficiente de cobertura en la barra y máximo con dueño para las métricas que no se suman.
- ✅ Lint como bloque de totales con err., avis., info y score por carpeta.
- ✅ Reglas sin agregados de severidad.
- ⬜ El riesgo máximo con dueño en la ficha de carpeta (ADR 0092).
- ✅ La lente **Linter** en el mapa, con su leyenda (ADR 0098).
- ⬜ El listado de los mensajes de un fichero, con su línea.
