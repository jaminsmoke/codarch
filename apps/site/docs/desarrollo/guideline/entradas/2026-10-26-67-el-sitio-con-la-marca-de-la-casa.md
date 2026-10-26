---
title: El sitio, con la marca de la casa
date: "2026-10-26"
category: fix
verdict: arreglo
---

**Qué era**: el sitio tenía un azul propio —cobalt `#2f6fed`— como color de marca: los enlaces, el acento de la portada, las etiquetas en versalitas y la pastilla de la sección activa en la cabecera de los documentos. No es el color de la app, cuya marca es tinta y rust, y además no llegaba al contraste: 4,01:1 sobre el papel, donde AA pide 4,5, y 3,63:1 sobre su propio tinte. El `theme-color` pintaba la barra del navegador de ese azul, que no aparecía en ninguna parte del cromo. Y al pasar el ratón por un enlace de la cabecera de los documentos el texto se volvía blanco sobre gris 6: 1,14:1, invisible.

**Qué cambió**: el acento del sitio es el de la casa, con dos valores como los del diff de la app. `--color-rust` (`#d95d39`) para las masas —el filete de una cita, el fondo de la entradilla, el número del día en la guía, el foco— y `--color-rust-ink` (`#a83a1e`) para el texto pequeño. En oscuro, `#f08a6c`, que cumple en texto y en trazo. Los tokens de Starlight —`accent`, `accent-low`, `accent-high` y `text-accent`— salen de esos dos, así que la portada, la guía y los documentos dejan de cambiar de acento al cambiar de página. El `theme-color` pasa a ser el del papel (`#eef1f2`) y el del fondo oscuro (`#10161b`), en dos etiquetas con `prefers-color-scheme`, y lo emite un componente, `components/Tema.astro`, que comparten las dos plantillas del sitio.

**Números**: los enlaces pasan de 4,01:1 a 5,62:1 sobre el papel; la pastilla activa, de 3,63:1 a 5,08:1 sobre `accent-low`; el enlace de la cabecera, de 1,14:1 a 15,49:1. Medidos con la fórmula de contraste de WCAG sobre los valores de los tokens, antes y después. El azul se queda solo donde es una categoría —las etiquetas «ADR» y «Novedades» de la guía—, que es una leyenda y no la marca.

**Veredicto**: arreglo, sin fase ni ADR. El sitio no tiene temas propios: sigue al del sistema con `prefers-color-scheme`, y sus tokens viven en `apps/site/src/styles.css` y `apps/site/src/styles/starlight.css`. Cuando Ajustes › General elija tema (entrada 64, ADR 0082), estos valores son los que hay que mover, no copiar.
