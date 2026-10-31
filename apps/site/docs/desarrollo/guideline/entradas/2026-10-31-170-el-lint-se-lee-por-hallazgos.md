---
title: "El lint se lee por hallazgos; Reglas sale del código"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**Qué era**: la ficha de código tenía una sección **Reglas** que mezclaba violaciones de arquitectura,

deuda de migración y lint; en carpeta y proyecto solo quedaba el lint, con el catálogo de reglas

activas y los sistemas detectados. La ficha de un documento o de un config no tenía reglas.

**Qué cambia**: **Reglas** sale de las fichas de fichero, carpeta y proyecto. Entra **Lint**: en el

fichero, el peso de la deuda en el riesgo y los mensajes con su regla, su línea y su texto; en carpeta

y proyecto, los hallazgos agrupados por regla. Los cruces FFI se mudan a **Dependencias**. El catálogo

de reglas activas y los sistemas dejan de verse en la vista de código. Reglas queda reservada a doc y

config: las violaciones de arquitectura, cuando se fijen, serán una subsección.

**Por qué así**: una regla activa no es un hallazgo y no dice qué arreglar; lo que se acciona es el

mensaje. Las reglas de arquitectura todavía no tienen modelo fijado, y el catálogo es configuración,

no una ficha de código.

**Verificado**: suite completa en verde con **183 ficheros y 1567 tests**, typecheck limpio, lint con

**0 errores** —sigue el aviso previo de `packages/parsers/src/duplication.ts`— y `site:build` con

**289 páginas**.

**Veredicto**: hecho. M63 pierde las reglas agrupadas; M64 se queda con las reglas de doc y config, que

ahora sí son su sitio; el punto del lint en la barra y la deuda en `explain_module` siguen abiertos

porque son lint, no el catálogo.
