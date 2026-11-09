---
title: "Estanterías ligeras y llenado desde dentro"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**Qué era**: las tablas de las estanterías eran gruesas y entraban demasiado en el pasillo. Además,
las hojas se llenaban desde el borde más cercano a la cámara hacia el fondo.

**Qué cambia**:

- La tabla baja a 0,08 de grosor y 1,25 de vuelo desde la pared.
- La estantería se retrasa hacia la mitad profunda de la sala.
- Las hojas se reparten desde el borde interior de la tabla hacia el frente.
- Se mantienen el listón de pared y la tira de luz, sin montantes laterales.

****Por qué así**: menos tabla y menos vuelo dejan ver mejor las hojas. Retrasar la estantería libera
la boca de la sala y el llenado de dentro afuera sigue el orden natural de una estantería.

**Verificado**: en Chrome, raíz, `scripts` y `packages/ui/src` muestran las tablas más finas, la
estantería retrasada y las hojas ordenadas desde dentro; sin errores de consola.

**Qué falta**: pulir luces y composición fina. La puerta animada sigue para después.

**Tamaño**: `room.ts`, pruebas del Atlas y documentación.

**Veredicto**: hecho.
