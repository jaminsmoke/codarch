---
title: "ADR 0069 — Dos pestañas: el fichero y el cambio"
description: "Reglas se parte por su escala: el riesgo, las reglas de dominio y la migración del fichero pasan a la ficha, el estado de reglas del cambio se funde en Cambios y el panel derecho se queda en Fichero y Cambios. tab=rules y tab=lenses se leen como tab=changes."
section: adr
status: aceptado
date: "2026-10-25"
sidebar:
  label: Dos pestañas, el fichero y el cambio
  order: 69
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

El ADR 0059 juntó las lentes del fichero con las reglas del cambio en una sola pestaña, **Reglas**,
con el argumento de que las dos hablan del mismo asunto desde dos escalas. Un día después, la propia
pestaña enseña el problema: **no es una escala, son dos**, y cada una pertenece a un sitio distinto.

- Arriba, el fichero seleccionado: riesgo con sus señales, reglas de dominio que toca, migración con
  su deuda y sus cruces, y un resumen de símbolos. Todo eso **ya está en Fichero**: el riesgo es una
  fila de Métricas, los símbolos son la sección Símbolos, la deuda y los cruces son filas de la
  misma tabla. La pestaña repetía datos y el usuario tenía que elegir cuál de las dos copias mirar.
- Abajo, el cambio: violaciones nuevas, existentes y resueltas de todo el repo, errores y avisos,
  reglas y capas evaluadas, perfil y origen, y los hotspots. Eso **no es del fichero**: es del diff,
  igual que **Cambios**, que ya cuenta hotspots y deuda de migración pero sin las listas.

Una pestaña que mezcla dos escalas obliga a saltar igual: para saber qué reglas toca el fichero hay
que estar en Reglas aunque el resto del fichero esté en Fichero, y para leer las violaciones del
cambio hay que salir de Cambios. El corte de 0059 cambió un salto por otro.

## Decisión

El panel derecho se queda en **dos pestañas: Fichero y Cambios**, y cada dato vive **una sola vez**,
en la escala a la que pertenece.

1. **Fichero absorbe su lente, sin repetir la tabla.** Dentro de **Métricas**, después de la tabla,
   un desglose del riesgo con sus tres señales, sus pesos y el p95: el valor ya está en la fila del
   riesgo, así que aquí solo se explica de dónde sale. El resumen de símbolos de la lente se retira:
   la sección **Símbolos** ya cuenta y ordena. Inmediatamente después de **Métricas** nace **Reglas**,
   una sola sección con dos subsecciones: **Dominio** —las reglas que toca este fichero, con el
   reparto de nuevas y existentes en su cabecera— y **Deuda de migración** —los cruces FFI con nombre
   y la fórmula—.
   Van juntas porque ninguna de las dos sale del fichero a secas: una viene del reporte del diff y la
   otra de su lente, y las dos contestan qué le pide el proyecto a este código. Sueltas, la segunda
   caía entre **Dependencias** y **Miembros**, lejos de la primera y sin decir que hablaban de lo
   mismo. Los números de deuda y cruces se quedan en la tabla, no se repiten; si no hay reporte ni
   deuda, la sección no se pinta.
2. **Cambios absorbe el estado de reglas del cambio.** Una sección **Reglas** con el resumen (reglas,
   capas, perfil y origen), las tres listas —nuevas, existentes, resueltas— y el aviso de reporte sin
   configuración. Los hotspots dejan de ser solo una cifra: pasan a tener su lista, como los ficheros
   modificados. El botón **Abrir reporte** queda solo aquí, que es donde ya estaba. Todos sus bloques
   —reglas, hotspots, migración, símbolos, ciclos y ficheros— son secciones plegables con su punto de
   color, su cuenta y un resumen que dice lo importante cuando están cerradas: el panel entero cabe en
   una pantalla y deja de ser un scroll largo.
3. **La pestaña Reglas desaparece.** `tab=rules` y el viejo `tab=lenses` se leen como `tab=changes`:
   quien tenía un enlace a las reglas del cambio aterriza donde están ahora. El punto de aviso por
   violaciones nuevas se muda al título de **Cambios**.
4. **Los colores de sección siguen diciendo de qué habla cada bloque.** Dominio y Migración estrenan
   su punto, como el resto de la ficha.

**Lo que no cambia:** ni `cc.json`, ni el checksum, ni `report.json`. Todo sale del snapshot y del
reporte que ya existen.

## Consecuencias

- Dos pestañas con un trabajo cada una: el fichero y el cambio. Ningún dato se pinta dos veces.
- `RulesPanel` y `FileLens` desaparecen; su contenido vive en `panels.tsx`, en `ChangesPanel` y en
  la sección **Reglas** de la ficha.
- El tipo de pestaña del estado de vista se queda en `file | changes`. Los alias se traducen al leer.
- La pestaña Cambios crece; el orden es el de la pregunta: primero qué rompe, después dónde y cuánto.
- Tests: los alias `rules` y `lenses` acaban en `changes` y no queda ningún valor de pestaña que no
  exista.

## Alternativas descartadas

- **Dejar las tres pestañas y solo limpiar Reglas.** Mantiene dos copias del riesgo y de los
  símbolos, que es lo que molesta al leer la ficha.
- **Hacer Reglas file-only y perder las reglas del cambio.** El diff es el producto: sus violaciones
  no pueden quedarse sin sitio.
- **Meter las reglas del cambio dentro de Fichero.** Rompe la escala: el cambio no es del fichero
  seleccionado y la ficha volvería a mezclar.
- **Duplicar el estado de reglas en las dos pestañas.** Cambia un salto por dos copias que se
  desincronizan en cuanto una crece.

## Hoja de ruta

### M50 — Dos pestañas

- [x] El desglose del riesgo dentro de Métricas, sin repetir el valor.
- [x] **Reglas**, con **Dominio** y **Deuda de migración** dentro, en vez de dos secciones sueltas;
      fuera el resumen de símbolos duplicado.
- [x] Las reglas del cambio y los hotspots, en **Cambios**.
- [x] Dos pestañas; `rules` y `lenses` se leen como `changes` y el aviso se muda a Cambios.
- [x] Tests de los alias y ninguna pestaña que no exista.

La forma de las pestañas cambió después: los dos apartados siguen, pero se eligen desde una barra de
actividad con iconos, fuera del scroll de la hoja ([ADR 0079](../0071-0080/0079-el-inspector-con-barra-de-actividad.md)).

El registro de lo hecho vive en el [feed de la guía](/guia/).
