---
title: "ADR 0129 — Las esquinas de la sala"
description: "Las paredes laterales y la de fondo comparten ancho y cierre. Las columnas de esquina tapan la junta y el suelo deja de sobresalir."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Las esquinas de la sala
  order: 129
---

**Estado:** aceptado · **Fecha:** 2026-11-09

**Continúa** el [ADR 0128](0128-seleccion-y-camara.md): la cámara ya no sale; ahora la estructura
tiene que cerrar bien.

## Contexto

La pared de fondo era más ancha que la unión de las paredes laterales. En las esquinas se veía el
desajuste y el suelo sobresalía por fuera de la estructura. La sala parecía hecha de piezas distintas.

## Decisión

### 1. Un mismo ancho de cierre

La pared de fondo comparte el ancho exterior de las paredes laterales. Las tres paredes terminan en el
mismo plano y en la misma esquina.

### 2. Columnas de esquina

Cada esquina de fondo lleva una columna de moldura. No es decoración: tapa la junta entre las dos
paredes y da un cierre claro a la estructura.

### 3. Suelo contenido

El suelo se ajusta al ancho de las paredes. Ya no sobresale por fuera; la sala se lee como un volumen
cerrado por abajo y abierto por arriba.

### 4. Cámara

Se mantiene el arco frontal y el límite de distancia del ADR 0128. La estructura nueva no amplía el
recorrido de cámara.

## Consecuencias

- Las esquinas se leen como una sola estructura.
- El suelo no compite con las paredes.
- La columna de esquina refuerza la profundidad y la luz lateral.
- El frente sigue abierto; no se añade pared frontal.

## Alternativas descartadas

- **Dejar la pared de fondo más ancha.** Es el desajuste que se quiere corregir.
- **Tapar la esquina con un panel pegado.** Se ve como un parche.
- **Cerrar el frente para cuadrar la caja.** Tapa la sala y rompe la vista.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ Paredes laterales y de fondo con el mismo cierre.
- ✅ Columnas de esquina.
- ✅ Suelo contenido.
- 🟡 Pulido de luces y composición interior.
- ⬜ La puerta animada de entrada, si se decide.
- ⬜ El editor completo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
