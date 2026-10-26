---
title: Una sola interfaz
date: "2026-10-26"
category: refactor
verdict: adr
---

**Qué era**: tres interfaces. La web, el escritorio —que comparten `packages/ui`— y un visor HTML escrito a mano en `packages/render/src`, unas 1 660 líneas con su propio CSS, su propio inspector y su propio JavaScript. Ese tercero era lo que `codarch analyze` dejaba en `.codarch/map.html`, lo que producía `codarch render` y lo que la GitHub Action publicaba como artefacto del PR. No tenía Cambios, ni Reglas, ni hablaba con `serve`. Cada mejora de la app real había que decidir si se copiaba allí, y casi siempre no se copiaba: el artefacto del PR enseñaba un producto que ya no existía.

**Qué cambió**: la app web es la única interfaz. Se van `html.ts`, `client.js` y `styles.css`, y `renderHtml` deja de existir como API. `codarch analyze` escribe solo el snapshot y su resumen; lo que se dibuja es cosa de la app. `codarch render <cc.json> -o <carpeta>` copia el build real y deja `data/snapshot.cc.json` a su lado, así que el resultado es un sitio estático que se sirve desde Pages, un `npx serve` o el propio `codarch serve`, sin node ni el CLI. La Action publica esa misma carpeta y su salida `map` apunta al `index.html` del head.

**Números**: unas 1 660 líneas menos, dos tests del visor fuera y dos comandos del build del CLI (`styles.css`, `client.js`) que ya no se copian. Ni `cc.json`, ni el checksum, ni `report.json` cambian. `codarch render` cambia de salida: un `.html` pasa a ser un directorio.

**Veredicto**: [ADR 0073](../../adr/0071-0080/0073-una-sola-interfaz.md), hecho. Queda una línea abierta: al MCP le faltan consultas que el CLI ya tiene, y se añaden como herramientas, no como vistas.
