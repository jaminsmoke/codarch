---
title: "El lint llega a la hoja que está abierta"
date: "2026-10-30"
category: "fix"
verdict: "arreglo"
---

**Qué era**: con el live encendido, guardar un fichero no se veía en la hoja que se estaba leyendo. Al llegar el snapshot nuevo, el efecto que conserva el fichero elegido pasaba por `selectIndex`, que cambia de hoja cuando hay un fichero: la de **Proyecto** y la de **Carpeta** se cerraban y la app volvía a **Fichero**, justo antes de que el lint terminara de medirse. Y el recuento sí llegaba: lo que fallaba era el sitio. Además, una pasada del lint en curso descartaba los avisos que llegaban mientras tanto —el artefacto se quedaba contando el árbol de dos guardados antes— y el mismo árbol podía lintarse dos veces, que son dos ESLint enteros.

**Qué cambia**: la app restaura la selección con `restoreIndex`, que no toca la pestaña, y `tabAfterModelRefresh` decide qué hoja queda: **Proyecto** sigue abierta con datos nuevos y **Carpeta** solo cae si el refresco se llevó la carpeta, que entonces no tiene nada que contar. En `serve`, el lint pasa por `createLintQueue`: el guardado que llega durante una pasada se apunta y se linta al acabar, una sola vez y con la última raíz; y `serve-live` no pide dos veces el mismo checksum, así que un árbol no se mide dos veces.

**Por qué así**: un refresco no es una elección del usuario. La regla de que una hoja no hable de otro sujeto vale para un clic —seleccionar un fichero cierra la carpeta—, no para el live, que devuelve el mismo fichero que ya estaba. Y el lint es lo bastante caro como para no lanzarlo dos veces sobre el mismo árbol ni tirar el que llega tarde.

**Verificado**: el cero es real, medido por fuera del producto: `oxlint .` con 0 diagnósticos, `eslint .` con 494 ficheros, 0 errores y 0 avisos, y `.codarch/lint.cc.json` con `files: {}`. En vivo, con la hoja **Proyecto** abierta: un `var` de prueba en `scripts/version.mjs` la deja en `1 error · 2 avisos` sin cerrarse —y con la fila de `scripts/` en el descenso por carpetas—, y al revertirlo vuelve a `0 errores`. El recuento llega con el artefacto: unos 11 s en `serve` sin nada más delante, lo que tarda una pasada completa de ESLint sobre 500 ficheros; con Vite y Chrome compitiendo por la CPU, unos 21 s. Tests nuevos de la cola (`lint-queue`) y de la hoja tras el refresco (`viewState`); typecheck y las suites de `apps/cli` y `packages/ui` en verde.

**Veredicto**: arreglo.
