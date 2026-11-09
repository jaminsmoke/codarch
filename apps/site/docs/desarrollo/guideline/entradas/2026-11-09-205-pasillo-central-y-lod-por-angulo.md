---
title: "Pasillo central y LOD por ángulo"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**Qué era**: la sala profunda dejaba un pasillo central sin ninguna guía y los detalles de los
archivadores seguían dibujándose aunque la cámara se fuera de frente.

**Qué cambia**:

- Dos filetes claros de suelo recorren el pasillo entre la estantería delantera y los archivadores del
  fondo, sin tapar la baldosa.
- El ancho de la guía se adapta al ancho de la sala, con mínimo y máximo.
- El LOD de detalles añade el ángulo: se retiran si la cámara se aparta más de 0,65 radianes del
  frente, además de la carga y la distancia.

****Por qué así**: la guía ordena el recorrido sin tapar nada. El ángulo importa porque los detalles
frontales de un archivador dejan de leerse cuando se mira desde un lado; ocultarlos evita geometría
que no aporta.

**Verificado**: en Chrome, raíz, `scripts` y `packages/ui/src` muestran el pasillo y el LOD al
orbitar/alejar; sin errores de consola.

**Qué falta**: afinar luces y distribución por ángulo. La puerta animada sigue para después.

**Tamaño**: `room.ts`, `scene.ts`, pruebas del Atlas y documentación.

**Veredicto**: hecho.
