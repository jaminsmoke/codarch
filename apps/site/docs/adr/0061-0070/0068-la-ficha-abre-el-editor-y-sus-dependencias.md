---
title: ADR 0068 — La ficha abre el editor y enseña sus dependencias
description: "El código de la ficha salta al editor del usuario y la pestaña Fichero enseña por fin con qué ficheros habla: lo que importa y lo que lo usan."
section: adr
status: aceptado
date: "2026-10-25"
sidebar:
  label: La ficha abre el editor y sus dependencias
  order: 68
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

La ficha ya enseña el código real de un símbolo, pero para editarlo había que
buscar el fichero y la línea a mano. El modelo también conoce el grafo de
imports (`lenses.dependency.edges`), y la ficha solo lo usaba de forma
indirecta: las métricas `fanIn`/`fanOut` daban el número, no los nombres.

Eran las dos cosas que faltaban a nivel de fichero: **salir al editor** y
**ver con quién habla**. Todo lo demás ya estaba: métricas, símbolos, código,
miembros, superficie, cadena, reglas y migración.

## Decisión

### 1. Abrir el fichero en el editor

`Plataforma.abrirEnEditor` es opcional y recibe `{ path, line }`:

- **Escritorio**: el proceso principal compone
  `vscode://file/<ruta absoluta>:<línea>` y llama a `shell.openExternal`.
  Solo acepta rutas dentro del repo abierto.
- **Web servida por el CLI**: lee `rootPath` de `data/meta.json` y navega al
  mismo esquema; el navegador lanza el editor registrado por el sistema.
- **Web que analiza una carpeta**: no hay ruta absoluta, así que no se ofrece.

El botón **Editor** vive en la cabecera del bloque de código. Al lado está
**Copiar ruta** (`ruta:línea`), que funciona en todas las plataformas y es la
salida cuando no hay editor o el sistema no lo abre. El editor por defecto es
VS Code; elegir otro se hará en los ajustes, no aquí.

### 2. Dependencias del fichero

La pestaña **Fichero** gana **Dependencias**, después de Superficie:

- **Importa**: los ficheros a los que apunta una arista de salida.
- **Lo usan**: los que apuntan a él.
- Cada ruta es un botón: abre ese fichero en el mapa y en la ficha.

Sale del `RenderModel` que ya existe (`edges` + `files`), sin tocar `cc.json`,
el checksum ni el análisis. Se deduplica por ruta y se ordena
alfabéticamente.

### 3. Lo que no cambia

- No se añade nada al snapshot: dependencias y editor son lectura.
- El código sigue sin viajar en `cc.json`.
- El grafo sigue siendo de ficheros; las aristas de tipos se conservan como
  hasta ahora.

## Consecuencias

- Se puede saltar del símbolo al editor sin copiar la ruta a mano.
- La ficha responde “¿quién usa este fichero?” con nombres, no solo con un
  número.
- Un `cc.json` suelto enseña las dependencias (viven en el modelo) pero no el
  editor ni el código.
- Si el sistema no tiene VS Code, el botón Editor no hace nada útil; **Copiar
  ruta** sigue funcionando.
- La elección de editor queda para los ajustes, junto con el resto de
  preferencias visuales.

## Alternativas descartadas

- **Lanzar `code` desde el servidor local.** El servidor puede estar en otra
  máquina o en un contenedor; abriría el editor equivocado.
- **Un editor embebido.** La ficha es un atlas, no un IDE.
- **Enseñar solo los números de fan-in/fan-out.** Es lo que ya hacía la tabla;
  no dice con quién.
- **Añadir las aristas al snapshot.** Ya están; repetirlas engordaría el
  modelo.

## Hoja de ruta

### M48 — La ficha abre el editor y sus dependencias

- [x] `abrirEnEditor` en la plataforma, con escritorio y web servida.
- [x] Botón **Editor** y **Copiar ruta** en el bloque de código.
- [x] **Dependencias** con Importa y Lo usan, clicables.
- [x] Las dependencias salen del grafo existente, sin tocar el snapshot.
- [ ] Elegir el editor (VS Code, Cursor, otro) en los ajustes.
- [ ] Enseñar el tipo de arista (import normal, type-only, dinámico).
- [ ] Llevar las dependencias al MCP o al reporte, si un agente lo pide.

El registro de lo hecho vive en el [feed de la guía](/guia/).
