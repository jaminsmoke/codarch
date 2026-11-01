---
title: "Las reglas del resto miden en la pasada"
date: "2026-11-01"
category: "feature"
verdict: "fase"
---

**Qué era**: el mapa del resto enseñaba **qué hay** —documentos, configuración, assets y quién enlaza a
quién— pero no decía **qué está roto**. Un enlace a un fichero que ya no existe y un frontmatter que el
sitio rechaza se descubrían al publicar, no al analizar. El [ADR 0105](/desarrollo/adr/0101-0110/0105-las-reglas-de-doc-y-config/)
dejó escritas las cuatro reglas; faltaba que dijeran algo.

**Qué cambia**: `docsFindings` (`packages/lint/src/rest.ts`) resuelve enlaces contra el árbol,
encuentra huérfanos entre las entradas declaradas, lee el frontmatter donde un glob lo pide y busca la
gemela de cada documento en las dos direcciones. `RestFile` lleva las claves del frontmatter, leídas al
medir el documento, así que las reglas no vuelven a abrir nada. `buildRestLint` las convierte en
`.codarch/lint-rest.repmod.json` con `meta.tree` = checksum del resto `y` `analyze` y `serve` lo
escriben en su pasada, con corte por checksum. El nombre entra en el registro del ADR 0100, así que
`.codarch/` lo reconoce y no lo borra.

**Por qué así**: las reglas son puras y no tocan disco, de modo que el resultado no depende de la
máquina y dos pasadas iguales dan el mismo fichero. Solo se juzgan documentos: contar un `package.json`
como medido diría que se miró cuando nadie lo miró. El frontmatter se lee donde el documento ya está en
memoria para contar líneas y enlaces, y el artefacto se firma con el checksum del **resto**: el del
código sigue significando «este código».

**Verificado**: tests de las cuatro reglas y de la lectura del frontmatter, del artefacto (checksum,
orden de entrada y procedencia) y del registro de `.codarch/`; typecheck, lint y las suites de `lint` y
`parsers`, 386 tests. Un `analyze` completo sobre este repo escribe el artefacto.

**Veredicto**: hecho. Quedan abiertos en M76 el bloque `docs:` de `.codarch.yml`, la sección **Reglas**
en las hojas del resto y la línea del enlace.
