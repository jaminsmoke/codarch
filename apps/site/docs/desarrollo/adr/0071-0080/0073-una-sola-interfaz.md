---
title: "ADR 0073 — Una sola interfaz"
description: "El visor HTML autocontenido desaparece: la app web es la única interfaz, y el CLI y la Action publican su build junto al snapshot en vez de un mapa aparte."
section: desarrollo
status: aceptado
date: "2026-10-26"
sidebar:
  label: Una sola interfaz
  order: 73
---

**Estado:** aceptado · **Fecha:** 2026-10-26

## Contexto

El producto tiene **tres** interfaces dibujadas por separado:

- `apps/web`, React, con mapa, inspector, Cambios y Reglas.
- `apps/desktop`, Electron, que comparte `packages/ui` con la web (ADR 0043).
- `packages/render/src/html.ts` con `client.js` y `styles.css`: un visor HTML
  **escrito a mano** de unas 1 660 líneas, con su propio CSS, su propio inspector y su propio
  JavaScript. No tiene Cambios, ni Reglas, ni habla con `serve`.

Ese tercero es lo que `codarch analyze` deja en `.codarch/map.html`, lo que produce
`codarch render` y lo que la GitHub Action publica como artefacto del PR. Es una interfaz paralela que
se mantiene aparte: cada arreglo o mejora de la app real hay que decidir si se copia allí, y casi
siempre no se copia, así que el artefacto del PR enseña un producto que ya no es el que existe.

Además, que el artefacto sea un `.html` suelto obliga a mantener un visor estático para siempre,
aunque la app real ya sepa abrirse sin servidor: lee `data/snapshot.cc.json` si está a su lado y se
sirve desde cualquier estático.

## Decisión

1. **La app web es la única interfaz.** El escritorio la comparte por `packages/ui`; no hay una
   tercera. Se eliminan `packages/render/src/html.ts`, `client.js` y `styles.css`, y `renderHtml`
   deja de existir como API.
2. **`codarch analyze` deja de escribir `map.html`.** Su salida es el snapshot y su resumen. Lo que se
   dibuja es cosa de la app, no del análisis.
3. **`codarch render` publica la app real.** Recibe un `cc.json` y un directorio, copia allí el build de
   la app web y escribe `data/snapshot.cc.json` a su lado. El resultado es un sitio estático: se sirve
   desde cualquier sitio (Pages, `npx serve`, el propio `codarch serve`) sin node ni el CLI. No se abre
   con doble clic porque el build es ESM y el navegador lo bloquea desde `file://`.
4. **La GitHub Action publica esa misma carpeta** como artefacto, en vez de un `map.html`. El PR
   enseña el mismo producto que el usuario tiene instalado.
5. **El MCP sigue siendo una API**, no una interfaz: sus consultas no se duplican como pantallas. Las
   funciones que le falten frente al CLI se añaden como herramientas, no como vistas.

## Consecuencias

- Una sola interfaz que mantener. Un arreglo en `packages/ui` llega a web, escritorio y al artefacto del
  PR a la vez.
- El artefacto del PR deja de ser un fichero único: es una carpeta (build + `data/`). Se descarga y
  se sirve con cualquier estático; ya no se abre con doble clic.
- `codarch render` cambia de salida: un `.html` pasa a ser un directorio. Es un cambio incompatible para
  quien lo usara; se documenta en el README y en la ayuda del comando.
- Se van unas 1 660 líneas y dos tests que solo probaban el visor.
- El build del CLI deja de incluir `styles.css` y `client.js`.

## Alternativas descartadas

- **Mantener el visor congelado.** Menos riesgo hoy, pero deja dos productos y el artefacto del PR
  seguiría enseñando algo distinto de la app.
- **Generar el visor desde `packages/ui`.** Sería una sola fuente, pero exige compilar la app a un
  fichero autocontenido para un caso que el build estático ya resuelve con una carpeta.
- **Servir la app desde la Action.** La Action no tiene servidor: su artefacto es un fichero que se
  descarga. Un build estático sí encaja.

## Hoja de ruta

### M54 — Una sola interfaz

- [x] La app web es la única interfaz; el visor HTML se elimina.
- [x] `codarch analyze` deja de escribir `map.html`.
- [x] `codarch render` publica el build de la app web junto al snapshot.
- [x] La Action publica esa carpeta como artefacto.
- [x] El MCP gana las consultas que hoy solo tiene el CLI: `suggest_architecture`, `list_profiles` y
      `verify_history` (ADR 0074).

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
