---
title: Las preferencias son del repositorio
date: "2026-10-24"
category: feature
verdict: arreglo
---

**Qué es**: que cada repositorio recuerde su vista —métrica de área, color y etiquetas— en
`.codarch/preferences.json`, en vez de compartir una sola preferencia para todos.

**Por qué**: cambiar de repo cambiaba el mapa con la vista del anterior. La configuración del
proyecto ya vivía en su `.codarch/`, pero la de la vista se quedaba en la máquina.

**Qué cambió**: el escritorio guarda las preferencias en el `.codarch/` del repo y las lee al
analizarlo o restaurarlo, antes de pintar el snapshot; si el repo no se puede escribir, el
`localStorage` sigue haciendo de respaldo. La primera vez, las preferencias de la máquina se mudan
al repo al guardarse. La web sigue usando `localStorage`, porque no escribe en el repo. El reparto
queda en [ADR 0053](../../adr/0051-0060/0053-la-configuracion-no-se-mezcla.md).

**Veredicto**: arreglo de la persistencia, dentro de ADR 0053.
