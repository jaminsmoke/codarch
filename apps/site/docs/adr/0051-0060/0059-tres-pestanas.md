---
title: ADR 0059 — Tres pestañas y adiós al nombre PR
description: "El inspector queda en Fichero, Reglas y Cambios: las lentes del fichero pasan a ser la primera mitad de Reglas y la pestaña PR se llama Cambios para no sugerir un pull request. tab=rules y tab=changes viajan en la URL; lenses y pr se siguen leyendo como alias."
section: adr
status: aceptado
date: "2026-10-25"
sidebar:
  label: Tres pestañas y adiós al nombre PR
  order: 59
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

El ADR 0058 dejó cuatro pestañas y prometió el siguiente corte: las **lentes**
dentro de **Reglas**. Tenía sentido. Las dos hablan de lo mismo desde dos
escalas: la lente explica por qué un fichero tiene el riesgo que tiene y qué
reglas toca; Reglas cuenta qué rompe el cambio entero. Tenerlas separadas
obligaba a saltar de pestaña para responder una sola pregunta: *¿qué le pasa a
este fichero y qué rompe?*

La cuarta pestaña tenía además un nombre prestado: **PR**, de *pull request*.
CodArch compara dos snapshots —con git o sin él, en local o en CI— y no sabe si
hay una pull request abierta ni si está pendiente de mergear. El nombre prometía
un flujo de revisión que la app no tiene.

## Decisión

El inspector se queda en **tres pestañas**: **Fichero**, **Reglas** y
**Cambios**.

1. **Reglas** es una sola lectura en dos escalas. Arriba, el fichero
   seleccionado: riesgo con sus señales y pesos, reglas de dominio que toca,
   migración con su deuda y cruces FFI, y símbolos. Abajo, el cambio: nuevas,
   existentes y resueltas, errores y avisos, reglas y capas, origen, hotspots.
   Cuando no hay celda elegida, la parte del fichero explica qué aparecerá ahí.
2. **La pestaña Lentes desaparece.** Su contenido no se pierde: es la primera
   mitad de Reglas. Los enlaces y las vistas guardadas con `tab=lenses` se leen
   como `tab=rules`.
3. **PR pasa a llamarse Cambios.** El reporte enseña qué se ha movido entre
   base y head; no afirma nada sobre una revisión pendiente. En la URL el valor
   canónico es `tab=changes`; `tab=pr` se sigue leyendo y se reescribe al
   nombre nuevo. Las vistas de addon hacen lo mismo: `lenses` → `rules` y
   `pr` → `changes` al cargarlas.
4. **El orden es el de la lectura.** Primero el fichero (donde el usuario acaba
   de hacer clic en el mapa), después el cambio. El botón de abrir reporte vive
   en la parte del cambio y no secuestra la pestaña: si se carga desde Reglas,
   se queda en Reglas.

**Lo que no cambia:** ni `cc.json`, ni el checksum, ni el `report.json`. La
pestaña sigue leyendo lo que ya existe.

## Consecuencias

- Tres pestañas en vez de cuatro; cada una con un trabajo claro.
- Desaparece la palabra PR de la UI y del estado de vista. El código también:
  `PrPanel` es `ChangesPanel` y las clases `pr-*` pasan a `change-*`.
- La API de plugins y las vistas guardadas aceptan los nombres nuevos; los
  viejos se traducen, así que nada se rompe.
- Reglas es más larga que antes, pero ya no hay que cambiar de pestaña para
  cruzar el fichero con el cambio. La lista del fichero corta a ocho filas y la
  del cambio a veinticinco, y las dos lo dicen.
- Tests: `tab=changes`, los alias `lenses` y `pr`, y las vistas de addon
  normalizadas.

## Alternativas descartadas

- **Llamar a la pestaña Git.** El reporte no es un objeto de git: sale de dos
  snapshots y funciona sin repositorio. Git habría cambiado una confusión por
  otra.
- **Llamarla Revisión.** Sugiere aprobar o pedir cambios, y aquí no hay flujo
  de revisión: hay un diff.
- **Dejar las lentes como pestaña y solo renombrar PR.** Mantenía el salto
  entre escalas que este corte venía a quitar.
- **Romper los enlaces viejos.** `tab=pr` y `tab=lenses` están en tickets y
  vistas guardadas; traducirlos cuesta una línea y no obliga a nadie a
  actualizar nada.

## Hoja de ruta

### M39 - Tres pestañas

- [x] Lentes dentro de Reglas, con el fichero seleccionado como contexto.
- [x] Tres pestañas: Fichero, Reglas y Cambios.
- [x] PR se llama Cambios, en la UI, en la URL y en el código.
- [x] `tab=changes` canónico y alias `lenses`/`pr` al leer.
- [x] Vistas de addon y API de plugins con los nombres nuevos.
- [ ] Hacer que la parte del fichero recuerde su última sección abierta al
  cambiar de celda (hoy vuelve arriba).
- [ ] Enseñar también las reglas configuradas que no se violan: el reporte solo
  lleva violaciones y haría falta el catálogo (sigue abierto en el ADR 0058).
- [ ] Filtrar por severidad u origen y buscar una regla por nombre (ADR 0058).

El registro de lo hecho vive en el [feed de la guía](/guia/).
