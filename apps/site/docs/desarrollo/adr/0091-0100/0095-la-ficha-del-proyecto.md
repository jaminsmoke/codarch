---
title: "ADR 0095 — La ficha del proyecto"
description: "El repo entero gana su hoja en el dock: métricas del subárbol —sumas y un máximo con dueño— con el lint dentro y una tabla de carpetas para bajar de proyecto a fichero. Sin sección de lint y sin un riesgo agregado que nadie puede accionar."
section: desarrollo
status: aceptado
date: "2026-10-30"
sidebar:
  label: La ficha del proyecto
  order: 95
---

**Estado:** aceptado · **Fecha:** 2026-10-30

## Contexto

El dock del inspector tiene tres entradas —**Fichero**, **Carpeta** y **Cambios**—
([ADR 0079](0071-0080/0079-el-inspector-con-barra-de-actividad.md),
[ADR 0092](0091-0100/0092-la-carpeta-tiene-su-ficha.md), [ADR 0069](0061-0070/0069-dos-pestanas.md)).
La raíz del proyecto no es ninguna de ellas: `selectFolder` resuelve la selección contra `model.roots`,
así que **el mapa entero no tiene hoja**. Las cifras del repo solo se leen en la cabecera, y el lint
que [el ADR 0094](0091-0100/0094-el-lint-en-el-mapa.md) trajo al mapa se queda en el fichero.

Ese ADR dejó abierta «la agregación compartida» entre fichas, y el
[ADR 0092](0091-0100/0092-la-carpeta-tiene-su-ficha.md) ya escribió la regla: **las cantidades suman;
los máximos dicen en qué fichero están**. Pero un proyecto no es una carpeta grande: sus totales son
la primera pregunta de quien abre un repo ajeno —¿cuánto hay?, ¿cuánta deuda?— y hoy no hay dónde
hacerla.

## Decisión

### 1. Cuatro entradas: el proyecto es un sujeto propio

La barra de actividad gana **Proyecto**, entre Carpeta y Cambios, y su propia hoja. No se resuelve
seleccionando la raíz en la hoja de carpeta por dos razones: la raíz no es un nodo de `roots`, y el
sujeto del proyecto no depende de la selección —está siempre disponible, como Cambios—.

Seleccionar un fichero con la hoja del proyecto delante vuelve a la del fichero, igual que con la
carpeta (ADR 0092). La hoja viaja en la URL como `tab=project`, y `PluginUrlState.tab` y `setTab`
ganan el nombre para que un plugin pueda pedirla.

### 2. Las métricas de un subárbol son sumas, no p95

La sección **Métricas** del proyecto y de la carpeta cuenta lo mismo con el mismo idioma, para que
bajar no cambie de relato:

- **Ficheros** y **carpetas**: la cuenta del subárbol.
- **Líneas** y **líneas de código**: la suma de `loc` y de `rloc`; si el snapshot no trae la métrica,
  un guion, nunca un cero.
- **Complejidad máx.**: el máximo del subárbol **con el fichero que lo tiene**, porque un máximo sin
  dueño no es una tarea (ADR 0092).

No hay p95 ni barra: el p95 es del fichero, y una carpeta no tiene una distribución que quepa en una
barra. Tampoco hay un **riesgo agregado**: el riesgo ya está normalizado por el p95 del proyecto y es
del fichero; un «riesgo de `packages/ui`» sería un número que no se puede arreglar. El máximo con
dueño que promete el ADR 0092 para la ficha de carpeta queda como lo que es, una rebanada posterior.

### 3. El lint vive dentro de Métricas, con su descenso

El lint es una métrica y una señal del riesgo; una sección propia partiría la ficha en dos relatos y
haría mirar en dos sitios para responder «¿cuánta deuda hay aquí?». Así que es **una fila más**:

- **Errores**, **avisos** y **score** (`errores + ¼ avisos`, la misma cifra que pondera el riesgo),
  con los ficheros con hallazgos en la nota. Sin artefacto, la fila dice **sin medir** y lo que
  pesará; no desaparece.
- Debajo, **Lint por carpeta**: una fila por carpeta hija con ficheros, errores, avisos y score.
  Pulsarla abre la ficha de esa carpeta, que cuenta lo mismo de su subárbol. Ese es todo el descenso:
  **proyecto → carpeta → subcarpeta → fichero**, sin una vista nueva.

La suma vive en `lintRollup`, sobre el artefacto y acotada por ruta; el score es `lintScore` de
`@codarch/metrics`, la misma función que usa el riesgo, para que la app no pueda contar dos deudas
distintas. La pertenencia compara `path === folder || path.startsWith(folder + "/")`: `packages/ui` no
contiene `packages/ui2`.

### 4. Lo que no entra

- **Sin listado de mensajes**: la ficha de fichero ya enseña las reglas de arquitectura; los
  mensajes del lint pertenecen a la lente **Linter**, que sigue en la hoja de ruta del ADR 0094.
- **Sin riesgo agregado** y sin un color nuevo en el mapa.
- **El MCP no cambia** en esta decisión; su deuda por módulo es otra rebanada.

## Consecuencias

- El dock pasa de tres a cuatro entradas; la hoja del proyecto no sustituye a la de carpeta.
- `MetricsRollup` se comparte entre proyecto y carpeta: una sola tabla de totales y una sola tabla de
  descenso.
- Las cifras del proyecto son sumas o máximos con dueño; ninguna es un promedio que oculte la cola.
- Una vista guardada o un enlace pueden abrir `tab=project`; el nombre es estable.

## Hoja de ruta

Fase **M66 — El proyecto tiene su ficha**.

- ✅ La cuarta entrada y su hoja, con **Métricas** y el descenso por carpetas.
- ✅ El lint agregado por subárbol, compartido con la ficha de carpeta.
- ✅ La complejidad máxima con su fichero, en las dos fichas.
- ⬜ El riesgo máximo con dueño en la ficha de carpeta (ADR 0092).
- ⬜ La lente **Linter** y el listado de mensajes (M65).
- ⬜ El MCP: la deuda de lint en `explain_module`.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
