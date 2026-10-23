---
title: "Changelog — ADR 0031 «Los documentos: cada decisión con su hoja de ruta»"
description: Lo hecho del ADR 0031, por orden. La hoja de ruta y lo abierto viven en el ADR.
section: adr
changelog: true
adr: adr/0031-0040/0031-los-documentos
sidebar:
  label: Changelog
  order: 31.5
---

**Decisión:** [el ADR](0031-los-documentos.md) · **Estado:** aceptada · **Fecha:** 2026-10-22

Este changelog guarda lo que se hizo para esta decisión. La hoja de ruta vive en el [ADR](0031-los-documentos.md#hoja-de-ruta).

## Lo que se hizo

### M18 — Los documentos ordenados

**Estado:** cerrada.

- [x] Los ADR en carpetas de diez (`0001-0010`, `0011-0020`, `0021-0030`, `0031-0040`),
  con su hoja de ruta al lado.
- [x] El detalle de cada fase pasa a la hoja de su decisión; `docs/roadmap.md` queda como
  índice.
- [x] `docs/adr/index.md`: el índice de las decisiones.
- [x] La guía pasa a ser un registro cronológico con identificadores estables.
- [x] Los enlaces del repo, de los README y de las URLs públicas reescritos.

### M19 — Los documentos, con iconos y diagramas

**Estado:** cerrada.

- [x] Un set **pequeño** de iconos con su leyenda: la categoría (decisión, hoja de ruta,
  idea, veredicto) y el estado (hecho, en curso, sin empezar, arreglo, esperar).
- [x] Los y siguen significando **hecho / no hecho**: no se mezclan con los iconos.
- [x] Mermaid en la guía (el flujo de una idea), en el índice de las decisiones (la
  estructura), en el roadmap (el reparto de las fases) y en el README (el camino del repo
  al producto).
- [x] Los ADR y sus hojas llevan el icono de estado en la línea del estado.
- [x] La leyenda vive en la guía y en `AGENTS.md`, para que los documentos siguientes la
  respeten.

### M20 — La guía, en HTML

**Estado:** cerrada.

- [x] `docs/guideline/` con `index.html`, `guia.css` y `guia.js`: una página con índice
  fijo, «dónde estoy», barra de progreso y una **línea del tiempo** con las ideas: un punto
  por entrada, con su color y su fecha, que salta a su sección al pulsarlo.
- [x] Sin nombres G1: cada entrada se llama por su título y se ancla con él.
- [x] El diagrama del flujo en HTML, sin mermaid ni CDN: se abre sin red.
- [x] `npm run docs` abre la guía; `docs/guideline.md` desaparece y sus enlaces se
  reescriben.
- [x] `docs/guideline/README.md`: cómo se edita y cómo se añade una entrada.
