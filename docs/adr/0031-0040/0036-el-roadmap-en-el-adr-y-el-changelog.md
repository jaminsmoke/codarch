---
title: ADR 0036 — El roadmap vive en el ADR y el changelog al lado
description: "El ADR 0031 dejó cada decisión con una hoja de ruta al lado (.roadmap.md) y el roadmap central como índice. Funcionó, pero el nombre mentía: esos ficheros guardaban,…"
section: adr
status: aceptado
date: "2026-10-22"
sidebar:
  label: El roadmap vive en el ADR y el changelog al lado
  order: 36
---

**Estado:** aceptado · **Fecha:** 2026-10-22

## Contexto

El [ADR 0031](0031-los-documentos.md) dejó cada decisión con una **hoja de ruta** al lado
(`<adr>.roadmap.md`) y el roadmap central como índice. Funcionó, pero el nombre mentía: esos ficheros
guardaban, sobre todo, **lo que ya se había hecho** —fases cerradas, listas de tareas—, no lo que
quedaba por hacer. El roadmap de verdad estaba repartido entre el estado de esas fases, las ideas de
la guía y el índice central.

Con 35 decisiones y 272 KB de markdown, el lector tiene que saber tres sitios para responder una
pregunta sencilla: «¿qué queda de esta decisión?». Y el que escribe tiene que decidir si algo va en el
ADR, en la hoja o en el roadmap central.

También se ha considerado guardar los documentos en **SQLite** para que no crezcan sin orden. La
consulta sería cómoda, pero un binario deja de tener diffs, revisiones y enlaces estables; y 272 KB de
texto no ocupan menos por meterlos en una base. La base sirve como **índice derivado**, no como
verdad.

## Decisión

### 1. La hoja de ruta vive en el ADR

Cada ADR lleva un `## Hoja de ruta` con lo **abierto** y lo que está **en curso**: fases, tareas
pendientes e ideas que ya son trabajo. Si no queda nada, lo dice: «Sin fases abiertas».

La hoja de ruta es la respuesta corta a «¿qué queda?». No repite el detalle de lo hecho.

### 2. El sidecar es el changelog

El antiguo `<adr>.roadmap.md` pasa a `<adr>.changelog.md`. Guarda el **registro** de lo que se hizo
para esa decisión: fases cerradas, tareas completadas, decisiones relacionadas y dónde se aplica. No
es una hoja de ruta y no promete trabajo futuro.

### 3. El índice de fases, dentro de `docs/adr`

`docs/roadmap.md` pasa a [`docs/adr/roadmap.md`](../roadmap.md). Sigue siendo un **índice** —una línea
por fase, con su estado y su decisión—, pero vive junto a las decisiones que indexa. Cada línea lleva
al `## Hoja de ruta` del ADR o a su changelog.

### 4. SQLite, si llega, es un índice derivado

El markdown sigue siendo la **fuente de verdad**: se lee en GitHub, se revisa en un diff y se enlaza
sin herramientas. Si el volumen lo pide, un `docs.db` generado en el build —SQLite con FTS5— servirá
para buscar y consultar; se ignorará en git y se podrá reconstruir entero desde `docs/`.

Eso queda como la fase **M24**, no como parte de este cambio. El checksum y el producto no dependen
de la base.

### 5. El sitio cambia de etiqueta, no de fuente

La web sigue generando las páginas del markdown. El sidecar se llama **changelog** en el menú y en la
página del ADR; el ADR muestra su hoja de ruta en el cuerpo. No hay texto copiado a los componentes.

## Consecuencias

- Una decisión se lee en dos sitios con papeles claros: el ADR dice qué se decidió y qué queda; el
  changelog dice qué se hizo.
- El roadmap central deja de crecer con el detalle de cada fase: solo indexa.
- Cambian las rutas de los sidecars (`.roadmap.md` → `.changelog.md`) y el roadmap se mueve a
  `docs/adr/roadmap.md`; los enlaces del repo, de la guía y del sitio se actualizan.
- Las ideas que no son fase siguen en la [guía](../../guideline/contenido.md), por orden cronológico.
- La base SQLite no entra en git: si se implementa, se genera y se tira.

## Alternativas descartadas

- **Dejar los sidecars como hojas de ruta**: el nombre seguiría mintiendo y el lector tendría que
  separar lo hecho de lo pendiente dentro del mismo fichero.
- **Mover todo el contenido al ADR y borrar los sidecars**: el ADR dejaría de ser una decisión estable
  y se convertiría en un registro que crece sin parar.
- **Guardar los documentos en SQLite como fuente**: se pierden los diffs, la revisión en GitHub y la
  edición sin herramientas; el tamaño no baja y el binario se reescribe entero en cada cambio.
- **Un roadmap central con el detalle**: vuelve el problema que abrió el ADR 0031: una fase toca un
  fichero que habla de todas.

## Hoja de ruta

### M24 — El índice SQLite de los documentos

**Estado:** sin empezar. Se hará cuando el número de documentos justifique la consulta; hoy son 272 KB
de markdown y el sitio se genera sin base.

- [ ] **M24.1** Elegir el motor: `node:sqlite` con FTS5, sin dependencia nativa, o una alternativa
  que no rompa `npm ci`.
- [ ] **M24.2** Un script `docs:db` que lea `docs/**/*.md` y escriba `.codarch/docs.db`, ignorado en
  git y reconstruible.
- [ ] **M24.3** El esquema: ruta, tipo (ADR, changelog, guía, producto), número, título, fecha,
  estado, encabezados, texto y enlaces; FTS5 sobre título y texto.
- [ ] **M24.4** Usarlo para buscar desde el sitio o el MCP cuando el volumen lo pida; el markdown
  sigue siendo la fuente.
- [ ] **M24.5** Un test que genere la base dos veces y compruebe que sale igual, sin rutas absolutas ni
  timestamps.

El detalle de lo hecho está en el [changelog](0036-el-roadmap-en-el-adr-y-el-changelog.changelog.md).
