---
title: "La pared de métricas"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**Qué era**: las métricas estaban solo en el inspector. La pared de fondo tenía el cartel del nombre
y un hueco por encima.

**Qué cambia**:

- La pared de fondo gana una pantalla horizontal con marco, centrada sobre el cartel.
- La tabla muestra ficheros, carpetas, riesgo máximo y área del ámbito abierto.
- En la raíz son las cifras del proyecto; dentro de una carpeta, las de su ámbito.
- La tabla no es seleccionable y se calcula desde el `RenderModel`, sin tocar el checksum.

****Por qué así**: una sola tabla con filas se lee mejor que cuatro paneles pequeños y evita que las
etiquetas de los ficheros compitan con las cifras. La pared deja de ser decoración y pasa a informar.

**Verificado**: en Chrome, la raíz muestra las cifras del proyecto y `packages/ui/src` las de su
ámbito; sin errores de consola.

**Qué falta**: adaptar la tabla a nombres largos y seguir puliendo composición y luces.

**Tamaño**: `metrics.ts`, `room.ts`, `scene.ts`, pruebas y documentación.

**Veredicto**: hecho.
