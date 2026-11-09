---
title: "ADR 0128 — Un clic selecciona, dos entran"
description: "Un clic selecciona ficheros o carpetas; el doble clic entra en la carpeta o abre la hoja. La cámara se limita a un arco frontal para no salir de la sala."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Selección y cámara
  order: 128
---

**Estado:** aceptado · **Fecha:** 2026-11-09

**Continúa** el [ADR 0127](0127-paneles-enfocables.md): el panel ya vuela; ahora se fija el gesto de
selección y el arco de cámara.

## Contexto

Entrar en una carpeta con un solo clic impedía seleccionarla sin abandonar la sala. Además, la cámara
podía orbitar por detrás de las paredes, donde ya no hay sala que mirar.

## Decisión

### 1. Un clic selecciona

- Un clic en una **carpeta** la selecciona; no cambia de sala.
- Un clic en una **hoja** selecciona el fichero; no abre el visor.
- El panel de métricas conserva su clic directo: es una pantalla, no una carpeta.

### 2. Dos clics viajan o abren

- Doble clic en una **carpeta**: viaja a su sala recursiva.
- Doble clic en una **hoja**: abre el visor de código.
- El vuelo de carpeta es el mismo de antes; el visor queda para el segundo gesto.

### 3. La cámara no sale del arco frontal

La órbita se limita a un arco alrededor del frente de la sala (`π ± 1,15` rad) y a una distancia
máxima. La cámara puede mirar de lado para leer las estanterías, pero no cruza la pared de fondo ni se
va detrás de la escena.

`Centrar` vuelve a la vista general.

### 4. Sin cambios de modelo

No hay lentes nuevas, no se toca `.codarch/` y el checksum no cambia.

## Consecuencias

- La selección deja de mezclarse con la navegación.
- La cámara no descubre el exterior de la sala.
- El doble clic es ahora el gesto de profundidad.
- El panel de métricas sigue siendo la excepción de un clic, porque su función es enfocar.

## Alternativas descartadas

- **Un clic entra.** No se puede seleccionar una carpeta sin cambiar de foco.
- **Un clic abre el visor.** La selección y la lectura compiten.
- **Órbita completa.** La cámara sale de la sala y aparecen paredes por fuera.
- **Sin límite de distancia.** La escena se aleja hasta perder el panel y la tabla.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ Un clic selecciona; doble clic entra o abre.
- ✅ Arco frontal y distancia máxima de cámara.
- ✅ El panel de métricas conserva su foco con un clic.
- 🟡 Más focos de cámara en partes de la sala.
- ⬜ La puerta animada de entrada, si se decide.
- ⬜ El editor completo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
