---
title: El roadmap, en el ADR
date: "2026-10-22"
category: docs
verdict: fase
---

**Qué era**: los sidecars se llamaban `.roadmap.md`, pero guardaban sobre todo lo que ya se había
hecho. El roadmap de verdad estaba repartido entre el estado de las fases, las ideas de la guía y el
índice central.

**Decisión**: [ADR 0036](../../adr/0031-0040/0036-el-roadmap-en-el-adr-y-el-changelog.md). La **hoja de
ruta** vive en el ADR (`## Hoja de ruta`); el sidecar pasa a **changelog** con lo hecho. El índice de
fases se queda dentro de `docs/adr`, en [`roadmap.md`](../../roadmap.md).

**Qué se hizo**: los 35 sidecars cambiaron de nombre y de papel; cada ADR ganó su hoja de ruta; el
sitio llama changelog al sidecar y muestra la hoja dentro del ADR.

**Veredicto**: **fase M23.10**, hecha. El índice SQLite de los documentos queda como **M24**, para
cuando el volumen lo pida: la base será derivada y el markdown seguirá siendo la verdad.
