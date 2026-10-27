---
title: "ADR 0087 — El fichero entero, en el escenario"
description: "Doble clic en el bloque de un fichero y el escenario pinta su código completo, de solo lectura, sin pestaña: la ruta pasa a llevar su nombre y cualquier tramo —o Esc— devuelve el mapa. La lectura va con tope y el editor es el mismo de la ficha."
section: desarrollo
status: aceptado
date: "2026-10-27"
sidebar:
  label: El fichero entero, en el escenario
  order: 87
---

**Estado:** aceptado · **Fecha:** 2026-10-27

## Contexto

El [ADR 0085](0085-la-ruta-del-mapa-navega.md) retiró la pestaña **Código** que abría el fichero
entero desde el mapa: montar cientos de líneas resaltadas dejaba el hilo bloqueado —medido después,
**21,8 s** con 770 líneas— y con dos vistas que se turnan cada cambio volvía a pagarlo. El
[ADR 0086](0086-el-codigo-de-la-ficha-con-editor.md) cambió el código de la ficha a CodeMirror 6,
que pinta solo el viewport: el mismo bloque pasa a montar en **5–17 ms** y deja de bloquear.

Con esa base, ver el fichero entero vuelve a estar al alcance. Lo que no se quiere es otra pestaña:
el escenario tiene una sola vista, y la ruta que se movió al escenario en el 0085 es la navegación.

## Decisión

1. **Doble clic en el bloque de un fichero** y el escenario pinta su código completo en lugar del
   mapa. Un clic sigue seleccionando el fichero para la ficha, como siempre.
2. **No hay pestaña.** El mapa se sustituye, no se turnan dos vistas: las pestañas del escenario
   siguen siendo solo para las vistas de plugin ([ADR 0029](../0021-0030/0029-los-addons.md)).
3. **La ruta es la vuelta.** Con el fichero abierto, la ruta añade su nombre —`Todo / packages / ui /
   useCodarchApp.tsx`— y cualquier tramo, **Todo** o la flecha vuelven al mapa; `Esc` también. La
   cabecera del código lleva además un **← Mapa**, para quien no mire a la ruta. El fichero no se
   pierde de la ficha: sigue seleccionado en el inspector.
4. **El estado no va a la URL.** Abrir el código es un gesto de la vista, no un sitio: no se añade
   ninguna clave a la URL del [ADR 0018](0011-0020/0018-estado-vista-en-la-url.md) y el código no se
   comparte por enlace. Se cierra también al cargar otro snapshot. **Enmendado por el
   [ADR 0088](0088-el-fichero-abierto-va-en-la-url.md):** el fichero abierto va en la URL con la
   clave `code`.
5. **Se lee el fichero entero, con tope.** La plataforma sirve hasta **5.000 líneas y 4 MB** por la
   misma puerta que una muestra (`whole`), con las mismas reglas de ruta: nada de rutas absolutas,
   `..`, `node_modules`, `dist` o `.git`. Si se corta, la cabecera dice `líneas 1–N de total`.
6. **El editor es el de la ficha.** El mismo componente, de solo lectura, con su canaleta, su trozo
   de carga y los colores de la casa; no hay un segundo editor que mantener.
7. **La ficha no cambia.** El fragmento del símbolo y sus botones siguen donde estaban.

## Consecuencias

- Medido con `useCodarchApp.tsx` (1.000 líneas): montaje de **5,3 ms**, **ninguna tarea larga**, 83
  líneas pintadas de 1.000 y 495 nodos, con el scroll dentro de los 556 px del escenario.
- Mientras se lee el código, el mapa no está en el DOM: sus 348 celdas desaparecen y vuelven al
  cerrar. Es el precio de sustituir una vista por otra, y es lo que evita el coste de tener las dos.
- El zoom del pie se oculta: no hay mapa que acercar.
- El trozo del editor se descarga la primera vez, aquí o en la ficha: es la misma caché.
- El escritorio gana la lectura del fichero entero por IPC; la web, por `/api/source?whole=1` y, sin
  servidor, con los ficheros que leyó el análisis.

## Alternativas descartadas

- **Volver a la pestaña Código.** Es lo que el 0085 retiró: una segunda vista que se turna con el
  mapa, y una pestaña para algo que se abre con un gesto.
- **Un panel lateral con el fichero entero.** El inspector mide unos 250 px: un fichero ahí se lee
  peor que en el mapa sustituido.
- **Un diálogo a pantalla completa.** Tapa el mapa y la ficha a la vez y deja la ruta detrás.
- **Abrir el fichero en el editor del usuario.** Ya existe para el símbolo ([ADR 0068](../0061-0070/0068-la-ficha-abre-el-editor-y-sus-dependencias.md)),
  pero deja el mapa sin poder enseñar código.
- **Poner `view=code` en la URL.** Un enlace así depende de que la plataforma pueda leer el fichero;
  en la demo no hay ficheros que leer. Se decide cuando la vista sea siempre servible.

## Hoja de ruta

### El fichero entero, en el escenario

- [x] Leer el fichero entero en el servidor local, el escritorio y la web, con tope de líneas y bytes.
- [x] Doble clic en el bloque de un fichero para abrirlo, y el mapa se sustituye por el código.
- [x] La ruta lleva el nombre del fichero y devuelve al mapa; `Esc` y el botón **← Mapa** también.
- [x] Medir la apertura: 5,3 ms de montaje y ninguna tarea larga con 1.000 líneas.
- [x] Decidir si la vista del fichero va a la URL: sí, con la clave `code` ([ADR 0088](0088-el-fichero-abierto-va-en-la-url.md)).
- [ ] Comprobar la apertura en el escritorio empaquetado, con el trozo cargado desde `file://`.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
