---
title: "ADR 0085 — La ruta del mapa navega"
description: "La ruta de carpetas deja la banda del proyecto y pasa al escenario, visible siempre y con cada tramo pulsable. La vista de código que se probó encima queda aparcada: montar mil líneas resaltadas costó tareas de varios segundos."
section: desarrollo
status: aceptado
date: "2026-10-26"
sidebar:
  label: La ruta del mapa navega
  order: 85
---

**Estado:** aceptado · **Fecha:** 2026-10-26

## Contexto

El mapa se recorre de dos maneras: pulsando una carpeta para enfocarla y volviendo con la ruta, que
hasta ahora vivía en la banda del proyecto, al lado del nombre y las cifras
([ADR 0061](../0061-0070/0061-el-marco-del-proyecto.md)). Esa ruta solo aparecía con una carpeta
enfocada y estaba lejos del mapa al que navega: en una banda que habla del proyecto, no del sitio.

Al mismo tiempo se probó abrir el fichero entero en una pestaña **Código** del escenario, con un
doble clic en el mapa: un fichero de mil líneas resaltado con Prism, solo lectura. La idea funciona
de forma aislada —el texto sale bien y el resaltado de 1000 líneas son unas decenas de milisegundos—
pero en la app real el montaje de semejante bloque deja tareas largas: medidas con
`PerformanceObserver`, cambiar el tamaño de la ventana con la pestaña abierta produjo una tarea de
**6,6 s** y el cambio de vista, otras de 88 y 148 ms. Con dos vistas que se turnan, cada cambio vuelve a montar o desmontar
ese bloque, y la app se siente congelada. Arreglarlo pide trocear el pintado (virtualizar líneas), y
eso es otro trabajo, no un retoque.

## Decisión

1. **Una sola vista: el mapa.** Se retira la pestaña **Código** y el doble clic que la abría. Las
   pestañas del escenario vuelven a ser lo que eran: el sitio de las vistas de plugin
   ([ADR 0029](../0021-0030/0029-los-addons.md)), que solo salen cuando hay alguna.
2. **La ruta navega y vive en el escenario.** El rastro de carpetas sale de la banda del proyecto y
   pasa a una línea propia encima del mapa. Cada tramo es un botón que enfoca esa carpeta, la flecha
   sube un nivel y **Todo** vuelve al mapa entero. Los tres estados se leen como navegación: `Todo`
   solo, cuando no hay carpeta enfocada; `Todo / packages / ui` con `ui` como sitio actual.
3. **La ruta está siempre.** También sin foco: el mapa entero se anuncia como `Todo`, que es donde
   estás. Una barra que aparece y desaparece deja de ser un sitio donde volver.
4. **La banda se queda con lo que describe el proyecto**: nombre, snapshot y cifras. La ruta no es
   una cifra del proyecto, es dónde estás mirando.
5. **El código sigue en la ficha.** Lo que ya había —las líneas del símbolo abierto, con **Editor** y
   **Copiar ruta** ([ADR 0067](../0061-0070/0067-la-ficha-ensena-el-codigo.md))— no se toca. La
   vista de fichero entero queda aparcada con lo aprendido: el tope de lectura, el resaltado por
   línea y el coste de montar mil líneas.

## Consecuencias

- La banda gana el ancho que ocupaba la ruta y el escenario gana una línea de 20 px antes del mapa.
- `Esc` y el retroceso siguen saliendo de la carpeta: la ruta es el mismo camino con nombre.
- El estado de la vista en la URL no gana claves nuevas: `focus` sigue diciendo la carpeta
  ([ADR 0018](../0011-0020/0018-estado-vista-en-la-url.md)).
- El ADR 0082 mantiene su banda: pierde la ruta, no cambia de color ni de alto.
- Las capturas que enseñan la ruta junto al nombre del proyecto quedan viejas y hay que rehacerlas.

## Alternativas descartadas

- **Dejar la vista de código y arreglar el tirón después.** Es la primera impresión de la app: una
  pestaña que congela la ventana al entrar y al salir no se arregla con una nota en la hoja de ruta.
- **Pintar el código sin resaltado para que pese menos.** Cambia el problema, no lo resuelve: el coste
  está en el tamaño del bloque, no en Prism, que tarda decenas de milisegundos en mil líneas.
- **Mantener la ruta en la banda y añadir otra en el escenario.** Dos verdades para lo mismo: una
  navega y la otra informa, y nadie sabría cuál pulsar.
- **Abrir el fichero en el editor de la máquina desde el mapa.** Deja el mapa sin poder enseñar
  código y depende de que cada máquina tenga un editor configurado.
- **Un diálogo a pantalla completa.** Tapa el mapa y la ficha a la vez, y no deja ruta a la vista.

## Hoja de ruta

### La ruta del mapa navega

- [x] La ruta sale de la banda y pasa al escenario, siempre visible, con cada tramo pulsable.
- [x] La flecha sube un nivel y **Todo** vuelve al mapa entero.
- [x] Sin carpeta enfocada, la ruta dice `Todo` como sitio actual.
- [x] La vista de código del escenario se retira: ni pestaña ni doble clic.
- [x] Medir y trocear el pintado de una muestra grande: lo trae el editor del [ADR 0086](0086-el-codigo-de-la-ficha-con-editor.md).
- [x] Volver a decidir el fichero entero con esa medida delante: [ADR 0087](0087-el-fichero-entero-en-el-escenario.md).

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
