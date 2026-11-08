---
title: "ADR 0119 — Estanterías laterales y archivadores al centro"
description: "Las estanterías de los ficheros se pegan a las paredes laterales y las hojas van de pie, con la cara al pasillo central. Los archivadores se ordenan en el centro y ganan tapa, zócalo, marco y tirador."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: Estanterías laterales y centro
  order: 119
---

**Estado:** aceptado · **Fecha:** 2026-11-08

**Enmienda** el [ADR 0117](0117-salas-recursivas-y-estanterias.md) y el
[ADR 0118](0118-el-proyecto-tambien-es-una-sala.md): las estanterías dejan el fondo y se reparten por
las paredes laterales; las hojas dejan de mirar a la cámara.

## Contexto

La sala acumulaba todos los ficheros en el fondo y dejaba el centro para los archivadores. El
resultado era un muro de hojas y un pasillo vacío: las paredes laterales no hacían nada y la
distribución no aprovechaba la habitación.

Además, los archivadores eran cubos lisos. La tapa, el zócalo y el tirador no existían, así que
costaba leerlos como muebles y no como bloques de color.

## Decisión

### 1. Estanterías en las paredes laterales

Los ficheros se reparten en dos estanterías, una junto a cada pared lateral:

- la tabla entra desde la pared hacia el centro, no se queda en el fondo;
- dos montantes verticales sujetan cada estantería;
- un listón la ata a la pared;
- el pasillo central queda libre para los archivadores.

La estantería se lee como mobiliario de la pared, no como una pared de hojas.

### 2. Las hojas van de pie

Las hojas dejan de ser carteles orientados a la cámara. Se colocan de pie sobre la tabla, con su
cara mirando al pasillo central y el canto hacia la cámara.

Eso hace que en la vista frontal se vean de canto. Es deliberado: la estantería manda y el giro de
cámara permite mirarlas de frente. Las etiquetas siguen diciendo qué fichero es cada una.

### 3. Archivadores en el centro

Los archivadores ocupan la retícula central:

- hasta cinco van en una fila, todos visibles;
- a partir de seis se reparten en columnas;
- la retícula se centra en X y en Z, sin arrimarse a las estanterías.

La sala crece en ancho para que la fila central y las dos estanterías laterales no se toquen.

### 4. Forma del archivador

Cada archivador gana cuatro detalles, todos de mobiliario y no seleccionables:

- **tapa** superior con un pequeño vuelo;
- **zócalo** inferior;
- **marco** vertical en el frente;
- **tirador** horizontal.

El color del cuerpo sigue siendo el del mapa. Los detalles usan el color de moldura para separar el
mueble del suelo y de la pared.

### 5. Sin cambios de modelo

Todo se deriva del `RenderModel` y del foco actual. No hay lentes nuevas, no se toca `.codarch/` y el
checksum no cambia. Funciona igual en el mapa de código y en el de documentos/configuración.

## Consecuencias

- La sala usa las tres paredes visibles y deja un pasillo central.
- En la vista frontal las hojas laterales se ven de canto; el nombre queda en la etiqueta y el giro
  de cámara permite leerlas.
- Los archivadores se leen como muebles y la fila central no esconde los de atrás cuando hay cinco.
- La sala es más ancha y la cámara se aleja en salas con muchas hojas.
- El pulido de luces, distribución fina y LOD sigue pendiente.

## Alternativas descartadas

- **Mantener la estantería de fondo.** Desaprovecha las paredes laterales y deja el centro solo.
- **Estanterías laterales con hojas mirando a la cámara.** Convierte la pared en un cartel y rompe la
  lectura de estantería.
- **Archivadores en varias filas desde el principio.** La segunda fila queda escondida en la vista
  frontal.
- **Detalles seleccionables.** La tapa y el tirador no son ficheros ni carpetas.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ El proyecto como primera sala.
- ✅ La viga frontal y el letrero con el nombre de la sala.
- ✅ Las estanterías laterales con las hojas de pie.
- ✅ Los archivadores centrados y con tapa, zócalo, marco y tirador.
- 🟡 El pulido de luces, distribución fina y LOD.
- ⬜ La puerta animada de entrada, si se decide.
- ⬜ El editor completo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
