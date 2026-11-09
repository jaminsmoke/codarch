---
title: "La sala se ajusta a su contenido y la selección responde"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**Qué era**: con pocos ficheros, la sala mantenía una pared alta y vacía; las estanterías quedaban
pequeñas. La carpeta seleccionada no se veía en el 3D y una hoja seleccionada no acercaba la cámara.

**Qué cambia**:

- La altura mínima de la sala baja a 15 y crece con el contenido.
- Las estanterías usan hasta tres columnas por lado: más filas y presencia.
- Montantes, remate superior, molduras, columnas de boca y umbral.
- `selectedFolder` llega al plugin y la carpeta se resalta en la sala.
- Un clic en una hoja la selecciona y vuela a su estante con contexto; el visor sigue en el doble clic.

**Por qué así**: la escala de la sala debe seguir al contenido, no al revés. La selección necesita una
respuesta en el 3D y el foco de una hoja no debe perder la estantería.

**Verificado**: en Chrome, la sala de `scripts` gana filas y deja de estar vacía; la carpeta se pinta;
la hoja seleccionada enfoca con la estantería alrededor; sin errores de consola.

**Qué falta**: más composición y luces en salas grandes, y el resto de focos.

**Tamaño**: `room.ts`, `scene.ts`, `view.tsx`, contexto de plugins, pruebas y documentación.

**Veredicto**: hecho.
