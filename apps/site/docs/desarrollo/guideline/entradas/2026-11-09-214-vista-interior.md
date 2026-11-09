---
title: "La cámara entra en la sala y puede mirar arriba"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**Qué era**: la vista general orbitaba desde fuera. Al acercarse, la cámara quedaba cerca del centro
pero seguía mirando al objetivo, y el tope vertical no dejaba subir la mirada. Las salas grandes
obligaban a alejar la cámara hasta salir.

**Qué cambia**:

- **Centro** (o `C`) ancla la cámara dentro de la sala, a un tercio de la profundidad y a la altura de
  los ojos.
- Arrastrar gira sobre el eje de la cámara, sin arco exterior.
- La transición de entrada es amortiguada.
- Mirar arriba llega casi al cenit; el suelo frena la cámara en la órbita exterior.
- La planta mínima sube a 28 × 22 y las salas pueden crecer.
- `Centrar` y los focos de fichero/carpeta salen de la vista anclada.

**Por qué así**: dentro de la sala la cámara no puede enseñar el exterior, y una sala mayor se recorre
desde dentro en vez de verse desde muy lejos. El techo sigue fuera: es una decisión de profundidad.

**Verificado**: en Chrome, Centro entra sin salto, el giro se queda dentro, la mirada sube hasta el
cielo oscuro y `Centrar` vuelve a la vista general; sin errores de consola.

**Qué falta**: composición y luces para las salas grandes, más focos y la puerta animada.

**Tamaño**: `orbit.ts`, `scene.ts`, `room.ts`, `view.tsx`, pruebas y documentación.

**Veredicto**: hecho.
