---
title: Volver a casa en el mapa
date: "2026-10-25"
category: fix
verdict: arreglo
---

**Qué era**: al entrar en una carpeta el mapa se quedaba dentro y solo Escape sabía salir. La banda del proyecto enseñaba la ruta de golpe —«Todo / packages/parsers/test»— con un único botón para volver al principio: ni un nivel arriba, ni un tramo intermedio. Y el pie del escenario repetía lo que ya estaba arriba —«N ficheros · M carpetas · cc.json 2.0»— al lado de unos controles de zoom con una etiqueta «Ajustar» y la pista «botón derecho: mover».

**Qué cambió**: las migas salen del árbol del mapa, no de la cadena de la ruta: un tramo por carpeta, cada uno se puede abrir, el último es la carpeta actual y la flecha «←» sube un nivel (Retroceso hace lo mismo; Escape sale del todo). La primera sigue siendo «Todo» y vuelve al mapa entero. El pie se queda con el zoom y nada más: «− 100% +» y un icono de ajustar; la pista del botón derecho se muda al tooltip del grupo y el recuento de ficheros, carpetas y formato desaparece, porque ya está en la banda.

**Números**: la banda suma una flecha y un tramo por nivel; el pie pierde dos textos y pasa de tres controles con texto a tres botones de 19-20 px en una caja de 95 × 22 px. `folderTrail` y `parentFolder` recorren el árbol, con test propio; ni `cc.json` ni el checksum cambian.

**Veredicto**: arreglo, hecho. Ni ADR ni cambio de modelo: la misma vista, con el camino de vuelta a la vista.
