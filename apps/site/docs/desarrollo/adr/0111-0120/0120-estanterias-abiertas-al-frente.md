---
title: "ADR 0120 — Estanterías abiertas y ordenadas desde el frente"
description: "Las estanterías laterales pierden las tapas y montantes que ocultaban las hojas. Empiezan junto a la boca de la sala y se llenan hacia dentro. Luces laterales y un presupuesto de etiquetas acompañan la lectura."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: Estanterías abiertas al frente
  order: 120
---

**Estado:** aceptado · **Fecha:** 2026-11-08

**Enmienda** el [ADR 0119](0119-estanterias-laterales-y-centro.md): las estanterías quedan abiertas,
sin tapas laterales, y se ordenan desde la boca de la sala hacia dentro.

## Contexto

Las estanterías laterales ya estaban en la pared correcta, pero dos montantes verticales en los
extremos cerraban la estantería y tapaban parte de las hojas. Además, la estantería se colocaba a
media profundidad: el frente de la sala quedaba vacío y las hojas se alejaban de la cámara.

La luz era plana y el número de etiquetas no tenía un techo común para todas las salas.

## Decisión

### 1. Estanterías abiertas

Se retiran los montantes de los extremos y las tapas laterales. La estantería queda formada por:

- una **tabla** que entra desde la pared hacia el centro;
- un **listón** fino pegado a la pared, que la sostiene;
- una **tira de luz** sobre la tabla, que separa la estantería de la pared.

No hay paneles que oculten las hojas desde los lados. El espacio entre tablas queda abierto.

### 2. Del frente hacia dentro

La estantería empieza junto a la **boca de la sala** (`SHELF_FRONT_Z`) y las hojas se ordenan desde
ese punto hacia el fondo:

- la primera columna queda cerca de la cámara;
- las siguientes avanzan hacia dentro;
- las filas suben desde la tabla.

Así el primer golpe de vista tiene las hojas más cerca y la estantería se lee como una secuencia,
no como un bloque lejano.

### 3. Luces laterales

La sala gana dos tiras de luz en las paredes laterales y una luz de estantería por lado. El shader
suma una iluminación de altura suave: las zonas altas no quedan tan planas como el suelo.

### 4. LOD de etiquetas

El presupuesto de etiquetas baja a 64 por sala. La prioridad sigue siendo:

1. el letrero de la viga;
2. el fichero seleccionado;
3. las carpetas;
4. las hojas.

Las hojas que quedan demasiado pequeñas en pantalla siguen ocultando su etiqueta. Es un LOD de
lectura: la geometría no cambia, cambia lo que se intenta leer.

## Consecuencias

- Se ven más hojas y la estantería deja de parecer un mueble cerrado.
- El frente de la sala se usa y la cámara encuentra antes el contenido.
- La luz lateral da volumen a las paredes y a los cantos.
- Las salas con muchas hojas no llenan la pantalla de etiquetas.
- El LOD de geometría (no solo de etiquetas) sigue pendiente.

## Alternativas descartadas

- **Mantener los montantes.** Sostienen, pero tapan y cierran la estantería.
- **Estanterías al fondo.** Vuelven a alejar las hojas de la cámara.
- **Llenar de frente hacia atrás sin orden.** La lectura se vuelve arbitraria.
- **Quitar todas las etiquetas lejanas.** Se pierde la orientación; mejor un presupuesto con
  prioridades.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ Estanterías laterales sin tapas.
- ✅ Hojas ordenadas desde la boca de la sala hacia dentro.
- ✅ Luces laterales y luz de altura en el shader.
- ✅ LOD de etiquetas con prioridad y presupuesto.
- 🟡 LOD de geometría y pulido de distribución.
- ⬜ La puerta animada de entrada, si se decide.
- ⬜ El editor completo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
