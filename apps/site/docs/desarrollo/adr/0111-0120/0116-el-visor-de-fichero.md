---
title: "ADR 0116 — El visor de fichero lee por la app"
description: "El Atlas abre una hoja con el mismo lector de código que la ficha. El plugin recibe `readCode` en su contexto; no toca el disco ni mantiene una segunda lectura."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: El visor de fichero
  order: 116
---

**Estado:** aceptado · **Fecha:** 2026-11-08

**Completa** el [ADR 0115](0115-el-atlas-frontal.md): la tercera escala del Atlas es el fichero.

## Contexto

La sala ya muestra las hojas. Al pulsar una, falta enseñar su código. La app ya tiene un lector de
código (`platform.code`) que usan la ficha y el editor de solo lectura; el plugin no debe inventar otra
lectura del disco ni una segunda fuente de verdad.

El visor de la imagen de referencia es un objeto/cubo con código. Para esta fase basta un panel de
solo lectura dentro del Atlas; el editor completo puede llegar después.

## Decisión

### 1. `readCode` en el contexto del plugin

El contrato del [ADR 0028](0021-0030/0028-los-plugins.md) gana una puerta explícita:

```ts
readCode(path: string): Promise<PluginCode | null>;
```

`PluginCode` lleva las líneas, el inicio, el fin y el total. La app lo rellena con el mismo lector que
la ficha; el plugin no accede al sistema de ficheros.

### 2. Panel de solo lectura dentro del Atlas

Al pulsar una hoja, se abre un panel lateral con:

- la ruta del fichero;
- el código con números de línea;
- un botón Cerrar;
- el total de líneas.

No se escribe nada. El panel es del plugin y vive dentro de su escenario; no sustituye al editor de la
app ni añade otro estado al modelo.

### 3. El fichero no cambia el checksum

Leer código no toca el snapshot ni `.codarch/`. El panel es estado de vista y se cierra al cambiar de
sala o de mapa.

### 4. El editor completo, después

Abrir el editor real, editar y guardar es otra decisión: necesita escritura y un contrato distinto. Hoy
el Atlas solo lee.

## Consecuencias

- El plugin puede enseñar código sin duplicar la lectura del proyecto.
- El contexto crece una función, pero sigue siendo pequeño y explícito.
- El visor es de solo lectura y no promete edición.
- La ficha y el Atlas leen exactamente lo mismo.

## Alternativas descartadas

- **Leer del disco desde el plugin.** Duplicaría la fuente y rompería la plataforma web.
- **Abrir el editor de la app al pulsar la hoja.** Cambia de escenario y rompe el viaje del Atlas.
- **Meter un editor completo en este corte.** Añade escritura y permisos antes de validar el visor.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ El contrato `readCode` y el panel de solo lectura.
- ⬜ El editor completo, si se decide.
- ⬜ Etiquetas y pulido de la hoja seleccionada.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
