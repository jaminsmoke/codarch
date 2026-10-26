---
title: "ADR 0076 — Las líneas no son código"
description: "El analizador normaliza CRLF a LF al leer el fuente y empareja los símbolos del mismo nombre por orden, para que un repo no enseñe como cambios lo que solo es un final de línea."
section: desarrollo
status: aceptado
date: "2026-10-26"
sidebar:
  label: Las líneas no son código
  order: 76
---

**Estado:** aceptado · **Fecha:** 2026-10-26

## Contexto

La pestaña Cambios seguía enseñando ficheros que nadie había tocado. En este repositorio, con
`core.autocrlf=true` en Windows, la comparación con HEAD analizaba dos textos distintos para el mismo
código: `git archive` exporta el commit con CRLF y el árbol de trabajo tenía LF. El hash del cuerpo
de cada símbolo cambia con los saltos de línea, así que la lente de símbolos veía cambios donde solo
había un `\r`: decenas de ficheros intactos aparecían como modificados.

El segundo ruido estaba en el emparejamiento: `compareSymbols` guardaba un símbolo por nombre. Un
fichero con dos `listener` anidados o con el constructor de dos clases perdía uno, y el superviviente
se comparaba contra el otro del head: cambiado, añadido o eliminado en un fichero que nadie abrió.

## Decisión

1. **Al leer el fuente se normalizan los finales de línea** (CRLF y CR suelto pasan a LF). Es el
   último paso antes de parsear y medir, así que vale para el disco, la memoria del navegador y el
   export del HEAD por igual.
2. **Los símbolos del mismo nombre se emparejan por orden de aparición**, no con un mapa que se queda
   con uno.

## Consecuencias

- El mismo código da el mismo checksum en cualquier plataforma y con cualquier `core.autocrlf`: la
  regla de que el checksum depende del código, no de lo instalado, gana un caso que no cubría.
- Los snapshots de un repo con CRLF en el árbol cambian de checksum una vez. No cambia el formato ni
  el modelo: `cc.json` sigue igual.
- Cambios deja de inventar ficheros: la lente de símbolos solo enseña lo que se tocó de verdad.
- `rloc`, `loc` y las líneas de los símbolos no cambian de valor; lo que cambia son los hashes.

## Alternativas descartadas

- **Normalizar solo el export del HEAD.** Arregla este caso y rompe el contrario: el árbol con CRLF
  seguiría pareciendo distinto del commit.
- **Comparar textos ignorando espacios en el diff de símbolos.** Esconde el problema en vez de
  resolverlo: los hashes seguirían dependiendo del checkout.
- **Pedir `core.autocrlf=false` en la documentación.** Deja mal a cualquier repo ya clonado en
  Windows y el producto seguiría dependiendo de la configuración de git de cada máquina.

## Hoja de ruta

### M57 — Las líneas no son código

- [x] El analizador normaliza CRLF a LF al leer el fuente.
- [x] Los símbolos del mismo nombre se emparejan por orden.
- [x] Un test comprueba que CRLF y LF dan el mismo snapshot y los mismos símbolos.
- [x] Un test comprueba que dos símbolos homónimos intactos no producen cambios.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
