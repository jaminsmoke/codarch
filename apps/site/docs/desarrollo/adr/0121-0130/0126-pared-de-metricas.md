---
title: "ADR 0126 — La pared de métricas"
description: "La pared de fondo gana una pantalla alargada con las métricas del ámbito abierto: el proyecto en la raíz y la carpeta dentro de una sala."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: La pared de métricas
  order: 126
---

**Estado:** aceptado · **Fecha:** 2026-11-09

**Continúa** el [ADR 0124](0124-cartel-de-fondo-y-nombre-del-proyecto.md): la pared de fondo ya lleva
el nombre; ahora también enseña las cifras.

## Contexto

Las métricas vivían en el inspector, fuera de la escena. La pared de fondo, en cambio, estaba vacía
por encima del cartel y los archivadores. El usuario tenía que salir de la sala para saber cuántos
ficheros o qué riesgo estaba viendo.

## Decisión

### 1. Una pantalla alargada sobre el cartel

La pared de fondo lleva una pantalla horizontal centrada sobre el cartel:

- un marco de moldura;
- una tabla de cuatro filas;
- texto centrado, legible sobre el fondo oscuro;
- no seleccionable.

No es un panel del HUD: está montada en la pared, como el cartel.

### 2. Métricas del ámbito abierto

La tabla se calcula con los ficheros del foco actual:

- **Ficheros**: ficheros del ámbito;
- **Carpetas**: subcarpetas del ámbito;
- **Riesgo**: riesgo máximo;
- **Área**: suma de la métrica de área del modelo.

En la raíz son las cifras del proyecto; dentro de una carpeta, las de esa carpeta y sus descendientes.
No se inventan valores ni se cambia el checksum: todo sale del `RenderModel`.

### 3. Una tabla, no cuatro carteles

Se prefiere una sola pantalla con filas a cuatro paneles pequeños. Así el texto no compite con las
etiquetas de los ficheros y las cifras se leen de un vistazo.

## Consecuencias

- Las métricas del ámbito se ven dentro de la sala.
- La pared de fondo gana una función, no solo decoración.
- La tabla usa una tipografía menor y no debe crecer sin control; los nombres largos se truncan.
- El inspector sigue siendo la fuente para el detalle completo.

## Alternativas descartadas

- **Cuatro paneles pequeños.** Las etiquetas se pisaban en la vista frontal.
- **Métricas solo en el HUD.** Obligan a salir de la escena.
- **Un panel por cada fichero.** Convierte la pared en una tabla de datos y tapa la arquitectura.
- **Cifras inventadas o derivadas de la cámara.** El checksum no debe depender de la vista.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ Pantalla de métricas en la pared de fondo.
- ✅ Cifras del proyecto en la raíz y de la carpeta en su sala.
- 🟡 Tabla adaptable a nombres largos y más composición fina.
- ⬜ La puerta animada de entrada, si se decide.
- ⬜ El editor completo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
