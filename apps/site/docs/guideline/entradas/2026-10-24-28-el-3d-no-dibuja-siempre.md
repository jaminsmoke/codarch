---
title: El 3D ya no dibuja a 60 fps para siempre
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué es**: que la vista 3D dibuje solo cuando hay algo nuevo: la cámara se mueve, cambia la
selección o cambia el tamaño. Quieta, no consume.

**Por qué**: la escena tenía un `requestAnimationFrame` que se reprogramaba a sí mismo y llamaba a
`renderer.render()` en cada fotograma, aunque nada hubiera cambiado. Con la vista 3D activada, la
GPU y la CPU trabajaban sin parar y **toda la app** iba lenta: cada clic competía con 60 fotogramas
por segundo. Desde 0.3.8, con la tienda de plugins, activar la vista 3D es un clic.

**Qué cambió**: los controles de órbita dicen si la cámara se ha movido (`update(): boolean`) y
avisan al empezar a moverse (`onChange`). La escena pide un fotograma solo cuando hay movimiento,
selección o redimensionado, y el nivel de detalle se recalcula como mucho cada 120 ms mientras la
cámara se mueve. Medido con el perfilador: 2,5 s con el 3D abierto y quieto → 22 ms de CPU (0,9 %);
antes, un fotograma por refresco.

**Por qué no se vio antes**: se probó que el 3D *dibujara*, no cuánto costaba **estando quieto**. No
había presupuesto de rendimiento ni perfil de reposo; el problema apareció al dejar la vista abierta
mientras se usa el resto de la app.

**Veredicto**: arreglo de rendimiento; no necesita ADR.
