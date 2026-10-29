---
title: "El resto, medido"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**Qué era**: el [ADR 0093](../../adr/0091-0100/0093-el-mapa-de-lo-que-no-es-codigo.md) decidió que lo que no es código tenga su propio snapshot, pero el análisis todavía no lo medía: el recorrido filtraba por extensión y lo que no era código no llegaba a ninguna parte.

**Qué cambia**: el recorrido se parte en **una sola pasada** (`walkCodeAndRest`): el código sigue su camino de siempre y el resto se mide sin parser —tamaño, líneas si es texto y los enlaces de cada documento— en `packages/parsers/src/rest.ts`. De ahí sale `buildRestSnapshot`: un cc.json 2.x con `bytes` (y `loc` cuando hay texto), la lente `rest` con el `kind` de cada fichero y las aristas de documento a documento, con su checksum propio. Sobre este repositorio son 564 ficheros —449 documentos, 54 configuraciones, 38 assets y 23 «otros»— y 462 enlaces entre documentos; el código son 493.

**Por qué así**: el tipo no se adivina por la carpeta sino por el nombre y la extensión, y lo que no casa con ninguna regla entra como `other` en vez de desaparecer: el mapa anterior mentía justamente por omitir. Los lockfiles van como `asset` y no como configuración, porque nadie los edita a mano. Los bytes de un texto se calculan en el propio módulo y no con `TextEncoder`, para que el CLI y el navegador midan lo mismo.

**Lo que falta**: que `analyze` y `serve` escriban `.codarch/rest.cc.json`, la pestaña `El resto` con sus bloques en el raíl, la ficha del fichero que no es código y, en su ADR, las reglas del resto. El test nuevo comprueba que cambiar un documento mueve el checksum del resto y **no** el del código.

**Veredicto**: fase en marcha.
