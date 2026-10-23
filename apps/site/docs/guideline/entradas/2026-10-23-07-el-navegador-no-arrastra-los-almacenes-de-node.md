---
title: El navegador no arrastra los almacenes de Node
date: "2026-10-23"
category: fix
verdict: arreglo
---

**Qué era**: `npm run web:build` avisaba de que `node:fs` y `node:path` se externalizaban desde
`packages/schema/src/history-store.ts` y `chain-store.ts`. El bundle del navegador solo usa la
entrada browser-safe del schema, pero el núcleo del parser —compartido con el CLI— importaba la
entrada raíz, que exporta los almacenes de historial y cadenas. El aviso era real: código Node
entraba en el grafo del navegador.

**Decisión**: `@codarch/schema/browser` expone también la identidad que necesita el parser; el
núcleo del parser, la migración y `render/model` usan esa entrada. El alias de Vite resuelve
`@codarch/schema` a la entrada browser-safe, de modo que una importación futura no vuelva a meter
los almacenes. La raíz sigue exportando `history-store` y `chain-store` para CLI, MCP y escritorio.
Quedan los avisos de `web-tree-sitter` (`fs`, `path` y un `eval` de Emscripten): son ramas Node y de
la librería, no código nuestro; se documentan y no se silencian.

**Veredicto**: **arreglo**, sin ADR: es empaquetado, no modelo; hecho.
