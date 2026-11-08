---
title: "ESLint también se edita desde la ficha"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: oxlint se podía activar y desactivar, pero ESLint seguía de solo lectura. Añadir una regla que no estuviera en el catálogo tampoco era posible.

**Qué cambia**: el gestor de reglas ([ADR 0112](/desarrollo/adr/0111-0120/0112-el-gestor-de-reglas/)) edita también ESLint. Las reglas que no se pueden quitar de una línea —presets, spreads— se escriben como override en un **bloque gestionado** con marcas dentro de `eslint.config.js`; el bloque se inserta una vez y luego solo se reescribe su contenido. Una regla explícita se cubre con el mismo override por ahora. El menú **Añadir regla** se abre en la herramienta, busca en el catálogo real del proyecto y agrupa por plugin: 292 reglas del núcleo de ESLint y 136 de `@typescript-eslint` en este repo, más las de oxlint desde su esquema. Se elige severidad y se escribe en la config del proyecto. Tras escribir, el live vuelve a medir; si la config cambia por fuera, también.

**Por qué así**: la config del proyecto es la única fuente de verdad. `.codarch/` sigue siendo el informe de la última ejecución, no una lista de reglas. El bloque se lee en el mismo sitio y no añade una indirección que el usuario no pidió.

**Verificado**: el catálogo enumera 292 reglas del núcleo y 136 de `@typescript-eslint`; el escritor inserta el bloque en `tseslint.config(...)` y lo actualiza sin duplicarlo; `eslint` sigue cargando la config; activar y desactivar desde la ruta escribe y re-lintá; tests de catálogo, escritor y menú.

**Qué falta**: `meta.config` 1.4 con la huella de la config; quitar la línea explícita cuando el AST la localice con seguridad; Biome, Ruff y Checkstyle.

**Tamaño**: el catálogo y el escritor en `@codarch/lint`; la ruta y el live en `serve`; la acción de plataforma; la ficha y el menú en `packages/ui`.

**Veredicto**: hecho.
