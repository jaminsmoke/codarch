---
title: "Esquinas cerradas y suelo contenido"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**Qué era**: la pared de fondo era más ancha que las paredes laterales y el suelo sobresalía. En las
esquinas se veía la junta y la sala parecía montada con piezas distintas.

**Qué cambia**:

- La pared de fondo comparte el ancho exterior de las laterales.
- Cada esquina de fondo lleva una columna de moldura que tapa la junta.
- El suelo se ajusta al ancho de las paredes y deja de sobresalir.
- La cámara mantiene el arco frontal y el límite de distancia.

****Por qué así**: una estructura que cierra en la misma esquina se lee como una sala, no como paneles
sueltos. La columna resuelve la junta sin añadir una pared frontal.

**Verificado**: en Chrome, raíz y salas interiores muestran esquinas continuas y suelo contenido; sin
errores de consola.

**Qué falta**: luces, composición interior y el resto de focos de cámara.

**Tamaño**: `room.ts` y documentación.

**Veredicto**: hecho.
