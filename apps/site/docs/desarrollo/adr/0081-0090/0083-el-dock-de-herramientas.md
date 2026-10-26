---
title: "ADR 0083 — El dock de herramientas"
description: "El raíl pasa a llamarse toolbar y gana un dock propio, espejo del inspector: una barra de 44 px a la izquierda con el mapa —que pliega la hoja— y, al pie, el engranaje de Ajustes que antes vivía en la cabecera."
section: desarrollo
status: aceptado
date: "2026-10-26"
sidebar:
  label: El dock de herramientas
  order: 83
---

**Estado:** aceptado · **Fecha:** 2026-10-26

## Contexto

Tres cosas se juntaban mal en el lado izquierdo de la app:

- El panel se llamaba **rail** —«raíl»— en el marcado y en el CSS, mientras al otro lado el
  [ADR 0079](../0071-0080/0079-el-inspector-con-barra-de-actividad.md) ya había nombrado un **dock** con
  su **barra de actividad**. Dos nombres para lo mismo: el raíl era la hoja, no la barra, y en el código
  no se sabía si se hablaba del panel o de su franja.
- El **engranaje de Ajustes** vivía en la cabecera, entre el botón de abrir repositorio y el menú de
  vistas. Ajustes es de la app, no del proyecto abierto, y ahí competía con lo que sí es del proyecto;
  con la ventana estrecha, además, se apiñaba con los botones de plataforma.
- El panel de la izquierda ocupaba sus 258 px siempre y no había manera de plegarlo. En un repo grande
  el mapa perdía ese ancho para tener a la vista unos controles que ya se sabe.

## Decisión

1. **El dock de herramientas es el espejo del dock del inspector.** `.tool-dock` junta la barra —
   `.tool-bar`, 44 px— y la hoja — `.toolbar`, 258 px—, con la barra por fuera, en el canto de la
   ventana. El dock derecho hace lo mismo con la barra por fuera del suyo: el contenido queda entre las
   dos franjas.
2. **El raíl se llama toolbar.** Desaparece `rail` del marcado y del CSS. La hoja de herramientas es
   `.toolbar` y su barra `.tool-bar`; la diferencia de un guion es la diferencia entre el panel y la
   franja, y el ADR lo dice para que no se confundan.
3. **La barra lleva el marco, no la hoja.** Mismo color y mismos estados que la barra del inspector
   ([ADR 0082](0082-el-marco-de-la-app.md)): la app queda rodeada por el armazón y las hojas dentro.
   En estrecho se tumba encima de su hoja, como la del inspector.
4. **El icono del mapa pliega la hoja.** Es la convención de un editor: pulsar la herramienta activa la
   pliega, y el mapa gana esos 258 px. El estado se recuerda entre visitas con el almacenamiento de las
   secciones plegables ([ADR 0061](../0061-0070/0061-el-marco-del-proyecto.md)), no en el repositorio.
   Con la hoja plegada el dock mide 44 px y la franja sigue a la vista.
5. **El engranaje de Ajustes baja a la barra.** Al pie, separado de las herramientas, y marcado
   mientras el diálogo está abierto. La cabecera se queda con lo del proyecto abierto. Los ajustes no
   cambian de API: el estado sigue siendo `settingsOpen` y `setSettingsOpen`.
6. **Las herramientas son datos.** `TOOL_ENTRIES` es una lista: añadir una herramienta es una entrada y
   su hoja en el dock, igual que un apartado del inspector (ADR 0079).

## Consecuencias

- La rejilla del armazón pasa a `auto minmax(0, 1fr) 346px`: la franja izquierda la mide el dock —44 +
  258—, así que plegar la hoja no necesita ninguna regla más.
- La hoja tiene ancho fijo (258, y 226 a partir de 1180 px) para que un texto largo no estire el dock y
  el mapa pierda lo que no debe.
- En la cabecera desaparece un botón que no era del proyecto; el escritorio mantiene su entrada de menú
  para Ajustes, que es otra cosa.
- Se borra el CSS de `.rail-settings`, que ya no usaba ningún componente.
- Tests: `TOOL_ENTRIES` tiene una entrada por herramienta, con nombre y pista y sin repetir, y
  `toolLabel` da el nombre de la hoja.
- Las capturas que enseñan el engranaje en la cabecera y el raíl quedan por rehacer.

## Alternativas descartadas

- **Dejar el engranaje en la cabecera.** Es una acción de la app, no del proyecto, y en estrecho se
  apiña con los botones de plataforma.
- **Una barra sin nada que plegar.** El icono del mapa no tendría qué hacer: una entrada que se puede
  pulsar y no cambia nada no se distingue de un adorno.
- **La barra por dentro, junto al mapa.** Pierde el canto de la ventana y compite con el borde del
  marco, que es justo lo que el ADR 0082 vino a ordenar.
- **Dos nombres parecidos para barra y hoja** (`rail` de un lado, `toolbar` del otro). Es el problema
  que este ADR viene a quitar.
- **Guardar si la hoja está plegada en el repositorio.** Es una preferencia de lectura, como el estado
  de una sección: no viaja con el código.

## Hoja de ruta

### El dock de herramientas

- [x] El raíl pasa a `toolbar`; el marcado y el CSS dejan de decir `rail`.
- [x] El dock con su barra de 44 px, con el color del marco y sus estados.
- [x] El icono del mapa pliega la hoja y el estado se recuerda entre visitas.
- [x] El engranaje de Ajustes, al pie de la barra, fuera de la cabecera.
- [ ] Rehacer las capturas que enseñan el engranaje en la cabecera y el raíl.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
