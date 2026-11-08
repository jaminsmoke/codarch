---
title: "Estanterías abiertas, luz lateral y LOD de etiquetas"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: las estanterías laterales tenían montantes en los extremos que cerraban la estantería.
Estaban a media profundidad y la luz era plana; las etiquetas no tenían un techo común.

**Qué cambia**:

- Se quitan las tapas laterales y los montantes; quedan tabla, listón de pared y tira de luz.
- La estantería empieza junto a la boca de la sala y las hojas se ordenan desde allí hacia dentro.
- Se añaden dos luces laterales en las paredes y una luz por estantería.
- El shader suma una iluminación de altura suave.
- El presupuesto de etiquetas baja a 64 por sala, manteniendo la prioridad de viga, selección,
  carpetas y hojas.

****Por qué así**: una estantería abierta deja ver más hojas; empezar por el frente acerca el contenido
a la cámara y ordena la lectura. Las luces laterales separan la pared de la estantería y el LOD evita
que una sala grande se llene de nombres.

**Verificado**: en Chrome, raíz, `scripts` y `packages/ui/src` muestran las estanterías abiertas,
ordenadas desde el frente, con las luces laterales y sin errores de consola.

**Qué falta**: LOD de geometría y pulido fino de distribución. La puerta animada sigue para después.

**Tamaño**: `room.ts`, `scene.ts`, las pruebas del Atlas y la documentación.

**Veredicto**: hecho.
