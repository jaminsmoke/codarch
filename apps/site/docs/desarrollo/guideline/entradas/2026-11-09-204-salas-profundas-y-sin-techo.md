---
title: "Salas profundas, abiertas por arriba y archivadores al fondo"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**Qué era**: las salas eran anchas y poco profundas; el techo cerraba la parte alta y no aportaba.
Los archivadores estaban delante y el fondo quedaba vacío.

**Qué cambia**:

- Se retira el techo; quedan paredes laterales, pared de fondo, viga y tiras de luz.
- La profundidad se calcula como mínimo al 65 % del ancho, con 20 unidades de suelo.
- La retícula de archivadores se ancla a la pared de fondo; las filas extra crecen hacia la cámara.
- La estantería lateral sigue en el frente, así que el recorrido es estantería, pasillo y fondo.

****Por qué así**: una planta más cuadrada y sin tapa da sensación de sala y de recorrido. Los
archivadores en el fondo dejan el pasillo libre y usan la pared que antes no hacía nada.

**Verificado**: en Chrome, raíz, `scripts` y `packages/ui/src` muestran salas más profundas, sin
techo, con los archivadores al fondo y las estanterías delante; sin errores de consola.

**Qué falta**: afinar el pasillo central y el LOD por ángulo. La puerta animada sigue para después.

**Tamaño**: `room.ts`, pruebas del Atlas y documentación.

**Veredicto**: hecho.
