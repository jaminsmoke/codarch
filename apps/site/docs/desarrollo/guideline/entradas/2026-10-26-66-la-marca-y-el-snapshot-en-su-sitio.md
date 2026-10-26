---
title: La marca y el snapshot, en su sitio
date: "2026-10-26"
category: fix
verdict: arreglo
---

**Qué era**: en la cabecera, «CODARCH» y «ATLAS DE ARQUITECTURA» iban uno al lado del otro, sin icono y con el lema ocupando ancho; el snapshot —la fuente y los dos checksums— y el indicador de vigilancia se sentaban en el centro de la cabecera, que es de la app y no del proyecto abierto; y el engranaje de Ajustes, recién mudado a la barra de herramientas, era un dibujo relleno que a 16 px se leía como una mancha sin agujero.

**Qué cambió**: la marca es el icono de la app dibujado en SVG —el mapa en miniatura, con su pieza de deuda en la esquina— y a su lado el nombre, con el lema debajo, en dos líneas. El snapshot y la vigilancia bajan a la banda del proyecto, junto al nombre del proyecto: `servidor local · 82de566a · 96cbb3b6 ● live`, con lo que no cabe recortado y el texto entero en el `title`. El engranaje es ahora una silueta de ocho dientes rellena con el buje recortado por dentro —dos subtrazados con sentidos opuestos—, así que a 16 px el agujero del centro se ve.

**Números**: la cabecera pasa de rejilla a fila flexible: la marca a la izquierda y las acciones a la derecha, sin la columna central. El nombre del proyecto no encoge —cede el snapshot, que lleva elipsis— y a 777 px se esconden el lema y el snapshot, con la banda todavía sin desbordar (759 de 759). Sin cambios en el modelo ni en la API.

**Los iconos**: la marca de la cabecera, el favicon de la web y el icono del escritorio salen de la misma geometría, `packages/ui/src/brand-mark.json`, que lee el generador de iconos (`npm run icons`): el PNG de 512 px del escritorio —de donde electron-builder saca el `.ico` y el `.icns`—, el `icon.png` de la web para la pantalla de inicio y el favicon en SVG, nítido a cualquier tamaño. Los PNG se dibujan con supermuestreo, así que la esquina redondeada ya no escalona. Un test compara los `rect` del favicon con el JSON: si alguien edita una copia a mano, falla.

**Veredicto**: arreglo, sin fase ni ADR. Comprobado en la app servida: la marca mide 22 px con el nombre en dos líneas, el snapshot queda junto a «codarch» en la banda, el engranaje nuevo preside el pie de la barra, y a 1000, 900 y 777 px el nombre del proyecto no se recorta y la banda no desborda.
