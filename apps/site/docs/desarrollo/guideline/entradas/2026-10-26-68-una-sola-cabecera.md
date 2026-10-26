---
title: Una sola cabecera
date: "2026-10-26"
category: fix
verdict: arreglo
---

**Qué era**: el sitio tenía una cabecera para la portada y la guía y otra para los documentos. La de los documentos era la misma barra, pero metida en el marco de Starlight, que reserva a la derecha el hueco de su botón de menú: el botón flotaba **fuera** de la barra, la barra quedaba más estrecha que la página y el tema no caía pegado al idioma. Dentro, el buscador de Starlight pedía `width: 100%` y, al compartir fila con el idioma y el tema, se comía su ancho: el enlace al repo acababa encogido a 17 px en vez de 24. En móvil se veía de un vistazo: 448 px de barra en una ventana de 466. Y el cajón lateral traía su propio juego de tema e idioma, dos mandos para lo mismo a un palmo de distancia.

**Qué cambió**: el botón del menú entra en la barra por un `slot` y deja de flotar; el marco de Starlight pierde el relleno que le hacía hueco y la barra ocupa el ancho de la página en las dos familias. Idioma y tema pasan a ser una sola pieza, `barra-preferencias`, con su filete y 0,3 rem entre ellos. El buscador recibe un ancho propio de 14 rem y el resto de la fila no encoge, así que cada mando conserva su tamaño. El pie del cajón lateral —el `MobileMenuFooter` de Starlight, con su selector de tema y su idioma— se va: la cabecera ya los trae también en móvil.

**Cómo se comprueba**: `barra.test.ts` vigila que los dos layouts monten `<Barra>`, que el marco no dibuje cabecera, que el buscador y el menú entren dentro de la barra, que el tema viva en el grupo del idioma y que el cajón no repita los mandos. Medido en el navegador, la caja del enlace al repo cae en el mismo píxel en la portada, la guía y los documentos.

**Veredicto**: arreglo, sin ADR. Es la forma de la cabecera que ya decidió la ADR 0081 —una barra para las dos zonas—, llevada hasta el final.
