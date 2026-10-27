---
title: El código, con editor
date: "2026-10-27"
category: optimized
verdict: adr
---

**Qué era**: la ficha pintaba el código del símbolo con Prism, una fila por línea, en un `<pre>`. El [ADR 0085](../adr/0081-0090/0085-la-ruta-del-mapa-navega.md) retiró la pestaña del fichero entero porque congelaba la app y dejó abierto «medir y trocear el pintado», sin saber si el coste era del resaltado o del montaje.

**Qué es**: el fragmento se pinta con **CodeMirror 6**, de solo lectura y en su propio trozo ([ADR 0086](../adr/0081-0090/0086-el-codigo-de-la-ficha-con-editor.md)). Trae la canaleta del fichero, la envoltura de líneas y la selección nativa; no captura `Esc` ni el retroceso, y sus colores son las clases `.token.*` de `styles.css`, así que el bloque se ve como antes. Prism sale de la UI con su `highlight.ts`.

**Por qué así**: el prototipo se midió con el mismo símbolo —`useCodarchApp.tsx`, líneas 195–964— en la app real. El `<pre>` dejaba **una tarea de 21.785 ms** y **5.809 nodos**; el editor monta en **17 ms**, deja **172 nodos** y pinta **16 líneas**. Ni el resaltado ni el CSS lo explicaban: Prism son 16,1 ms en esas 770 líneas y una maqueta equivalente de 8.470 nodos se compone en 66,8 ms; el bloqueo lo pagaba el montaje del árbol. Shiki se descartó por 27 ms por bloque de 400 líneas y 190 kB de gramática, y `content-visibility` solo baja el layout, no el montaje.

**Cómo se comprueba**: con el repo abierto, el código del símbolo abre al instante y la canaleta empieza en la línea real (195, 196, 197); con el editor abierto, navegar por carpetas y abrir otro fichero no deja tareas largas. El montaje deja su medida en `codarch-code-mount`, y `packages/ui/test/codeEditorState.test.ts` cubre el documento, el solo lectura y la numeración de la canaleta.

**Veredicto**: ADR 0086, sin fase nueva. Queda abierto ver el fichero entero en el escenario sobre esta base y comprobar el trozo diferido en el escritorio empaquetado.
