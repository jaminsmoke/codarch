---
title: "ADR 0130 — Composición interior y foco de selección"
description: "La sala se ajusta a su contenido, la selección de carpeta también se pinta y un fichero seleccionado enfoca la cámara con contexto."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Composición interior
  order: 130
---

**Estado:** aceptado · **Fecha:** 2026-11-09

**Continúa** el [ADR 0129](0129-esquinas-de-la-sala.md): las esquinas ya cierran; ahora se ajusta lo
que hay dentro y cómo responde la cámara a una selección.

## Contexto

Con pocos ficheros, la sala conservaba una altura y una planta de sala grande: las estanterías
quedaban pequeñas en una pared vacía. La selección de carpeta no se veía en el 3D y seleccionar una
hoja no acercaba la cámara a su estante.

## Decisión

### 1. La sala se ajusta al contenido

- La altura mínima baja a 15 unidades; crece con las filas de hojas y con los archivadores.
- Las estanterías usan como máximo tres columnas por lado, de modo que ganan filas y presencia
  vertical en vez de quedarse como una tabla baja.
- El cartel y la tabla bajan con la pared; la tabla sigue encima del cartel y conserva su lectura.

### 2. La estructura se detalla

- Montantes en los extremos de cada estantería y remate superior.
- Moldura horizontal en las paredes laterales y en la de fondo.
- Columnas de remate en la boca y umbral de entrada en el suelo.
- Luz de pared sobre la tabla de métricas.

Son detalles de composición: no cambian el modelo ni la interacción.

### 3. La carpeta seleccionada se pinta

El contexto del plugin expone `selectedFolder`, igual que ya exponía el fichero seleccionado. Un clic
en una carpeta la selecciona en la ficha **y** la resalta en la sala, sin entrar.

### 4. Un fichero seleccionado enfoca con contexto

Un clic en una hoja la selecciona y vuela a su estante con distancia suficiente para ver la hoja, la
estantería y la pared. No abre el visor: eso sigue siendo el doble clic. El vuelo no es un zoom
pegado a la hoja; mantiene la lectura de la sala.

## Consecuencias

- Las salas con pocos ficheros dejan de tener una pared alta y vacía.
- La selección de carpeta tiene respuesta visual inmediata.
- El foco de fichero conserva el contexto de la estantería.
- El modelo, el checksum y `.codarch/` no cambian.

## Alternativas descartadas

- **Mantener la altura fija y añadir decoración.** Llena el hueco sin resolver la escala.
- **Estanterías de una sola fila.** Las hojas se pierden en una sala grande.
- **No pintar la carpeta seleccionada.** La ficha cambia, pero el 3D no responde.
- **Enfocar la hoja hasta llenar la pantalla.** Se pierde la estantería y la pared.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ Altura y estanterías ajustadas al contenido.
- ✅ Detalles de estructura, molduras y umbral.
- ✅ Selección de carpeta pintada.
- ✅ Foco de fichero con contexto.
- 🟡 Más composición y luces en salas grandes.
- ⬜ La puerta animada de entrada, si se decide.
- ⬜ El editor completo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
