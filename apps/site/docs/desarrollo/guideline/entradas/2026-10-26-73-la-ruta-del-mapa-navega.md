---
title: La ruta del mapa navega
date: "2026-10-26"
category: feature
verdict: adr
---

**Qué era**: la ruta de carpetas vivía en la banda del proyecto, junto al nombre y las cifras, y solo salía con una carpeta enfocada. Para volver arriba había que ir a buscarla lejos del mapa al que navega. Aparte, se probó abrir el fichero entero en una pestaña **Código** del escenario con doble clic: funcionaba, pero montar mil líneas resaltadas dejaba tareas de varios segundos y la app se sentía congelada al entrar y al salir.

**Qué es**: la ruta pasa al **escenario**, encima del mapa, y está **siempre**: sin carpeta enfocada dice `Todo` como sitio actual y, al enfocar, cada tramo —`Todo / packages / ui / src`— es un botón que navega; la flecha sube un nivel. La pestaña **Código** y su doble clic se retiran: el escenario vuelve a tener una sola vista, y las pestañas quedan para las vistas de plugin ([ADR 0085](../adr/0081-0090/0085-la-ruta-del-mapa-navega.md)).

**Por qué así**: en la app real, abrir el fichero entero costaba una tarea de **6,6 s** al cambiar el tamaño de la ventana y de 88–148 ms al alternar, medidas con `PerformanceObserver`; el resaltado en sí son 20 ms por cada 1558 líneas, así que el problema es el tamaño del bloque, no Prism. Arreglarlo pide trocear el pintado, y eso es otro trabajo. La ruta, en cambio, es lo que se usa a diario para moverse: ponerla donde se mira y hacerla pulsable es barato y quita una excusa para tener dos vistas.

**Cómo se comprueba**: con el repo abierto, el mapa entero enseña `Todo` como sitio actual; al enfocar `packages/ui/src` la ruta muestra `← Todo / packages / ui / src`, pulsar `ui` sube a esa carpeta y **Todo** vuelve al mapa entero; la URL solo cambia `focus`. En el escenario no aparece ninguna pestaña si no hay vistas de plugin. `packages/ui/test/viewState.test.ts` sigue cubriendo `focus` en la URL.

**Veredicto**: ADR 0085, sin fase nueva. Queda abierto medir y virtualizar el pintado de una muestra grande antes de volver a ofrecer el fichero entero.
