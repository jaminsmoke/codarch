---
title: "Changelog — ADR 0037 «Los ciclos: de ejecución, no de tipos»"
description: Lo hecho del ADR 0037, por orden. La hoja de ruta y lo abierto viven en el ADR.
section: adr
changelog: true
adr: adr/0031-0040/0037-los-ciclos-de-ejecucion
sidebar:
  label: Changelog
  order: 37.5
---

**Decisión:** [el ADR](0037-los-ciclos-de-ejecucion.md) · **Estado:** aceptado · **Fecha:** 2026-10-23

Este changelog guarda lo que se hizo para esta decisión. La hoja de ruta vive en el
[ADR](0037-los-ciclos-de-ejecucion.md#hoja-de-ruta).

## Lo que se hizo

### El arreglo de los ciclos

**Estado:** cerrado.

- [x] `buildGraph` separa el grafo de imports del de ejecución. `fanIn`/`fanOut` cuentan todos los
  imports; los ciclos, `isCyclic`, `inCycle`, `cycleSize` y `dependencyLevel` salen de
  `weight > typeOnly`. Tests de ciclo runtime, ciclo type-only, arista mixta y self-loop.
- [x] `cycleGroups` y el reporte de ciclos filtran las aristas solo de tipos; el input de
  `sin-ciclos` y el resumen del PR usan el mismo conjunto. Test de base/head con un ciclo de tipos
  que un snapshot antiguo marcaba como ciclo.
- [x] El store del MCP recalcula los ciclos con el mismo filtro; el render deja de inferir un ciclo
  por la sola ida y vuelta y usa `isCyclic` del snapshot. Tests de las consultas y del modelo.
- [x] `docs/model.md`, `docs/rules.md` y `docs/mcp.md` describen la semántica de ejecución.
- [x] Reanálisis de este repo: 233 ficheros, 69 carpetas, 427 aristas y 2 ciclos, los dos fixtures
  (`src/cycle/a.ts ↔ b.ts` y el self-loop de `src/index.ts`); los tres ciclos de producción
  desaparecen. Checksum con `--no-git`: `6e4750fd6e561c070fd5818dc2add9e4`.
- [x] Suite completa: 48 archivos, 351 tests; lint, typecheck, `check:action` y `site:build`.

## Decisiones relacionadas

- [ADR 0011 «Reglas de arquitectura en `.codarch.yml`»](../0011-0020/0011-reglas-de-arquitectura.md)
  — la regla `sin-ciclos` cambia de lectura, no de contrato.
- [ADR 0032 «Las versiones y las actualizaciones»](../0031-0040/0032-las-versiones-y-las-actualizaciones.md)
  — el formato `cc.json` 2.x y su checksum siguen siendo la promesa; este cambio afecta a la
  semántica con la que se derivan los ciclos, no al esquema.
