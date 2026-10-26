---
title: El inspector con barra de actividad
date: "2026-10-26"
category: feature
verdict: fase
---

**Qué era**: el panel derecho elegía entre **Fichero** y **Cambios** con dos pestañas de texto en su cabecera. Con dos cabía; con el panel creciendo, no: la tira vivía dentro del `aside` que scrollea, así que al bajar por una ficha larga el único control para cambiar de apartado se iba hacia arriba, y cada apartado nuevo le quitaba ancho al contenido en 302 px.

**Qué cambió**: una barra de actividad de 44 px contra el borde derecho, fuera del scroll, con un icono por apartado. **Fichero** y **Cambios** siguen siendo los mismos (`tab=file|changes`), pero se eligen desde ahí; el punto de «hay cambios sin commitear» viaja sobre el icono de Cambios, y cada entrada lleva su `title` y su `aria-label`. La barra es una lista de datos (`INSPECTOR_SECTIONS`): añadir un apartado es una entrada y su hoja, no tocar el armazón. En estrecho se tumba y pasa a una fila encima de la hoja.

**Números**: el panel conserva sus 302 px porque la barra tiene franja propia (346 px de columna); desaparecen `.tabs`/`.tab`/`.tab-dot` y entran `.inspector-dock`/`.inspector-bar`/`.inspector-tab`/`.inspector-dot`. La API no cambia: el estado sigue siendo `tab` y `setTab`, y los nombres viejos (`rules`, `lenses`, `pr`) se siguen leyendo. La barra es `nav` con `aria-current`, no un `tablist`: no promete flechas que no hace.

**Veredicto**: [ADR 0079](../../adr/0071-0080/0079-el-inspector-con-barra-de-actividad.md), hecho. Comprobado en la app servida: dos iconos con su nombre, `aria-current` en el apartado activo, el punto sobre Cambios; al hacer scroll de 591 px la barra no se mueve ni un píxel, cambiar de icono actualiza `tab=` y el nombre del panel, y a 700 px la barra se tumba en una fila de 44 px encima de la hoja.
