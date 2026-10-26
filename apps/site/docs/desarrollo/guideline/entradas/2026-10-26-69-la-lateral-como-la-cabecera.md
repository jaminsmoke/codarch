---
title: La lateral, como la cabecera
date: "2026-10-26"
category: fix
verdict: arreglo
---

**Qué era**: los documentos tenían dos criterios de color. La cabecera acababa de unificarse —IBM Plex Sans a 14 px, pastilla de 0,5 rem, filete de `#c8d1d5`, activo en rust sobre un tinte suave— y la barra lateral seguía con el suyo: 16 px, filetes más claros y el activo en rust entero. Y había algo peor: en Starlight `--sl-color-white` es la **tinta** y `--sl-color-black` el **fondo**, no dos colores, y los tokens estaban cruzados. En claro eso dejaba la lateral escribiendo blanco puro sobre papel —1,14:1, invisible salvo el activo— y el cajón de móvil pintado de oscuro dentro de una página clara; el gris secundario se quedaba en 4,37:1, por debajo de AA.

**Qué cambió**: los dos tokens vuelven a su sitio —tinta y fondo, en los dos temas—, lo que arregla de paso el cajón, el diálogo de búsqueda y el índice de la página, que usaban los mismos valores. La lateral toma la letra de la cabecera: 14 px, pastilla de 0,5 rem, hijos en gris y destinos de zona con su peso; el activo pasa a ser el tinte del acento al 12 % con el rust de texto encima, y el árbol de los hijos lleva el mismo filete que la cabecera. Las etiquetas de grupo —CLI, Decisiones, cada carpeta de diez— estrenan la versalita mono de los códigos de idioma, que marca epígrafe sin competir con los enlaces. El gris secundario baja a `#55626a`, el mismo `--color-muted` de la web.

**Cómo se comprueba**: `sidebar-paleta.test.ts` lee los tokens de `styles/starlight.css`, compone el tinte al 12 % sobre el fondo de la lateral y mide el contraste del activo, de los enlaces y de las etiquetas en los dos temas; con el gris viejo, falla. En el navegador, un barrido de todo el texto de la página —contenido, lateral, índice y paginación— no encuentra ningún par por debajo de 2:1 en claro ni en oscuro, y el cajón de móvil ya se pinta con el papel del tema.

**Veredicto**: arreglo, sin ADR. La forma la fijó la entrada 68; esto es la misma barra aplicada a la lateral.
