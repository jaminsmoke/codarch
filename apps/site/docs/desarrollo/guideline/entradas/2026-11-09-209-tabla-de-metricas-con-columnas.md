---
title: "La tabla de métricas, con columnas"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**Qué era**: la pantalla de métricas de la pared de fondo era una lista centrada; se leía, pero no
parecía una tabla y el nombre de cada cifra competía con su valor.

**Qué cambia**:

- La pantalla lleva el encabezado `MÉTRICAS`.
- Cada fila alinea la etiqueta a la izquierda y el valor a la derecha.
- Se mantiene una sola pantalla, no cuatro paneles.
- La tabla se calcula igual desde el `RenderModel` y sigue sin ser seleccionable.

****Por qué así**: una tabla con columnas se lee de un vistazo y deja aire entre el nombre y la cifra.
Sigue integrada en la pared y no tapa la arquitectura.

**Verificado**: en Chrome, la raíz muestra la tabla del proyecto y `packages/ui/src` la de su ámbito;
sin errores de consola.

**Qué falta**: adaptar el ancho a nombres muy largos y seguir puliendo luces y composición.

**Tamaño**: `room.ts`, `scene.ts`, pruebas del Atlas y documentación.

**Veredicto**: hecho.
