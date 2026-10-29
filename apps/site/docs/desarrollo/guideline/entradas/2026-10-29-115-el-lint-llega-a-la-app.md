---
title: "El lint llega a la app"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**Qué era**: `codarch lint` ya escribía `.codarch/lint.json`, pero nadie lo leía: ni `serve` lo servía, ni la web ni el escritorio lo pedían. El artefacto existía para nadie.

**Qué cambia**: `serve` expone `/data/lint.json` y, **tras una pasada con cambios**, vuelve a medir con las herramientas que declara el repo y anuncia `lint` por SSE para que la app relea; si ninguna mide, se sigue sirviendo el artefacto anterior y la consola lo dice. La web lo carga al arrancar (del servidor o del proyecto guardado), al elegir una carpeta con `.codarch/`, al refrescar y con cada aviso `lint`. El escritorio lo lee de `.codarch/lint.json` al abrir una carpeta, al analizarla y al restaurar la sesión. El proyecto guardado lo lleva: `SavedProject` gana `lint`, y `parseSavedProject` lo conserva sin exigirlo. La app lo valida con `readLintArtifact` y, si no se entiende, deja el lint en `null`: **sin medir**, que no es lo mismo que limpio.

**Por qué así**: el lint es una señal opcional y un fichero suyo no puede tumbar el mapa; por eso el lector devuelve `null` en vez de lanzar, como el del reporte. Y el refresco del servidor se lanza **después** de saber que el análisis trae algo nuevo: escribir `lint.json` también despierta al vigilante, y lanzarlo antes de esa comprobación se llamaba a sí mismo sin parar (se vio al probarlo con un `serve` de verdad).

**Verificado**: 12 tests nuevos —lector del artefacto, la pasada compartida de `lint` y `serve`, la ruta con 204 sin fichero, el arranque de la web desde servidor y desde proyecto guardado, y la carpeta con y sin `lint.json`—. A mano, con `serve` real sobre un repo con una herramienta que emite JSON: `/data/lint.json` contesta 204 al principio, una edición del código produce `event: update` y luego `event: lint`, y el artefacto queda servido y estable (sin bucle). Suite completa (1.177), lint y typecheck en verde.

**Lo que falta**: la cuarta señal del riesgo, las fichas de fichero y carpeta con su agregación, y la lente Linter.

**Veredicto**: fase en marcha.
