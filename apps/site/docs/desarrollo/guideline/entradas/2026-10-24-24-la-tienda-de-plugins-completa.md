---
title: La tienda de plugins, completa
date: "2026-10-24"
category: feature
verdict: arreglo
---

**Qué es**: que la sección **Plugins** de los ajustes enseñe el estado de la tienda de un vistazo:
cuántos hay instalados, cuántos activos y cuántos fallan; y que cada plugin diga qué aporta.

**Por qué**: la lista ya existía (título, versión, descripción, interruptor), pero no se veía el
conjunto ni qué añade cada plugin, y la tienda parecía otra cosa.

**Qué cambió**: un resumen arriba («1 plugin instalado · 0 activos en esta máquina»), una línea por
plugin con sus vistas y requisitos (WebGL2, GPU) y un desplegable **Detalles** con lo que aporta y el
comando para quitarlo del repo (`codarch plugins remove <nombre>`). El resumen se calcula con
`summarizePlugins` y tiene tests.

Sigue igual lo de fondo: los plugins son **código del repositorio** y van compilados en la app; la
tienda los activa en esta máquina y el CLI los instala en el repo. Un catálogo con descarga en
tiempo de ejecución exige cargar código externo con sandbox y su propio ADR.

**Veredicto**: arreglo de la tienda de M14, dentro de ADR 0028 y ADR 0053.
