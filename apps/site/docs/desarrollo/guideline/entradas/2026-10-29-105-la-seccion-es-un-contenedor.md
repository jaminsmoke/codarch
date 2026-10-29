---
title: "La sección es un contenedor"
date: "2026-10-29"
category: "refactor"
verdict: "arreglo"
---

**Qué era**: en la hoja del fichero y en la de cambios, las secciones se separaban con una pleca de 1 px en la cabecera de cada una. Cada sección era una lista suelta sobre el papel del panel: la tabla de Métricas, los símbolos, la superficie y las dependencias no tenían canto propio, así que el borde de la tabla se leía como si fuera el del panel. El único contenedor de la app estaba en la hoja Carpeta, alrededor de «Contenido», y estaba ahí por casualidad: la lista de la ficha usaba `.folder-list`, el mismo nombre que la lista del selector de carpetas, y heredaba de ella el filete, el fondo de hoja y el tope de 340 px.

**Qué cambia**: las secciones de primer nivel de Fichero y Cambios se dibujan dentro del contenedor de la carpeta —filete de la casa y papel de la hoja—, con su relleno, y la pleca de arriba desaparece porque el canto ya delimita. Los grupos de dentro la conservan: un grupo de símbolos o un fichero de un cambio sí separan filas. La lista de la hoja Carpeta pasa a `.folder-content`, con el contenedor escrito en sus propias reglas, y el nombre de cada fila a `.folder-row-name`; el selector de carpetas se queda con `.folder-list` y `.folder-name`, que eran suyos, y recupera su tipografía: la mono de 10,5 px que veía la había dejado allí la ficha.

**Por qué así**: el contenedor se escribe una vez en la hoja del fichero y se aplica a las dos por el selector de primer nivel, no dentro del componente, porque los plegables anidados no llevan caja o los cantos se multiplican. Y la caja de la carpeta se saca del préstamo porque un estilo que nace en un diálogo no puede ser la referencia de una ficha: cambiaba el alto de la lista y le ponía scroll propio sin que nadie lo hubiera decidido.

**Lo que se paga**: la cabecera de cada sección pierde la única frontera que tenía, así que el aire entre secciones lo pone el margen y no una línea. Y las secciones nuevas no llevan el tope de alto de la carpeta: crecen con su contenido y scrollea la hoja.

**Veredicto**: arreglo. Sin cambio de comportamiento: las mismas secciones, los mismos datos y el mismo orden.
