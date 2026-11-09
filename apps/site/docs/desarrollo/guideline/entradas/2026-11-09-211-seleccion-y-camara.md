---
title: "Un clic selecciona, dos entran; la cámara no sale de la sala"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**Qué era**: un clic en una carpeta entraba directamente en su sala y un clic en una hoja abría el
visor. No se podía seleccionar sin navegar. La cámara podía orbitar por detrás de las paredes.

**Qué cambia**:

- Un clic selecciona carpetas y hojas.
- Doble clic en carpeta entra en su sala; doble clic en hoja abre el visor.
- El panel de métricas mantiene su clic directo de foco.
- La órbita queda en un arco frontal (`π ± 1,15`) con distancia máxima.
- `Centrar` vuelve a la vista general.

****Por qué así**: seleccionar y navegar son gestos distintos. Limitar el arco evita enseñar el exterior
y mantiene la cámara dentro de la lectura de la sala.

**Verificado**: en Chrome, un clic selecciona sin cambiar de sala, doble clic entra/abre, la órbita no
cruza la pared de fondo y el panel de métricas sigue enfocándose; sin errores de consola.

**Qué falta**: más focos de cámara y seguir puliendo composición y luces.

**Tamaño**: `orbit.ts`, `scene.ts`, `view.tsx`, API de plugins, pruebas y documentación.

**Veredicto**: hecho.
