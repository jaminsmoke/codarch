---
title: La voz de la guía, en los documentos
date: "2026-10-26"
category: fix
verdict: arreglo
---

**Qué era**: la guía es la referencia escrita del proyecto —display en los títulos, 16 px de texto con 1,65 de interlínea, 72 caracteres de línea, filetes de `#c8d1d5`, tablas con la celda dibujada— y los documentos llevaban la escala de Starlight: h1 de 42 px en la sans, h2 de 35 px, h3 de 29 px, párrafos de 28 px de interlínea y tablas dibujadas solo con la línea de abajo. Pasar de una zona a otra cambiaba el producto: el h1 de los documentos ni siquiera estaba en Bricolage.

**Qué cambió**: el título de la página (`h1#_top`) pasa a Bricolage 700 a `clamp(2rem, 3.2vw, 2.6rem)`, con 1,05 de interlínea y −0,025 em de tracking, como el de la guía. Los h2 bajan a 1,4 rem y abren la sección con el filete de la guía —`padding-top` de 0,6 rem y 2,6 rem por arriba—; los h3 a 1,05 rem y los h4 a 0,96. El texto toma 72 caracteres de línea con 1,65 de interlínea y 0,9 rem entre párrafos, los enlaces van en el rust de lectura con subrayado de 1 px (2 al pasar), el código suelto al 8 % de tinta con 4 px de esquina y las citas al filete de 3 px y el tinte del 5 % de la entradilla. Las tablas estrenan la celda entera de 1 px con `th` sobre el panel de la casa —`#f6f8f8`, que en oscuro es `#161e24`— y 0,4 × 0,6 rem de relleno. Los bloques de código, que traían esquinas de un píxel, pasan a 8 px.

**Cómo se comprueba**: `contenido.test.ts` lee las dos hojas y compara los números —h2, h3, tabla, código suelto, 72ch e interlínea 1,65—, así que un cambio en una que deje a la otra atrás falla. Medido en el navegador, el h1 cae en 41,6 px en escritorio y 32 en móvil, la interlínea en 26,4 px, la tabla ocupa el ancho del contenido sin desbordar y el `th` se lee sobre su panel en los dos temas.

**Veredicto**: arreglo, sin ADR. La escala es la que ya estaba escrita en `styles.css`; esto la lleva a la otra familia de páginas.
