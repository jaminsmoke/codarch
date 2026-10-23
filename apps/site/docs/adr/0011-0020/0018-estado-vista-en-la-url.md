---
title: ADR 0018 — Estado de vista en la URL y carga por URL
description: "La app web (M5) sabe cargar un snapshot de tres maneras: el servidor local (codarch serve), un fichero o carpeta local, y la demo. El estado de la vista —métrica de…"
section: adr
status: aceptado ✅
date: "2026-10-21"
sidebar:
  label: Estado de vista en la URL y carga por URL
  order: 18
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-21

## Contexto

La app web (M5) sabe cargar un snapshot de tres maneras: el servidor local (`codarch serve`), un
fichero o carpeta local, y la demo. El estado de la vista —métrica de área, color, carpeta enfocada,
fichero seleccionado y pestaña del panel— vivía solo en memoria.

Eso deja tres huecos:

1. **No se puede compartir una vista.** Para explicar un hotspot hay que repetir la métrica, el color
   y el fichero a mano.
2. **La recarga pierde el contexto.** Vuelve al estado por defecto, aunque las preferencias de área y
   color sí se guardaban en `localStorage`.
3. **Los artefactos generados por la acción no se pueden abrir en la app.** El PR produce un
   `snapshot.cc.json` y un `report.json`; abrirlos exigía descargarlos y usar el selector de ficheros.

## Decisión

1. **El estado de vista vive en la query string.** Las claves son cortas y estables porque la URL se
   comparte y se pega en tickets: `area`, `color`, `focus`, `file`, `tab`, `symbol`, `labels`, `src` y
`report`.
   `apps/web/src/viewState.ts` es el módulo puro que la lee y la escribe; no depende de React.
2. **El estado se escribe con `replaceState`, no con `pushState`.** El navegador genera una entrada
   por cambio de vista; no interesa el historial de arrastres de slider.
3. **El fichero se identifica por ruta, no por índice.** El índice depende del orden del árbol y
   cambia al reanalizar o al cambiar la métrica de área. La ruta es la identidad estable, y el
   índice se recalcula al vuelo. Como efecto colateral, cambiar de métrica ya no pierde la selección.
4. **El símbolo abierto también viaja.** Con la lente de símbolos (M11) y las cadenas (M12), la vista
   puede tener abierta la vida de una función ✓. Sin `symbol` en la URL, ese estado se pierde al
   compartir el enlace ✓: la función abierta deja de ser la función abierta ✓.

5. **Los nombres de los bloques también viajan** (`labels` ✓). Si el mapa los enseña aunque no quepan
   enteros ✓, un enlace tiene que decirlo ✓: en la otra pantalla se vería distinto ✓.

6. **Los parámetros que no encajan se ignoran.** Una métrica que el snapshot no tiene, una carpeta
   que no está o un fichero borrado no rompen la app: el enlace es una pista, no un contrato.
5. **`src` manda sobre el servidor local y sobre la demo.** Si la URL pide un snapshot, se carga ese.
   Si la carga falla, se muestra el error y no se cae a otro origen: mostrar datos de otro sitio
   sin avisar sería peor que no mostrar nada.
6. **CORS es una limitación explícita.** Una URL remota solo se puede leer si el servidor permite
   CORS. El mensaje de error lo dice. La ruta normal es servir el fichero desde el mismo origen.
7. **La app no escribe en `localStorage` lo que ya está en la URL.** Las preferencias de área y color
   siguen guardándose, pero el enlace manda cuando está presente.

## Consecuencias

- El enlace es el estado: recargar, compartir o pasar el enlace a otra persona reproduce la vista.
- Los parámetros ajenos a la app en la query string se conservan al reescribir la URL.
- La URL se reescribe en cada cambio de vista; con `replaceState` no llena el historial del
  navegador.
- La carga por URL amplía lo que la app puede abrir: un artefacto de la acción servido por el mismo
  origen, o cualquier `cc.json` publicado con CORS.
- No se puede compartir el *datos* de un fichero local: el enlace lleva la vista, no el snapshot. Para
  eso está `codarch serve` o cargar el `cc.json` en la URL.
- El botón **Copiar enlace** depende del portapapeles del navegador; si no hay permiso, el enlace
  sigue visible en la barra de direcciones.

## Alternativas descartadas

- **Guardar el estado solo en `localStorage`.** No se puede compartir ni enlazar. Es lo que había
  antes para área y color.
- **Fragmento (`#...`) en vez de query string.** No llega al servidor, así que el `serve` no podría
  interpretarlo, y se mezcla con las anclas de la página.
- **Estado en la ruta (`/mapa/<area>/<color>/...`).** URLs másBonitas, pero chocan con las rutas del
  servidor estático y obligan a reescribir el enrutado.
- **Subir los artefactos a algún sitio y enlazar a esa URL.** Implica un servicio remoto, que el
  producto no quiere en v1.
- **Fallar al snapshot de la URL y caer a la demo.** Esconde el error: el usuario creería que está
  viendo lo que pidió.

## Hoja de ruta

Sin fases abiertas; esta decisión se aplica en M5 y M5.1.
