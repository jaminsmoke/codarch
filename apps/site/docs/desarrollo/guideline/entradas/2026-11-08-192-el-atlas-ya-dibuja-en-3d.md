---
title: "El Atlas ya es un plugin que dibuja en 3D"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: solo existía la vista 3D de barras. El Atlas era una idea en el
[ADR 0113](/desarrollo/adr/0111-0120/0113-el-atlas-es-un-plugin/), no una vista.

**Qué cambia**: nace `plugins/atlas`, un plugin separado de `vista-3d`.

- Ocupa **todo el escenario central** del mapa.
- Dibuja una vista aérea 3D con una rejilla de referencia, contenedores de
  carpeta con aristas y cubos de fichero. Las carpetas se abren por nivel de
  detalle cuando la cámara se acerca.
- La selección y el foco se sincronizan con la app.
- Funciona en **los dos mapas**: código y documentos/configuración. Al cambiar
  de mapa, la vista de plugin se conserva y se reconstruye con el modelo nuevo.
- Si el plugin está apagado, o la máquina no tiene WebGL2, se sigue viendo el
  mapa clásico.

**Por qué así**: el Atlas es otra metáfora, no otra piel de la vista de barras.
Como plugin se activa y se apaga, no engorda el core y su renderizador se carga
bajo demanda.

**Verificado**: en el navegador, el mapa de código dibuja 714 ficheros y 74
contenedores; el mapa de documentos, 770 ficheros y 60 contenedores. La consola
no da errores y los dos mapas siguen mostrando el Atlas al cambiar. La suite,
el typecheck y el build web pasan.

**Qué falta**: entrar y salir de una carpeta con una transición de cámara,
etiquetas legibles por nivel, detalle de fichero, corredores y estanterías.

**Tamaño**: `plugins/atlas` completo, su registro en `.codarch.yml` y la
continuidad de la vista al cambiar de mapa.

**Veredicto**: hecho.
