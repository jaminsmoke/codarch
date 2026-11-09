---
title: "Cartel de fondo y nombre real del proyecto"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**Qué era**: la viga del frente sostenía el nombre de la sala. La sala raíz se llamaba `Proyecto`,
aunque representa el repositorio analizado.

**Qué cambia**:

- Se elimina la viga frontal y el frente queda completamente abierto.
- El nombre pasa a un cartel centrado en la pared de fondo, con placa oscura, marco y texto centrado.
- La sala raíz usa `RenderModel.meta.project`; `Proyecto` queda solo como último recurso.
- El cartel tiene prioridad sobre las etiquetas y no es seleccionable.

****Por qué así**: el nombre pertenece a la pared, no a una pieza suspendida delante de la cámara. La
raíz tiene que decir qué proyecto se está mirando.

**Verificado**: en Chrome, la raíz muestra `codarch` en el cartel de fondo y `src` en su sala; sin
viga, sin errores de consola.

**Qué falta**: LOD por ángulo y pulido de luces. La puerta animada sigue para después.

**Tamaño**: `room.ts`, `view.tsx`, `scene.ts`, pruebas y documentación.

**Veredicto**: hecho.
