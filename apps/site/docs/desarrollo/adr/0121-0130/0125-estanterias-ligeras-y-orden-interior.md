---
title: "ADR 0125 — Estanterías ligeras y orden interior"
description: "Las tablas de las estanterías se adelgazan y se retrasan. Las hojas se reparten desde el fondo de la tabla hacia el frente para que las tablas no tapen el contenido."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Estanterías ligeras y orden interior
  order: 125
---

**Estado:** aceptado · **Fecha:** 2026-11-09

**Continúa** el [ADR 0120](../0111-0120/0120-estanterias-abiertas-al-frente.md): la estantería ya
estaba abierta; ahora se aligera y cambia el sentido de llenado.

## Contexto

Con la sala profunda, las tablas seguían siendo gruesas y entraban demasiado hacia el pasillo. En la
vista frontal tapaban parte de las hojas. Además, el llenado empezaba en el borde más cercano a la
cámara y avanzaba hacia el fondo, así que el frente se llenaba primero.

## Decisión

### 1. Tablas finas y cortas

La tabla baja de grosor y de vuelo:

- grosor de 0,08;
- profundidad de 1,25 desde la pared;
- sin montantes laterales.

La estantería sigue apoyada en el listón de pared y en su tira de luz, pero deja más hueco para ver
las hojas.

### 2. La estantería se retrasa

El centro de la estantería se coloca hacia la mitad profunda de la sala, no en la boca. La boca queda
libre y la estantería se lee dentro del espacio, no como un mueble pegado a la cámara.

### 3. Se llena desde dentro hacia el frente

Las hojas se ordenan desde el borde interior de la tabla hacia el borde más cercano:

- la primera columna queda al fondo;
- las siguientes avanzan hacia la boca;
- el frente de la tabla queda para las últimas.

Así el hueco de la estantería se llena de dentro afuera, que es el orden natural de una estantería.

### 4. Sin cambios de modelo

Todo se deriva del `RenderModel` y del foco actual. No hay lentes nuevas, no se toca `.codarch/` y el
checksum no cambia.

## Consecuencias

- Las tablas tapan menos y las hojas se leen mejor.
- El frente de la sala queda más despejado.
- La estantería se integra en la profundidad de la sala.
- Las hojas de las primeras columnas quedan más lejos; el giro de cámara y las etiquetas siguen
  siendo la forma de leerlas.

## Alternativas descartadas

- **Dejar las tablas gruesas.** Tapaban las hojas en la vista frontal.
- **Estanterías en la boca.** Llenaban el frente y dejaban el fondo vacío.
- **Llenar de frente hacia dentro.** El frente se saturaba antes.
- **Quitar las tablas.** Las hojas se quedan sin apoyo visual.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ Tablas finas y cortas.
- ✅ Estantería retrasada hacia el interior.
- ✅ Llenado desde el fondo de la tabla hacia el frente.
- 🟡 Pulido de luces y composición fina.
- ⬜ La puerta animada de entrada, si se decide.
- ⬜ El editor completo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
