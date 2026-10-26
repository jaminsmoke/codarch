---
title: El dock de herramientas
date: "2026-10-26"
category: feature
verdict: adr
---

**Qué era**: el panel de la izquierda se llamaba **rail** —«raíl»— en el marcado y en el CSS, mientras al otro lado el dock del inspector ya tenía barra de actividad con nombre propio; el engranaje de Ajustes vivía en la cabecera, entre el botón de abrir repositorio y el menú de vistas, compitiendo con lo que sí es del proyecto abierto; y el panel ocupaba sus 258 px siempre, sin manera de plegarlo.

**Qué cambió**: el raíl pasa a llamarse **toolbar** y gana un dock propio, espejo del inspector: la barra de 44 px a la izquierda —con el color del marco— y la hoja al lado. El icono del mapa pliega la hoja y deja el mapa a pantalla completa; el estado se recuerda entre visitas como el de una sección, y con la hoja plegada el dock son 44 px con la franja a la vista. El engranaje de Ajustes baja al pie de la barra, separado de las herramientas y marcado mientras el diálogo está abierto: la cabecera se queda con lo del proyecto. Los ajustes no cambian de API (`settingsOpen`/`setSettingsOpen`). Las herramientas son una lista (`TOOL_ENTRIES`), así que añadir una es una entrada y su hoja.

**Números**: la rejilla del armazón pasa a `auto minmax(0,1fr) 346px` —la franja izquierda la mide el dock, 44 + 258— y la hoja tiene ancho fijo (258, 226 por debajo de 1180) para que un texto largo no estire el dock. Desaparece el CSS de `.rail-settings`, que no usaba ningún componente. Comprobado en la app servida: a 1440 el dock mide 302 y el mapa 652; al plegar, el dock queda en 44 y el mapa en 910, y al recargar sigue plegado; a 1000 el dock son 270 y el inspector se apila; a 711 la barra se tumba en una fila de 44 con Ajustes al extremo derecho; el engranaje abre el diálogo con su icono marcado.

**Veredicto**: [ADR 0083](../../adr/0081-0090/0083-el-dock-de-herramientas.md), hecho. Quedan por rehacer las capturas que enseñan el engranaje en la cabecera y el raíl.
