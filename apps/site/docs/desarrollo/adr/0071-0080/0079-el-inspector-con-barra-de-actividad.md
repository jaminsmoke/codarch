---
title: "ADR 0079 — El inspector con barra de actividad"
description: "Fichero y Cambios dejan de ser pestañas de texto: una barra de actividad vertical, fija y solo con iconos, elige el apartado del inspector y deja sitio a los que vengan."
section: desarrollo
status: aceptado
date: "2026-10-26"
sidebar:
  label: El inspector con barra de actividad
  order: 79
---

**Estado:** aceptado · **Fecha:** 2026-10-26

## Contexto

El [ADR 0069](../0061-0070/0069-dos-pestanas.md) dejó **Fichero** y **Cambios** como dos pestañas de texto en la
cabecera del panel derecho. Con dos funcionaba; con el panel creciendo, no:

- La tira de pestañas vive **dentro** del `aside` que scrollea. Al bajar por una ficha larga —un
  fichero con muchos símbolos o un cambio con treinta filas— el único control para cambiar de
  apartado se va hacia arriba y desaparece.
- El panel mide 302 px. Cada apartado nuevo cobra ancho al contenido y obliga a encoger etiquetas que
  ya van a 9,5 px con `letter-spacing`: **Símbolos**, **Dependencias** y compañía caben porque viven
  dentro de la ficha, pero un cuarto o quinto apartado de primer nivel no cabe como texto.
- Una tira horizontal no escala: o se parte en dos filas o se convierte en un menú. La barra de
  actividad —iconos en vertical, pegada al borde— sí, y es lo que la app ya insinúa con la columna
  de herramientas del raíl.

## Decisión

1. **Una barra de actividad vertical, a la derecha del panel.** El `aside` del inspector y la barra
   viven en un contenedor propio (`.inspector-dock`): el panel conserva su ancho y su scroll, y la
   barra —44 px— queda fija contra el borde derecho. Nada de la barra scrollea con la hoja.
2. **Solo iconos, con nombre.** Cada entrada es un botón de 32 × 32 con su icono, su `title` y su
   `aria-label`; el punto de «hay cambios sin commitear» viaja sobre el icono de **Cambios** en vez de
   al lado de una etiqueta.
3. **Una lista, no dos botones.** Las secciones son datos (`INSPECTOR_SECTIONS`), tipadas por
   `InspectorTab`: añadir un apartado es una entrada y su hoja, sin tocar el armazón. La URL y las
   vistas guardadas siguen hablando `tab=file|changes` y los nombres viejos se traducen igual
   (ADR 0069).
4. **Navegación, no `tablist`.** La barra es navegación persistente de la app, no una fila de
   pestañas que se reordena: `nav` + `aria-current="page"` en la entrada activa, y el panel se anuncia
   con el nombre del apartado. Así no se promete navegación con flechas que la barra no hace.
5. **En estrecho, la barra se tumba.** Por debajo de 820 px el panel se apila a lo ancho y la barra
   pasa a una fila horizontal encima de él, con el mismo orden de documento: el control sigue a la
   vista sin robar alto al mapa.

## Consecuencias

- Cambiar de apartado ya no depende de dónde esté el scroll: la barra está siempre a la vista.
- Añadir un apartado cuesta una entrada en la lista y su hoja; no cuesta ancho del panel ni etiquetas.
- Desaparece el CSS de las pestañas del inspector (`.tabs`, `.tab`); el punto pasa a `.inspector-dot`
  sobre el icono. Las pestañas del escenario (`Mapa` + plugins) no se tocan: son otra cosa.
- La web y el escritorio no cambian de API: el estado sigue siendo `tab` y `setTab`.
- Tests: cada `InspectorTab` tiene su entrada, con etiqueta no vacía y sin repetir, y el orden de la
  barra es estable.

## Alternativas descartadas

- **Seguir con pestañas de texto.** Es lo que hay: el scroll se las lleva y el tercer apartado ya no
  cabe sin encoger el contenido.
- **La barra dentro del panel, encima del contenido.** Vuelve a scrollear con la hoja y repite el
  problema que se viene a arreglar.
- **La barra a la izquierda del panel.** Compite con el raíl del mapa, que ya ocupa ese borde con las
  herramientas de la vista.
- **Iconos sin etiqueta.** Un icono de «cambios» y otro de «fichero» se adivinan; el quinto, no. El
  `title` y el `aria-label` mantienen el nombre sin gastar ancho.
- **`role="tablist"` con pestañas.** Promete navegación con flechas y un panel asociado por
  `aria-controls` que la barra no implementa; `nav` + `aria-current` dice la verdad.

## Hoja de ruta

### M60 — El inspector con barra de actividad

- [x] `InspectorBar` con la lista de secciones y el punto de cambios sobre el icono.
- [x] El armazón agrupa panel y barra; el panel deja de tener la tira de pestañas dentro del scroll.
- [x] La barra se tumba en pantallas estrechas, encima del panel.
- [x] Tests de la lista: una entrada por apartado, etiquetas únicas y orden estable.
- [x] Comprobado en la app servida: la barra fija al hacer scroll y el cambio de hoja desde los iconos.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
