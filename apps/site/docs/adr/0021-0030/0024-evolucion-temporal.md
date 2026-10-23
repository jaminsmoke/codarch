---
title: "ADR 0024 — La evolución temporal: el calor y la historia"
description: "El snapshot ya trae el churn de git por fichero (numberofcommits y numberofauthors) y el riesgo lo usa. Pero no hay forma de ver la historia: ni qué zona se toca más (el…"
section: adr
status: aceptado ✅
date: "2026-10-21"
sidebar:
  label: "La evolución temporal: el calor y la historia"
  order: 24
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-21

## Contexto

El snapshot ya trae el churn de git por fichero (`number_of_commits` y `number_of_authors`) y el
riesgo lo usa. Pero no hay forma de **ver la historia**: ni qué zona se toca más (el "calor"), ni cómo
se ha movido el mapa con el tiempo.

La evolución temporal tiene dos caras y conviene separarlas, porque no cuestan lo mismo:

- **El calor**: qué ficheros se tocan más. Los datos ya están en el snapshot ✓. Es una lente y una
  lista: trabajo pequeño.
- **La línea del tiempo**: cómo se ha movido el mapa. Necesita guardar snapshots y compararlos:
  trabajo grande.

## Decisión

1. **M10.1 — La lente de calor.** El mapa puede colorear por commits (y por personas) y el panel
   lateral lista los ficheros más tocados. El churn que ya se analiza; solo hay que exponerlo con
   nombre. El color principal es **commits** (es el "calor" clásico y el que ya usa el riesgo) y
   **personas** queda como segunda métrica: un fichero tocado por ocho personas dice algo que
   cuarenta commits de una sola persona no dicen (es conocimiento repartido, y riesgo de bus factor).

2. **M10.2 — La historia, dentro del repo.** Los snapshots se guardan en `.codarch-history/`, en la
   raíz del repo, **fuera** de `.codarch/` a propósito: `.codarch/` está en el `.gitignore` (son
   artefactos locales) y la historia es justo lo que un equipo quiere compartir. Cada repo guarda
   así su línea del tiempo y se puede versionar.
   - `.codarch-history/index.json`: la línea del tiempo (fecha, checksum, commit y recuentos).
   - `.codarch-history/<fecha>-<checksum>.cc.json`: los snapshots.
   - **El snapshot no cambia**: sigue siendo determinista y sin timestamps ✓. La fecha vive en el
     índice, no dentro del snapshot ✓.

3. **M10.3 — Comparar dos momentos.** Reutiliza el motor de diff que ya existe: comparar dos
   entradas de la historia es un diff más.

4. **M10.4 — Verlo en las apps.** La web y el escritorio enseñan la línea del tiempo y el
   antes/después.

## Consecuencias

- El calor no cuesta casi nada: los datos ya estaban.
- La historia ocupa espacio en el repo (cada snapshot es un JSON). Por eso es **opt-in**: solo se
  guarda si se pide, y el índice es pequeño.
- La historia es compartible entre máquinas: dos clones del mismo repo comparan la misma línea del
  tiempo ✓.
- Un repo con historia puede tener el `.codarch-history/` versionado. Si el equipo no lo quiere, lo
  añade a su `.gitignore` ✓ (decisión suya).

## Alternativas descartadas

- **Guardar la historia fuera del repo** (un almacén local del escritorio). Descartado: el
  historial es del proyecto, no de la máquina, y así se puede comparar entre clones.
- **Un solo fichero con todos los snapshots.** Descartado: grows sin límites y acaba en un diff
  ilegible. Un snapshot por entrada y un índice ✓.
- **Poner la fecha dentro del snapshot.** Descartado: el snapshot debe seguir siendo determinista
  (mismo código, mismo checksum) ✓. La fecha va en el índice ✓.
- **El calor por personas como métrica principal.** Descartado: "commits" es el historial y
  "personas" es el reparto. El primero es el número de veces que el código cambió; el segundo, cuánta
  gente lo conoce. Ambos tienen sentido, pero la señal principal es el historial.

## Hoja de ruta

Sin fases abiertas: M10 está cerrada.


## Nota de estilo

El idioma del producto es español; este ADR lo sigue. Los nombres de código van en inglés técnico.
