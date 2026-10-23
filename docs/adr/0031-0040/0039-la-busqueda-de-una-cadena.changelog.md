---
title: "Changelog — ADR 0039 «La búsqueda de una cadena: símbolos, no nodos»"
description: Lo hecho del ADR 0039, por orden. La hoja de ruta y lo abierto viven en el ADR.
section: adr
changelog: true
adr: adr/0031-0040/0039-la-busqueda-de-una-cadena
sidebar:
  label: Changelog
  order: 39.5
---

**Decisión:** [el ADR](0039-la-busqueda-de-una-cadena.md) · **Estado:** aceptado · **Fecha:** 2026-10-23

Este changelog guarda lo que se hizo para esta decisión. La hoja de ruta vive en el
[ADR](0039-la-busqueda-de-una-cadena.md#hoja-de-ruta).

## Lo que se hizo

- **La cadena y el calor conservan el tipo.** `LiveNode` lleva el `kind` del símbolo; la cadena
  nace con él y lo actualiza al emparejar versiones. `summarizeChains` lo repite en el calor, así
  que una clase o una interfaz ya no se presentan como funciones. Tests en
  `packages/schema/test/chains.test.ts`.
- **La búsqueda es de símbolos y por toda su vida.** `findSymbolChains` filtra el nivel `symbol` y
  compara el nombre y la ruta actuales y los de cada versión. Un renombrado o una mudanza se
  encuentran por el nombre o la ruta antiguos. `chainsPayload` devuelve el calor sin símbolo,
  ignora los símbolos vacíos y respeta un `limit` de hasta 50. Tests de nombre antiguo, nivel,
  calor sin símbolo y límite por encima de 20.
- **El libro mayor se rehace.** La versión del artefacto derivado sube a 2 para no reutilizar los
  `kind: "function"` calculados antes del arreglo. El snapshot y el checksum no cambian.
- **MCP.** `get_symbol_chain` ya no rechaza la llamada sin `symbol`: devuelve el calor y ninguna
  cadena. Pasa el límite al payload y la descripción de la herramienta y del parámetro explican
  las dos formas. Tests en `apps/mcp/test/mcp.test.ts`.
- **CLI.** `codarch chain <símbolo>` usa la misma búsqueda de símbolos, con nombres y rutas
  antiguos; sin símbolo sigue listando todos los niveles.
- **Documentos.** `docs/mcp.md` y la guía describen el contrato nuevo.

## Verificación

- `npx vitest run`: 49 ficheros, 367 tests.
- `npm run lint`, `npm run typecheck`, `npm run check:action`, `npm run site:build` y
  `npm run web:build`: en verde.
- El build web sigue avisando de `node:fs`/`node:path` externalizados por
  `history-store.ts` y `chain-store.ts`; es el siguiente punto de la auditoría, no una regresión
  de esta decisión.

## Decisiones relacionadas

- [ADR 0026 — La vida de un símbolo: la cadena que sobrevive al renombrado](../0021-0030/0026-la-vida-de-un-simbolo.md)
  — la cadena ya existía; esta decisión arregla cómo se busca y cómo se presenta.
- [ADR 0038 — El alcance del análisis se declara en `.codarch.yml`](0038-el-alcance-del-analisis.md)
  — el alcance no cambia; el historial y las cadenas se leen igual.
