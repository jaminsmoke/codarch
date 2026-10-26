---
title: "ADR 0082 — El marco de la app"
description: "La barra de actividad del inspector pierde el color de las hojas y comparte el de la cabecera: el armazón cierra por el borde derecho. Los colores del marco pasan a cuatro tokens para cuando Ajustes elija tema."
section: desarrollo
status: aceptado
date: "2026-10-26"
sidebar:
  label: El marco de la app
  order: 82
---

**Estado:** aceptado · **Fecha:** 2026-10-26

## Contexto

El [ADR 0079](../0071-0080/0079-el-inspector-con-barra-de-actividad.md) dio al inspector una barra de
actividad de 44 px contra el borde derecho y la pintó con `--paper`, el color del escenario. Con eso
la app ganó el control fijo, pero la franja quedó como una tira suelta entre la hoja clara y el canto
de la ventana: el armazón no cerraba por la derecha y, a un vistazo, la barra se leía como un resto
del panel.

El armazón ya tenía color desde el [ADR 0061](../0061-0070/0061-el-marco-del-proyecto.md): la
cabecera en `--ink` (#121a20) y la banda del proyecto en #1b262e. Las dos son oscuras, pero no son lo
mismo: la banda es una banda de cifras pegada a la cabecera; la cabecera es el borde de la app. Con
la barra clara, ese borde se acababa en la esquina.

De paso, los colores del armazón estaban escritos a mano en cada regla (`#f3f6f5`, `#93a2a8`,
`#05090c`), que es lo que estorba en cuanto haya más de un tema.

## Decisión

1. **El marco y las hojas son dos capas.** La cabecera y la barra de actividad comparten `--frame`
   (#121a20) y su tinta `--frame-ink`; las hojas —raíl, escenario, inspector— siguen en `--panel` y
   `--paper`. La barra es la cabecera continuando por el borde derecho, y el contenido queda dentro
   de un armazón cerrado por los cuatro lados.
2. **La banda del proyecto no es marco.** Se queda en su tono (#1b262e): es una banda de datos, no
   el borde de la app. Así la esquina de arriba a la derecha enseña tres tonos con significado
   distinto en vez de dos oscuros casi iguales.
3. **La junta con la hoja es oscura.** `--frame-edge` (#05090c) es la pleca de 1 px entre la barra y
   la hoja, la misma que la cabecera lleva abajo: donde acaba el marco, se ve que acaba. En estrecho,
   cuando la barra se tumba encima de la hoja (ADR 0079), la pleca pasa a ser la de abajo.
4. **Los estados se leen sobre oscuro.** En reposo el icono va en `--frame-muted` (#93a2a8); al pasar
   el ratón, blanco al 8 % de fondo y tinta clara; el apartado activo lleva un 10 % de blanco, la
   tinta clara y la pleca interior en claro, que es la marca que antes era oscura sobre hoja clara. El
   punto de «hay cambios sin commitear» se queda como estaba.
5. **Los colores del marco son cuatro tokens.** `--frame`, `--frame-ink`, `--frame-muted` y
   `--frame-edge`, en el `:root`; la cabecera y la barra tiran de ellos. Ningún acento se toca: el
   cobalto, el óxido, el verde y la deuda siguen diciendo lo que decían.
6. **El tema se elige en Ajustes → General, no aquí.** Esta decisión no trae selector de tema ni
   cambia de tono con el sistema: deja los colores del armazón en un sitio para que la fase del tema
   los mueva. Queda anotado en la guía como idea.

## Consecuencias

- El marco cierra los cuatro lados: cabecera, banda, barra y hojas. La app se lee como un armazón con
  contenido dentro, no como tres paneles sueltos.
- La cabecera no cambia de píxel: usa los tokens con los valores que ya tenía.
- La barra mide lo mismo (44 px, botones de 32 × 32); cambian el color, la pleca y el estado activo.
- Un tema nuevo es cambiar cuatro valores en `:root`; lo que no es marco —hojas, acentos, estados de
  datos— no se entera.
- Las capturas de la webapp y de primeros pasos que enseñan el inspector enseñan todavía la franja
  clara: están por rehacer.
- El contraste queda medido: icono en reposo 6,6:1, apartado activo 15,9:1 y el punto rojo 4,7:1
  sobre el marco.

## Alternativas descartadas

- **Dejar la barra en `--paper`.** Es lo que había: el armazón no cierra y la franja no dice de quién
  es.
- **Pintar el dock entero de oscuro.** Se come la hoja del inspector, que es donde se lee.
- **Dar a la barra el tono de la banda.** Dos oscuros casi iguales pegados en la esquina, y la banda
  deja de ser una banda de cifras para parecer borde.
- **Un acento para la barra (cobalto, verde).** Le da significado de estado a algo que solo es el
  borde: el acento dice qué está elegido, no dónde acaba la ventana.
- **Decidir ya el tema oscuro.** Es una capacidad con su ajuste y su contraste; se decide en su fase,
  no de paso en un arreglo de marco.

## Hoja de ruta

### El marco de la app

- [x] La barra de actividad con el color del marco, su pleca oscura y sus estados sobre oscuro.
- [x] Los colores del marco en cuatro tokens; la cabecera tira de ellos.
- [ ] El tema —claro, oscuro, el del sistema— en Ajustes → General, anotado en la guía como idea.
- [ ] Rehacer las capturas de la webapp y de primeros pasos que enseñan el inspector.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
