---
title: "ADR 0127 — Paneles enfocables y texto contenido"
description: "El texto del cartel y de la tabla se recorta y escala dentro de su panel. Pulsar la pantalla de métricas hace que la cámara viaje suavemente hasta encuadrarla; Centrar vuelve a la sala."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Paneles enfocables
  order: 127
---

**Estado:** aceptado · **Fecha:** 2026-11-09

**Continúa** el [ADR 0126](0126-pared-de-metricas.md): la tabla ya existe; ahora se comporta como una
pantalla de la sala.

## Contexto

El cartel y la tabla se dibujaban como etiquetas de canvas sobre la escena. El texto podía salirse del
panel y no formaba parte de él. Además, la pantalla de métricas no se podía seleccionar: no había una
forma directa de acercarse a leerla.

## Decisión

### 1. Texto dentro del panel

El texto del cartel y de la tabla se dibuja con un rectángulo de recorte calculado a partir de las
cuatro esquinas del panel proyectadas a pantalla. La tipografía de la tabla se adapta al tamaño del
panel: crece al acercarse y se reduce al alejarse.

El texto deja de ser una etiqueta flotante: no puede salirse del monitor.

### 2. La pantalla de métricas es seleccionable

La pantalla de métricas se puede pulsar. Al hacerlo:

- la cámara viaja suavemente hasta encuadrar el panel;
- el panel queda centrado en la vista;
- el resto de la sala se sale del encuadre para dejar leer la tabla.

El cartel del nombre sigue sin ser seleccionable.

### 3. Volver a la sala

`Centrar` (o `0` / `R`) vuelve a la vista general de la sala. El viaje al panel usa el mismo mecanismo
de vuelo que las carpetas, así que las transiciones de cámara quedan preparadas para más focos.

### 4. Sin cambios de modelo

No hay lentes nuevas, no se toca `.codarch/` y el checksum no cambia.

## Consecuencias

- El texto pertenece al panel y no se desborda.
- La tabla se puede leer de cerca con un clic.
- Las transiciones de cámara ganan un caso de uso reutilizable.
- El texto de la tabla se trunca si el panel es pequeño; el foco permite leerlo entero.

## Alternativas descartadas

- **Texto siempre a tamaño fijo.** Al acercarse seguía siendo diminuto y parecía HUD.
- **Panel no seleccionable.** Obliga a orbitar y acercar a mano.
- **Cuatro paneles.** Más superficie y más ruido; una pantalla con tabla basta.
- **Cambiar el modelo para llevar las métricas.** La tabla se calcula desde los ficheros.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ Texto recortado y escalado dentro del panel.
- ✅ Pantalla de métricas enfocable con vuelo de cámara.
- ✅ Centrar devuelve a la sala.
- 🟡 Más focos de cámara en partes de la sala.
- ⬜ La puerta animada de entrada, si se decide.
- ⬜ El editor completo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
