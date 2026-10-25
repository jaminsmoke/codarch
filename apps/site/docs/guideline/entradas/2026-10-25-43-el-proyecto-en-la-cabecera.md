---
title: El proyecto, en la cabecera
date: "2026-10-25"
category: feature
verdict: adr
---

**Qué era**: tres capas para decir lo mismo antes del mapa. La cabecera enseñaba el nombre del proyecto, el escenario lo repetía en un `h1` con un rótulo **MAPA** que no aportaba nada, y al lado iban cuatro cifras —ficheros, carpetas, área y deuda— en otra fila. Entre unas cosas y otras el mapa empezaba más de cien píxeles abajo. Y la tabla de métricas de la ficha, ya sin duplicados, seguía ocupando veinte filas aunque solo se quisiera ver el riesgo.

**Qué cambió**: una banda de 52 px pegada a la cabecera con **Proyecto** y sus cifras. El nombre aparece una sola vez, la cabecera se queda con la fuente, el checksum, el commit y el live en una línea, y el breadcrumb de la carpeta enfocada sube a la banda. El rótulo **MAPA** y el `h1` del escenario desaparecen, y las pestañas del escenario solo se pintan cuando hay vistas de plugins que elegir. El mapa empieza unos 50 px más arriba. Además nace una sección plegable: título en negrita, cuenta, chevron y un resumen con el riesgo cuando está cerrada. **Métricas** es la primera; recuerda su estado en el almacenamiento local, así que sobrevive a cambiar de pestaña, de fichero y de sesión. Funciona con teclado y anuncia lo que hay debajo con `aria-expanded` y `aria-controls`.

**Números**: la banda mide 52 px y el escenario ahorra unas tres cuartas partes del encabezado anterior. En la ficha de `apps/mcp/src/tools.ts`, abierta enseña las mismas veinte filas y cerrada cabe en una línea con «Riesgo 54/100». No cambia `cc.json`, ni el checksum, ni el reporte: es lectura y disposición.

**Veredicto**: [ADR 0061](../../adr/0061-0070/0061-el-marco-del-proyecto.md), hecho. Queda en su hoja de ruta llevar el componente a Reglas, Cambios y el raíl, y un atajo para plegarlo todo.
