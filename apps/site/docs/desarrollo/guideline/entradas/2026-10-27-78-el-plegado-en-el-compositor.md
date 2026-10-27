---
title: El plegado, en el compositor
date: "2026-10-27"
category: feature
verdict: adr
---

**Qué era**: plegar y desplegar las hojas de los dos docks era un `display: none`: correcto y barato, pero seco. La tentación era animar el ancho de la hoja para que el mapa creciera con ella.

**Qué es**: cada hoja se va con un fundido de **140 ms** —opacidad y 8 px de desplazamiento hacia su barra— y vuelve igual. El ancho del mapa cambia **una sola vez**, en el mismo gesto, y la hoja se funde encima. Con `prefers-reduced-motion: reduce` el cambio vuelve a ser seco, y por debajo de 1180 px también, porque ahí las hojas se apilan y plegarlas quita alto.

**Por qué así**: animar el ancho habría sido más vistoso y bastante peor. El mapa recalcula su treemap en cada cambio de tamaño: `npm run bench:render` da **18 ms de mediana con 5.000 ficheros** para construir el modelo y distribuirlo, así que una animación de 140 ms habría pedido ese trabajo en cada fotograma y habría soltado frames justo en los repos grandes, que son los que más lo notan. No hace falta ninguna librería de animación: el navegador ya interpola opacidad y `transform` en el compositor, y el cambio de layout se paga una vez. Las hojas siguen en el DOM para poder fundirse y `inert` las saca del foco y del árbol de accesibilidad mientras están plegadas.

**Cómo se comprueba**: en la app servida, al plegar, el ancho del escenario pasa de 651 a 953 px en un solo valor muestreado por fotograma mientras la hoja se apaga; `inert` y `aria-hidden` quedan en `true` y la barra sigue con `aria-expanded="false"`. Al desplegar vuelve a 651 y la hoja entra desde opacidad 0. En estrecho, `display: none` y sin transición.

**Veredicto**: enmienda a los ADR 0079 y 0083, sin dependencia nueva y sin fase.
