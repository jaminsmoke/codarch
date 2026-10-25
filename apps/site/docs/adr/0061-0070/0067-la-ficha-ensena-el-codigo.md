---
title: ADR 0067 — La ficha enseña el código del símbolo
description: "La ficha deja de ser una lista de nombres: al pulsar un símbolo trae sus líneas reales del repo, los grupos se pliegan y cada métrica tiene su explicación antes del nombre."
section: adr
status: aceptado
date: "2026-10-25"
sidebar:
  label: La ficha enseña el código del símbolo
  order: 67
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

La ficha del fichero ya enseña los símbolos, sus miembros y su superficie, pero
para leer el cuerpo hay que abrir el editor. Las líneas de un símbolo son una
pregunta natural de la ficha: “¿qué hay dentro de `labelFor`?”.

El snapshot no guarda código: sería enorme, metería datos que no son
estructura y haría que el checksum dependiera de cada carácter. Pero las apps
sí pueden leerlo del repositorio cuando lo necesitan: el servidor local y el
escritorio tienen el disco; la web que analiza una carpeta conserva los
ficheros en memoria durante la sesión.

Además, la ficha tenía dos roces de lectura: los grupos de símbolos no se
podían plegar y la explicación de una métrica solo aparecía al pasar el cursor
por el nombre. Las dos cosas se resuelven en la misma capa de UI.

## Decisión

### 1. Todos los símbolos tienen líneas

`ParsedSymbol.lines` deja de ser exclusivo de las funciones: todo símbolo
guarda su rango (variables, interfaces, tipos, enums y clases incluidos). Es un
campo aditivo de `cc.json` 2.x. El checksum cambia porque la lente de símbolos
lleva más información; la regla de identidad no cambia.

### 2. El código se pide a la plataforma, no se guarda en el snapshot

`Plataforma.codigo` es opcional:

- **Servidor local**: `GET /api/source?path=…&start=…&end=…` devuelve un
  `SourceSnippet` con las líneas y el total.
- **Escritorio**: IPC `codarch:read-source`; el proceso principal lee del
  último repo abierto.
- **Web que analiza una carpeta**: los ficheros de la lectura se guardan en
  memoria para la sesión y se cortan ahí; no se envía nada a ningún sitio.

El renderer nunca pide una ruta fuera del root. El lector compartido
(`readSourceSnippet`) rechaza rutas absolutas, `..`, symlinks que salen del
repo, extensiones que no son código y los directorios que el análisis no mira
(`.git`, `node_modules`, `.codarch`, `dist`…). Como mucho devuelve 400 líneas y
1 MB.

### 3. La ficha

- Al pulsar un símbolo se abre **su propio bloque de código justo debajo de
  la fila**, con las líneas reales, números de línea y dos líneas de contexto
  arriba y abajo. Pulsar otra fila lo pliega y abre el de esa fila; los
  miembros de clase hacen lo mismo desde **Miembros**. El fondo es negro, como
  un editor, y el texto va resaltado con Prism; no hay fondos por línea que
  compitan con el código.
- Los grupos de **Símbolos** (Funciones, Clases, Interfaces, Tipos, Enums,
  Variables) son secciones plegables; el estado se recuerda por tipo.
- En **Métricas**, cada fila lleva un icono `?` antes del nombre con la
  explicación breve de la métrica. El tooltip de la fila sigue contando la
  escala, el p95 y la cobertura.

### 4. Lo que no cambia

- El código no entra en `cc.json`, en el reporte ni en el MCP.
- El checksum no depende de lo que se abra en la ficha: solo del snapshot.
- La vida del símbolo sigue siendo una sección aparte; el código no la
  sustituye.
- El diff de símbolos no compara el texto del código; compara el hash del
  cuerpo que ya existía.

## Consecuencias

- La ficha responde “¿qué hace este símbolo?” sin salir de la app.
- El servidor local expone una lectura **de solo lectura** y limitada al root;
  no es un servidor de ficheros arbitrario.
- En un snapshot cargado sin repo (un `cc.json` suelto) no hay código que
  enseñar: el bloque lo dice, no inventa.
- El icono `?` hace visible la explicación sin depender de que el usuario
  descubra el hover.
- Los grupos plegados permiten dejar abierto solo el tipo que interesa.

## Alternativas descartadas

- **Guardar el código en el snapshot.** Pesa, ensucia el modelo y rompe la
  promesa de que el checksum habla de estructura.
- **Leer el fichero entero y cortarlo en el renderer.** Mueve más datos y
  obliga a confiar en límites del cliente; el corte se hace en el lado que
  tiene el disco.
- **Un editor embebido.** La ficha es un atlas, no un IDE; solo enseña el
  cuerpo del símbolo.
- **Tooltip solo en el nombre.** Es lo que había: la explicación existía, pero
  no se veía.

## Hoja de ruta

### M47 — La ficha enseña el código

- [x] `lines` en todos los símbolos.
- [x] `readSourceSnippet` con límites y rutas seguras.
- [x] Endpoint del servidor y IPC del escritorio.
- [x] Memoria de la web para el análisis de carpeta.
- [x] Sección de código plegable al pulsar un símbolo.
- [x] Grupos de símbolos plegables.
- [x] Icono de ayuda por métrica.
- [ ] Llevar el código al MCP o al reporte, si un agente lo pide.
- [x] Resaltado de sintaxis con Prism y fondo de editor.
- [ ] Salto a la línea del editor.
- [x] Código de los miembros de clase, no solo de los símbolos.

El registro de lo hecho vive en el [feed de la guía](/guia/).
