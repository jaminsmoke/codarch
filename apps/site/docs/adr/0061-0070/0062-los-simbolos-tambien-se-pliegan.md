---
title: ADR 0062 — Los símbolos también se pliegan
description: "La ficha del fichero deja de cortar los símbolos en doce: la sección se pliega como Métricas, enseña todos, cuenta cuántos son y resume la complejidad máxima cuando está cerrada."
section: adr
status: aceptado
date: "2026-10-25"
sidebar:
  label: Los símbolos también se pliegan
  order: 62
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

La ficha del fichero ya tenía una sección plegable (**Métricas**, ADR 0061),
pero la de símbolos seguía contando otra historia: un `eyebrow` en mayúsculas,
doce filas y un `y N más` que escondía el resto. Un fichero como
`apps/mcp/src/tools.ts` tiene cincuenta símbolos; la ficha enseñaba doce y
prometía los demás sin dar forma de verlos. Para colmo, el patrón visual no
coincidía: una sección con título en negrita y otra con rótulo mono.

El símbolo es la unidad con la que se navega al detalle: pulsar una fila abre su
vida a través de los commits. Esconderlos tras una elipsis corta justo la
entrada a esa lente.

## Decisión

La ficha estandariza sus secciones y **los símbolos dejan de truncarse** (M42).

1. **Todos los símbolos.** Se elimina el corte en doce y el `y N más`. La lista
   enseña cada símbolo del fichero, en el orden que ya trae el modelo: del más
   complejo al más simple y, a igual complejidad, por línea.
2. **La misma sección plegable que Métricas.** Título en negrita, cuenta al
   lado, chevron y `aria-expanded` / `aria-controls`. El estado se guarda en
   `codarch:section:file-symbols` y se recuerda entre ficheros, pestañas y
   sesiones.
3. **El resumen dice lo que no se ve.** Cerrada, la sección enseña la
   complejidad del símbolo más pesado (`complejidad máx. 15`); si ningún
   símbolo la trae, lo dice (`sin complejidad`). La cuenta ya está en el título.
4. **La fila sigue siendo la entrada a la cadena.** Cada símbolo conserva su
   tipo, su nombre y su complejidad, y el tooltip añade la línea. Pulsarlo abre
   su vida; el seleccionado se marca como antes.
5. **Una nota breve explica el orden** y la acción, igual que la nota de la
   tabla de métricas. Sin notas, el orden por complejidad parecería arbitrario.

**La regla que queda:** una sección de la ficha no esconde datos con una
elipsis. Si hay mucho, se pliega; si se abre, se ve entero. El mismo componente
servirá para la vida del símbolo y las demás secciones que se vayan
estandarizando.

**Lo que no cambia:** ni `cc.json`, ni el checksum, ni el `report.json`, ni el
orden de `symbolsOf`. Solo cambia lo que la ficha enseña y cómo se pliega.

## Consecuencias

- La ficha de un fichero grande puede ser larga con todo abierto, pero deja de
  mentir: no hay símbolos inalcanzables y la sección se cierra en un clic.
- El estado plegado es global a la sección, no por fichero, como en Métricas.
- Las dos secciones hablan el mismo idioma visual: título, cuenta, resumen y
  chevron.
- Abrir un símbolo desde una lista completa mantiene la cadena y el resaltado
  sin depender de que estuviera entre los doce primeros.
- Queda abierto un filtro por nombre cuando la lista sea muy larga, agrupar por
  tipo y llevar el mismo patrón a la vida del símbolo y a las fichas del
  reporte.

## Alternativas descartadas

- **Subir el corte de doce a cincuenta.** Vuelve el mismo problema con otro
  número; siempre habrá un fichero que lo pase.
- **Dejar el `y N más` como enlace.** Es un segundo mecanismo para lo mismo:
  plegar. La sección ya resuelve el alto.
- **Plegar la sección por defecto.** Escondería los símbolos de todos los
  ficheros, no solo de los grandes. Se abren por defecto y quien quiera los
  cierra; el estado se recuerda.
- **Una lista con scroll interno.** Un scroll dentro del scroll del inspector
  es peor que plegar la sección entera.

## Hoja de ruta

### M42 - La ficha no esconde símbolos

- [x] Los símbolos usan `CollapsibleSection`, como las métricas.
- [x] Fuera el corte en doce y el `y N más`: se enseñan todos.
- [x] Cuenta en el título y resumen de complejidad máxima al cerrar.
- [x] Tooltip con la línea y nota con el orden y la acción.
- [x] Estado plegado recordado en el almacenamiento local.
- [ ] Un filtro por nombre si un fichero trae una lista enorme.

Agrupar por tipo ya está hecho en la M43, y llevar la tabla y los pliegues a la vida del símbolo y a
la ficha del reporte es la M49 ([ADR 0061](0061-el-marco-del-proyecto.md#hoja-de-ruta)).

El registro de lo hecho vive en el [feed de la guía](/guia/).
