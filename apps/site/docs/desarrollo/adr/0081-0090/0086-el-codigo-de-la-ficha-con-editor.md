---
title: "ADR 0086 — El código de la ficha, con editor"
description: "El fragmento del símbolo pasa de un <pre> con Prism a CodeMirror 6, de solo lectura y en su propio trozo. Medido: el <pre> con 770 líneas deja una tarea de 21,8 s y 5.809 nodos; el editor monta en 17 ms, pinta 16 líneas y no deja ninguna tarea larga."
section: desarrollo
status: aceptado
date: "2026-10-27"
sidebar:
  label: El código de la ficha, con editor
  order: 86
---

**Estado:** aceptado · **Fecha:** 2026-10-27

## Contexto

La ficha enseña el código del símbolo abierto en un bloque propio, con sus números de línea, una
fila por línea y un resaltado con Prism ([ADR 0067](../0061-0070/0067-la-ficha-ensena-el-codigo.md)).
La muestra no es corta: la plataforma sirve cientos de líneas y un símbolo grande llega a **770**.

El [ADR 0085](0085-la-ruta-del-mapa-navega.md) retiró la pestaña del fichero entero porque montar
mil líneas resaltadas congelaba la app, y dejó abierto «medir y trocear el pintado». Faltaba saber
si ese coste era del resaltado, del CSS o del montaje, y si una herramienta lo resolvía.

Se construyó el prototipo con CodeMirror 6 y se midió el mismo símbolo —`useCodarchApp.tsx`, líneas
195–964— en la app real, con `PerformanceObserver` y `performance.measure`:

| Camino | Montaje | Tarea más larga | Nodos en el DOM | Líneas pintadas |
|---|---|---|---|---|
| `<pre>` con Prism | — | **21.785 ms** | 5.809 | 770 |
| CodeMirror 6 | **17 ms** (10–20 tras el arranque) | ninguna | **172** | **16** |

Las dos piezas que se podían culpar no lo explican: el resaltado de esas 770 líneas son **16,1 ms**
(la peor línea, 3,3 ms) y una maqueta equivalente de 8.470 nodos se compone en **66,8 ms**. El
bloqueo lo paga el montaje del árbol. CodeMirror no lo paga porque pinta solo el viewport.

También se midió lo que se descartó: Shiki cuesta **27 ms** por bloque de 400 líneas más 48 ms de
arranque, con una gramática de 190 kB; `content-visibility: auto` baja el layout de 1.000 líneas de
33 a 16 ms, pero no toca el montaje.

## Decisión

1. **La ficha pinta el código con CodeMirror 6**, no con un `<pre>` de Prism. El bloque gana la
   canaleta del fichero, la envoltura de líneas y la selección nativa, y pierde la tarea de 21,8 s.
2. **Solo lectura.** `EditorState.readOnly` y `EditorView.editable` en falso, sin historia, sin
   autocompletado y sin teclas propias: `Esc` y el retroceso siguen siendo del mapa.
3. **Los colores son los de la casa.** El editor no trae tema: sus tokens usan las clases
   `.token.*` de `styles.css`, sobre el mismo marco y el mismo fondo que el bloque anterior, así que
   no hay dos paletas para lo mismo.
4. **Carga diferida.** El editor vive en su propio trozo (`CodeEditor`, 371 kB; 127 kB gzip), que
   solo se descarga al abrir el código de un símbolo. El arranque del mapa no crece.
5. **La canaleta numera el fichero.** La primera línea de la muestra es la que dice la plataforma:
   en el prototipo, 195–964 se ven como 195, 196, 197.
6. **Prism sale de la UI.** `highlight.ts` y su test se retiran con el `<pre>`: el resaltado ya no
   se hace línea a línea, y eso arregla de paso el color partido de los comentarios y las cadenas de
   varias líneas.
7. **El número manda.** Si el montaje de una muestra vuelve a pasar de ~50 ms o aparece una tarea
   larga al abrir el código, se mide otra vez con `codarch-code-mount` antes de dar nada por bueno.

## Consecuencias

- `@codarch/ui` cambia `prismjs` por cinco paquetes de CodeMirror (`state`, `view`, `language`,
  `lang-javascript` y `@lezer/highlight`).
- El DOM de la ficha pasa de 5.809 nodos a 172 en el caso grande: el panel deja de arrastrar el
  bloque al hacer scroll o al cambiar de pestaña.
- El código ya no se puede editar desde la app; el botón **Editor** sigue abriendo el editor del
  usuario, que es donde se escribe ([ADR 0068](../0061-0070/0068-la-ficha-abre-el-editor-y-sus-dependencias.md)).
- El primer símbolo que se abre paga la descarga del trozo; en local es un fichero más y en el
  escritorio va dentro del paquete.
- El ADR 0067 sigue vigente en todo lo demás: el snapshot no guarda código y la plataforma sirve el
  fragmento.
- Queda una pregunta abierta para el 0085: con el editor puesto, ver el fichero entero ya no exige
  trocear el pintado a mano.

## Alternativas descartadas

- **Dejar el `<pre>` y virtualizar a mano con `@tanstack/react-virtual`.** Habría que trocear las
  filas, la canaleta y la envoltura, y el coste de montar 5.809 nodos seguiría ahí en cada apertura.
- **Seguir con Prism y dar el problema por resuelto con «es solo un marco».** Medido, es una
  tarea de 21,8 s: no es un marco, es una congelación.
- **Shiki, que ya estaba en `node_modules` por Astro.** Diez veces más lento por bloque y 190 kB de
  gramática, y no resuelve el montaje: seguiría pintando todas las líneas.
- **Mónaco.** Megas, workers y un aspecto de VS Code para leer un símbolo.
- **`content-visibility: auto` sobre el `<pre>`.** Barato y sin dependencia, pero solo baja el
  layout: el montaje de React y el `innerHTML` de cada fila se pagan igual.

## Hoja de ruta

### El código de la ficha

- [x] Medir el resaltado de Prism con líneas reales: 16,1 ms en 770 líneas.
- [x] Medir el montaje del `<pre>` en la app: una tarea de 21.785 ms y 5.809 nodos.
- [x] Medir Shiki y `content-visibility` como alternativas parciales.
- [x] Prototipo con CodeMirror 6: 17 ms de montaje, 172 nodos, 16 líneas pintadas.
- [x] Cambiar la ficha al editor, de solo lectura y en su propio trozo, y retirar Prism.
- [x] Ver el fichero entero en el escenario con esta base ([ADR 0087](0087-el-fichero-entero-en-el-escenario.md)).
- [ ] Comprobar el trozo diferido en el escritorio empaquetado.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
