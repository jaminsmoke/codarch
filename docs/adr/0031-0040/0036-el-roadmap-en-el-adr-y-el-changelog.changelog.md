---
title: Changelog — ADR 0036 «El roadmap vive en el ADR y el changelog al lado»
description: Lo hecho del ADR 0036, por orden. La hoja de ruta y lo abierto viven en el ADR.
section: adr
changelog: true
adr: adr/0031-0040/0036-el-roadmap-en-el-adr-y-el-changelog
sidebar:
  label: Changelog
  order: 36.5
---

**Decisión:** [el ADR](0036-el-roadmap-en-el-adr-y-el-changelog.md) · **Estado:** aceptado · **Fecha:** 2026-10-22

Este changelog guarda lo que se hizo para esta decisión. La hoja de ruta vive en el
[ADR](0036-el-roadmap-en-el-adr-y-el-changelog.md#hoja-de-ruta).

## Lo que se hizo

### M23.10 — La documentación ordenada

**Estado:** cerrada.

- [x] Los 35 sidecars `.roadmap.md` pasan a `.changelog.md`; cada uno guarda lo hecho, sin la sección
  de ideas abiertas.
- [x] Cada ADR gana un `## Hoja de ruta` con las fases abiertas o en curso y las ideas que ya son
  trabajo; si no queda nada, lo dice.
- [x] `docs/roadmap.md` se mueve a `docs/adr/roadmap.md` y queda como índice de fases.
- [x] El sitio llama **changelog** al sidecar y muestra la hoja de ruta dentro del ADR; sus enlaces y
  tests se actualizan.
- [x] `docs/adr/index.md`, `AGENTS.md`, el README y la guía apuntan al modelo nuevo.
- [x] M22 se cierra también en el changelog de ADR 0033: el ensayo y la puerta se hicieron al abrir el
  repo.

## Decisiones relacionadas

- [ADR 0031 «Los documentos: cada decisión con su hoja de ruta»](0031-los-documentos.md) — las
  carpetas de diez, el índice y la guía cronológica siguen vigentes; cambia el reparto entre ADR y
  sidecar.
- [ADR 0034 «La web del proyecto»](0034-la-web-del-proyecto.md) — el sitio genera las páginas del
  markdown y ahora enlaza al changelog.
- [ADR 0035 «La guía se lee como un changelog»](0035-la-guia-como-changelog.md) — la guía sigue siendo
  el registro de ideas; el ADR es el registro de la decisión.
