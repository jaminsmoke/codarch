---
title: El fichero entero, sin pestaña
date: "2026-10-27"
category: feature
verdict: adr
---

**Qué era**: el doble clic en un bloque del mapa abría el fichero en una pestaña **Código**, que el [ADR 0085](../adr/0081-0090/0085-la-ruta-del-mapa-navega.md) retiró porque montar el bloque entero bloqueaba la app. Desde entonces, ver un fichero completo obligaba a abrirlo en el editor de fuera.

**Qué es**: **doble clic** en el bloque de un fichero y el escenario pinta su código completo, de solo lectura, con el mismo editor de la ficha ([ADR 0087](../adr/0081-0090/0087-el-fichero-entero-en-el-escenario.md)). No hay pestaña: el mapa deja su sitio. La ruta pasa a `Todo / packages / ui / useCodarchApp.tsx`, y cualquier tramo, **Todo**, la flecha o `Esc` devuelven el mapa; dentro del código, la cabecera lleva un **← Mapa** con lo mismo. La plataforma sirve el fichero entero hasta 5.000 líneas y 4 MB por la misma puerta que una muestra, con sus mismas reglas de ruta.

**Por qué así**: el coste que tumbó la pestaña ya no existe. Con CodeMirror, `useCodarchApp.tsx` (1.000 líneas) monta en **5,3 ms**, deja **ninguna tarea larga** y pinta **83 líneas** con 495 nodos, con el scroll dentro del escenario. Una pestaña era justo lo que el 0085 quitó, y el estado del fichero abierto no va a la URL: es un gesto de la vista, y se cierra al cargar otro snapshot.

**Cómo se comprueba**: con el repo abierto, doble clic en `useCodarchApp.tsx` enseña sus 1.000 líneas con la canaleta 1…, el mapa fuera del DOM y el zoom oculto; la ruta lleva el nombre del fichero y **Todo** o `Esc` vuelven al mapa con sus 348 celdas. `packages/parsers/test/source.test.ts` cubre la lectura del fichero entero y sus reglas de ruta.

**Veredicto**: ADR 0087, sin fase nueva. La vista va a la URL desde la entrada del [fichero abierto en el enlace](2026-10-27-76-el-fichero-abierto-en-el-enlace.md); queda la comprobación en el escritorio empaquetado.
