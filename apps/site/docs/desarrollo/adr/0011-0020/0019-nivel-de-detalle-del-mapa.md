---
title: ADR 0019 — Nivel de detalle del mapa
description: "El mapa es un treemap SVG: un nodo por fichero. En un repositorio de 20.000 ficheros eso son 60.000 nodos DOM y diez segundos de JavaScript antes de que se vea nada.…"
section: desarrollo
status: aceptado ✅
date: "2026-10-21"
sidebar:
  label: Nivel de detalle del mapa
  order: 19
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-21

## Contexto

El mapa es un treemap SVG: un nodo por fichero. En un repositorio de 20.000 ficheros eso son
60.000 nodos DOM y diez segundos de JavaScript antes de que se vea nada. Medido en este repo con
un proyecto sintético de 20.000 ficheros:

| etapa | tiempo |
|---|---|
| `JSON.parse` del snapshot (17,8 MB) | 46 ms |
| `parseCcJson` | 31 ms |
| `buildRenderModel` | 91 ms |
| `layoutMap` | 11 ms |
| React + DOM (61.266 nodos) | ~10.000 ms |

El problema no es el modelo: es que 20.000 celdas de un píxel no se leen. Un mosaico de 20.000
rectángulos diminutos no es un mapa, es ruido. A ese tamaño la lectura útil es la de las carpetas.

## Decisión

1. **El mapa se poda por tamaño, no por profundidad.** Un nodo se expande mientras contenga pocos
   ficheros; en cuanto supera el límite, sus hijos se dibujan como bloques y no se entra en ellos.
   La regla es por tamaño porque el tamaño es lo que hace ilegible el mapa, no la profundidad.
2. **Los bloques son interactivos.** Un bloque de carpeta se puede pulsar para entrar: el mapa pasa a
   mostrar el contenido de esa carpeta, y elbreadcrumb permite volver. El modelo sigue teniendo
   todos los ficheros, así que la búsqueda, el inspector y los enlaces siguen llegando a cualquiera.
3. **El mapa lo dice.** Cuando hay ficheros sin dibujar, el pie indica el nivel y cuántos ficheros
   quedan dentro. Nada de ocultar ficheros sin avisar.
4. **El cursor de teclado recorre ficheros y carpetas.** Una carpeta con contenido dibujado es un
   contenedor, no una celda: ocupa el área de sus hijos. Las carpetas hoja sí son celdas, porque en
   un repositorio grande el mapa se dibuja justo a ese nivel.
5. **Menos nodos por celda.** La celda es un `<rect>` con sus atributos; el `<g>` que la envolvía y
   el `<title>` se eliminan. El tooltip solo se dibuja en las celdas con área legible. En el mismo
   proyecto de 20.000 ficheros, los nodos DOM pasan de 61.266 a 672.

## Consecuencias

- Cargar y navegar un repositorio de 20.000 ficheros baja de ~10 s a ~300 ms de JavaScript.
- El mapa de un repositorio grande se lee a nivel de carpeta, que es el nivel útil. Para bajar a
  los ficheros hay que entrar en la carpeta, como en un explorador de archivos.
- El límite de expansión (800 ficheros) es un parámetro de `apps/web/src/detail.ts`; cambiarlo
  cambia el compromiso entre detalle y velocidad.
- Un snapshot con menos de 800 ficheros se dibuja entero, sin cambio de comportamiento.
- La poda no toca el modelo: `cc.json` sigue siendo la verdad y el MCP y el CLI no se ven afectados.

## Alternativas descartadas

- **WebGL o canvas.** Resuelve el render de muchos nodos, pero cambia el motor de render, que es
  compartido con el HTML estático y con el resto de paquetes. Demasiado para un problema que se
  puede resolver con menos nodos y menos celdas.
- **Virtualización por viewport.** El treemap cabe entero en la pantalla: no hay nada fuera del
  viewport que omitir. No aplica.
- **Limitar el número de ficheros del snapshot.** Perdería datos que el MCP y el CLI sí necesitan.
- **Un aviso sin más, sin podar.** El usuario avisado sigue esperando diez segundos. Avisar y
  resolver a la vez.

## Hoja de ruta

Sin fases abiertas; esta decisión se aplica en M5 y M5.1.
