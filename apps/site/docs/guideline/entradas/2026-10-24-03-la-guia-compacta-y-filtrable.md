---
title: La guía, compacta y filtrable
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué era**: cada categoría era una tarjeta con borde, fondo y sombra, y cada entrada otra tarjeta
dentro. El día se alargaba y las categorías que no interesaban seguían ocupando espacio.

**Qué se hizo**: se quitó el chrome de tarjeta de los grupos (sin borde, sin fondo, sin sombra): un
rail de color a la izquierda y un encabezado compacto (punto + nombre + cuenta). Las entradas son
una lista plana separada por líneas finas. Los chips de categoría del encabezado del día ahora son
botones que ocultan o muestran su categoría; si se ocultan todas, aparece «Mostrar todas».

**Veredicto**: **arreglo**, sin ADR (es UI, no modelo). No cambia el checksum ni las rutas.
