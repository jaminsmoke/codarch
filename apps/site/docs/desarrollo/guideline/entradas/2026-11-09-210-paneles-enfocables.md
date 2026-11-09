---
title: "Paneles enfocables y texto dentro del monitor"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**Qué era**: el cartel y la tabla eran etiquetas de canvas; el texto podía desbordarse del panel. La
pantalla de métricas no se podía seleccionar para leerla de cerca.

**Qué cambia**:

- El texto del cartel y de la tabla se recorta a las esquinas proyectadas del panel.
- La tipografía de la tabla escala con el tamaño del panel en pantalla.
- Pulsar la pantalla de métricas viaja suavemente hasta encuadrarla.
- `Centrar` / `0` / `R` devuelve la vista general de la sala.
- El vuelo de panel usa el mismo mecanismo que el de carpetas.

****Por qué así**: el texto debe pertenecer al monitor, no flotar como HUD. Un clic lleva a la lectura
detallada sin perder la vuelta a la sala.

**Verificado**: en Chrome, el clic en la tabla la encuadra, el texto queda dentro del panel y Centrar
vuelve a la sala; sin errores de consola.

**Qué falta**: más focos de cámara en partes de la sala, luces y la puerta animada.

**Tamaño**: `room.ts`, `scene.ts`, pruebas y documentación.

**Veredicto**: hecho.
