---
title: ADR 0061 — El proyecto vive en la cabecera y las secciones se pliegan
description: "El nombre del proyecto y sus cifras pasan a una banda pegada a la cabecera, el mapa gana el alto que ocupaba el encabezado y la ficha del fichero estrena secciones plegables que recuerdan su estado."
section: adr
status: aceptado
date: "2026-10-25"
sidebar:
  label: El proyecto vive en la cabecera
  order: 61
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

La parte de arriba del escenario se había quedado con tres capas para decir lo
mismo. La cabecera enseñaba el nombre del proyecto en `snapshot-meta`; justo
debajo, el escenario lo repetía en un `h1` con un rótulo **MAPA** que no
aportaba nada; y al lado, cuatro cifras —ficheros, carpetas, área y deuda— en
una fila que empujaba el mapa hacia abajo. Entre el rótulo, el título y las
cifras se iban más de cien píxeles antes de que empezara el mapa.

Además, la ficha del fichero ya tenía una tabla de veinte métricas (ADR 0060).
Es la lectura correcta, pero ocupa alto y no siempre se necesita entera: quien
está mirando el mapa quiere el riesgo y poco más. Sin una forma de plegarla, la
tabla competía con los símbolos y con el resto del inspector.

## Decisión

Dos cambios, una misma idea: **el contexto arriba, el detalle a un gesto**.

### 1. Una banda del proyecto pegada a la cabecera

El nombre del proyecto y sus cifras dejan el escenario y pasan a una **banda**
de 52 px, a todo el ancho, inmediatamente debajo de la cabecera (M41).

- **Proyecto** es un campo con su rótulo y su valor: el `h1` de la página, una
  sola vez. La cabecera deja de repetirlo en `snapshot-meta`; allí se quedan la
  fuente, el checksum, el commit, el estado del live y el aviso de refresco,
  ahora en una sola línea.
- **Ficheros, carpetas, área y deuda** van a la derecha de la banda, en celdas
  compactas separadas por una línea. El área conserva el nombre de la métrica
  que la decide y la deuda su color.
- La banda es oscura, como la cabecera, para leerse como un solo marco. No
  flota: está pegada y comparte el ancho de la app.
- El **breadcrumb** de la carpeta enfocada sube también a la banda, al lado del
  proyecto, en vez de crear otra fila en el escenario.
- El rótulo **MAPA** y el `h1` del escenario desaparecen. Las pestañas del
  escenario —mapa y vistas de plugins— solo se pintan cuando hay alguna vista
  que elegir; con el mapa solo, eran otro rótulo redundante.
- El alto de la app se calcula con dos variables (`--topbar-h` y `--band-h`),
  así que la banda no rompe el alto completo de la ventana ni el scroll de los
  paneles.

El mapa empieza unos 50 px más arriba y el ojo encuentra el proyecto y las
cifras antes de mirar el mapa, no después.

### 2. Secciones plegables

Nace un componente compartido, `CollapsibleSection`, para las secciones que se
van mejorando. La primera es **Métricas** (M41).

- El título es un **botón** con el texto en negrita, un chevron, la cuenta de
  filas y, si está cerrada, un resumen a la derecha (`Riesgo 54/100`). El título
  deja de ser un `eyebrow` en mayúsculas: se distingue de los campos que hay
  debajo.
- Usa `aria-expanded` y `aria-controls`; el botón nativo ya trae teclado y
  foco. El cuerpo se oculta con `hidden`, así que no se anuncia lo que no se ve.
- El estado se guarda en el almacenamiento local con la clave
  `codarch:section:<id>`. Es una preferencia de lectura, no estado del
  repositorio: sobrevive a cambiar de pestaña, de fichero y de sesión. Si el
  almacenamiento falla, la sección cae a su estado por defecto y no rompe nada.
- El componente no sabe de métricas ni de ficheros. Servirá para las demás
  secciones que se vayan compactando.

**Lo que no cambia:** ni `cc.json`, ni el checksum, ni el `report.json`, ni el
modelo de métricas. Todo es lectura y disposición.

## Consecuencias

- La cabecera dice una vez el proyecto y una vez su contexto; el escenario
  empieza en el mapa.
- La banda ocupa 52 px, pero el escenario ahorra el encabezado y las pestañas
  vacías: el mapa gana alrededor de 50 px de alto.
- La tabla de métricas sigue completa cuando se abre y se reduce a una línea
  cuando se cierra, con el riesgo a la vista en ambos casos.
- El estado plegado es global a la sección, no por fichero: si alguien prefiere
  la ficha compacta, la quiere compacta en todos.
- Las vistas de plugins conservan sus pestañas; sin plugins, el escenario no
  enseña una pestaña que no lleva a ningún sitio.
- Queda abierto aplicar el mismo componente a Reglas, Cambios y a los bloques
  del raíl, y valorar un atajo para plegar o desplegar todo.

## Alternativas descartadas

- **Dejar el `h1` y las cifras dentro del escenario.** Es lo que empujaba el
  mapa y duplicaba el proyecto de la cabecera.
- **Poner la banda dentro de la cabecera, en una segunda fila del mismo
  `header`.** Visualmente es lo mismo, pero complica el alto y el responsive de
  una cabecera que ya tiene tres columnas; una banda hermana se mide sola.
- **Repetir el proyecto en la cabecera y en la banda.** Dos sitios para el mismo
  dato es exactamente lo que se quería quitar.
- **Guardar el plegado en el `.codarch.yml` o en el snapshot.** Es una
  preferencia de la persona, no una decisión del proyecto; no debe viajar con el
  repo ni cambiar el checksum.
- **Plegar solo con CSS (`<details>`).** El resumen y la cuenta se pueden hacer,
  pero el estado no se recuerda entre pestañas y el estilo del `summary` es más
  frágil entre navegadores.

## Hoja de ruta

### M41 - El marco del proyecto

- [x] Una banda pegada a la cabecera con **Proyecto** y las cuatro cifras.
- [x] Fuera el `h1` y el rótulo **MAPA** del escenario; el breadcrumb sube a la
  banda.
- [x] Las pestañas del escenario solo cuando hay vistas de plugins.
- [x] La cabecera deja de repetir el nombre del proyecto y junta su contexto en
  una línea.
- [x] `CollapsibleSection` con título en negrita, cuenta, resumen, chevron y
  `aria-expanded` / `aria-controls`.
- [x] **Métricas** es la primera sección plegable y recuerda su estado en el
  almacenamiento local.
- [ ] Llevar el componente a **Reglas**, **Cambios** y los bloques del raíl.
- [ ] Un atajo para plegar o desplegar todas las secciones.

El registro de lo hecho vive en el [feed de la guía](/guia/).
