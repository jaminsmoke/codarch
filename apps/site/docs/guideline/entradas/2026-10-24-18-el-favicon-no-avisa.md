---
title: El favicon no avisa
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué es**: que el servidor de desarrollo deje de avisar en cada carga porque el navegador pide
`/favicon.svg` fuera del documento.

**Por qué**: el navegador marca esa petición como `cross-site` y el router de Astro bloquea las
peticiones cross-site en desarrollo. El icono es un SVG público y el aviso se repetía en cada
recarga, tapando los avisos que sí importan.

**Qué cambió**: `vite-plugin-favicon.ts` sirve el SVG desde el principio de la pila de middleware,
solo al servir y solo para esa ruta. El resto de peticiones cross-site siguen bloqueadas con 403
(comprobado), así que la protección del servidor no se relaja. En producción no cambia nada: el
fichero sigue en `public/`.

**Veredicto**: **arreglo**, sin ADR: es una molestia del servidor de desarrollo, no del producto.
