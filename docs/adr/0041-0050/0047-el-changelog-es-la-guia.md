---
title: ADR 0047 — El changelog es la guía
description: "Los sidecars `<adr>.changelog.md` desaparecen: el feed de la guía es el registro y cada día tiene su página."
section: adr
status: aceptado
date: "2026-10-23"
sidebar:
  label: El changelog es la guía
  order: 47
---

**Estado:** aceptado · **Fecha:** 2026-10-23

## Contexto

El [ADR 0036](../0031-0040/0036-el-roadmap-en-el-adr-y-el-changelog.md) dejó cada decisión con un
sidecar `<adr>.changelog.md` para lo hecho. Funcionó, pero el registro se partió en dos: la
[guía](/guia/) ya cuenta, por fecha y por categoría, lo que se hizo y lo que viene; el sidecar
repetía esa historia por decisión. Mantener los dos era escribir dos veces lo mismo y decidir en
cada cambio dónde va.

Además, la guía se pintaba entera en una sola página: con 20 entradas ya era una página larga y
cada idea nueva la alargaba. El registro crece por días, no por páginas.

## Decisión

### 1. El feed de la guía es el changelog

Cada idea es un fichero en `docs/guideline/entradas/` con `title`, `date`, `category` y `verdict`.
La guía es el registro cronológico: lo que se hizo y lo que espera. No hay otro changelog.

### 2. Fuera los sidecars

Se eliminan los `<adr>.changelog.md`. El ADR conserva la decisión y su `## Hoja de ruta`; el feed
conserva lo que pasó. Un enlace a «lo hecho» de una decisión va al ADR o a la guía, no a un
sidecar.

### 3. Un día, una página

- `/guia/` muestra el día más reciente.
- `/guia/AAAA-MM-DD/` muestra un día.
- `/guia/futuro/` reúne las ideas que esperan.
- `/guia/normas/` explica cómo se escribe.

La línea del tiempo del header enlaza a esas páginas. Cada página pinta solo su día: la guía no
crece con la historia entera.

### 4. El ADR 0036 queda sustituido en parte

La hoja de ruta dentro del ADR y el índice de fases siguen. Lo que desaparece es el sidecar.

## Consecuencias

- Se borran los 46 sidecars; el sitio pierde esas páginas y gana las de la guía.
- El registro tiene una sola fuente y una sola forma de añadir: un fichero en `entradas/`.
- Los enlaces a `.changelog.md` se reescriben al ADR.
- La guía gana URLs estables por día, con su título y su canonical.

## Alternativas descartadas

- **Mantener los sidecars:** dos registros y dos sitios donde mirar; el ADR 0036 ya avisó de que el
  ADR no debe crecer como un registro.
- **Una guía en una sola página:** crece sin límite y mezcla días que ya no se leen juntos.
- **Pestañas en `/guia/`:** no hay URL por día ni HTML propio; el registro no se puede enlazar.

## Hoja de ruta

### M30 — El changelog es la guía

- [x] Quitar los `<adr>.changelog.md` y sus enlaces.
- [x] Paginar la guía por día: `/guia/`, `/guia/AAAA-MM-DD/`, `/guia/futuro/` y `/guia/normas/`.
- [x] Actualizar el índice, el roadmap, `AGENTS.md` y la ayuda de la guía.
- [x] Validar el build, los enlaces y la publicación.

M30 queda cerrada.
