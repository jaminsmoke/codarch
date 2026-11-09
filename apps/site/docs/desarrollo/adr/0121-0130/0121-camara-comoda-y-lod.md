---
title: "ADR 0121 — Cámara cómoda y LOD de geometría"
description: "Las salas ganan aire, la cámara tiene botones y atajos para centrar y acercar, y en salas muy cargadas se retiran los detalles pequeños antes que los muebles o las hojas."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Cámara cómoda y LOD
  order: 121
---

**Estado:** aceptado · **Fecha:** 2026-11-09

**Continúa** el [ADR 0120](../0111-0120/0120-estanterias-abiertas-al-frente.md): la estantería ya está abierta y
ordenada; ahora se ajusta el espacio de la sala, el control de cámara y el LOD de geometría.

## Contexto

La sala usaba bien las paredes, pero el encuadre dependía de la rueda y del arrastre. No había una
forma rápida de volver a la vista inicial ni de acercarse sin buscar el ratón. Las salas con muchos
muebles seguían enviando todos los detalles pequeños a la GPU.

El LOD existente era de etiquetas: ocultaba nombres cuando la hoja era pequeña en pantalla. La
geometría no tenía un presupuesto equivalente.

## Decisión

### 1. Más aire en la sala

La sala crece en ancho y fondo, y gana altura mínima:

- más separación entre la fila central y las estanterías laterales;
- más fondo detrás de los archivadores;
- un poco más de altura entre la estantería y la viga.

El objetivo es que los muebles no se toquen y que la cámara tenga sitio para retroceder sin que la
sala parezca un pasillo.

### 2. Cámara a mano

La escena expone dos operaciones nuevas:

- `resetView()`, que vuelve a la vista inicial;
- `zoom(factor)`, que acerca o aleja conservando el objetivo.

La vista incorpora:

- botones **−**, **Centrar** y **+** en el escenario;
- atajos `+` / `-` para acercar y alejar, y `0` o `R` para centrar;
- un `start` con algo más de altura para que la sala se lea desde el primer fotograma.

La rueda, el arrastre y la pinza siguen funcionando.

### 3. LOD de geometría

Los detalles de los archivadores (tapa, zócalo, marco y tirador) se marcan como `detail`.

Cuando una sala supera las 140 cajas, se dejan de dibujar esos detalles antes que los cuerpos de
los archivadores, las hojas o el mobiliario principal. Además, se retiran si la cámara se aleja más
de 1,35 veces la distancia inicial o si se aparta más de 0,65 radianes del frente; al volver, vuelven.

Es un LOD de carga, distancia y ángulo: se recalcula la lista de geometría cuando se cruza un umbral,
no en cada fotograma.

El LOD de etiquetas del ADR 0120 se mantiene: 64 por sala con prioridad para viga, selección,
carpetas y hojas.

### 4. Sin cambios de modelo

Todo se deriva del `RenderModel` y del foco actual. No hay lentes nuevas, no se toca `.codarch/` y el
checksum no cambia. Funciona igual en el mapa de código y en el de documentos/configuración.

## Consecuencias

- La sala es más ancha y más profunda; la cámara puede retroceder sin pegarse a las paredes.
- Centrar y acercar deja de depender de encontrar la rueda o el punto exacto del arrastre.
- Las salas muy cargadas pierden detalle decorativo, no contenido.
- El LOD de geometría responde a la carga de la sala, a la distancia y al ángulo de cámara.

## Alternativas descartadas

- **Solo rueda y arrastre.** Es más lento en pantallas táctiles y en repos grandes.
- **Añadir más detalle siempre.** Aumenta instancias sin mejorar la lectura de una sala cargada.
- **Quitar hojas para aligerar.** El contenido no es prescindible; el detalle decorativo sí.
- **Un LOD por ángulo.** Necesita más cálculo y no aporta tanto como la carga y la distancia.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ Más aire en la sala.
- ✅ Botones y atajos de cámara.
- ✅ LOD por carga, distancia y ángulo para detalles de archivador.
- 🟡 Distribución fina del pasillo.
- ⬜ La puerta animada de entrada, si se decide.
- ⬜ El editor completo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
