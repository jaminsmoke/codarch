---
title: La cabecera no se mueve
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué era**: los documentos tenían la cabecera de Starlight, sin **Inicio** ni **Guía**, así que
desde un ADR no se podía volver al resto del sitio. Y al cambiar de día en la guía se recargaba la
página entera: la cabecera y la línea del tiempo se montaban otra vez y sus animaciones se cortaban.

**Decisión**: la cabecera de los documentos añade **Inicio**, **Guía** y **Documentos** con un
override de `Header`, sin perder la búsqueda, el tema ni el GitHub. La guía es una sola isla: la
cabecera y la línea del tiempo se montan una vez y solo cambia el contenido de abajo; la URL se
mueve con `history.pushState`, así que cada día conserva la suya.

**Veredicto**: **arreglo**, hecho. La navegación del sitio queda completa y la guía deja de
recargarse al pasar de un día a otro.
