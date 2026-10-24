---
title: El repositorio se vigila en las dos apps
date: "2026-10-24"
category: feature
verdict: fase
---

**Qué es**: una sola vigilancia del repositorio, con chokidar, para `codarch serve` y el
escritorio; y que al abrir un repo se pinte lo guardado al instante mientras se reanaliza detrás.

**Por qué**: la web ya se refrescaba sola con el `--watch`, pero cada sitio tenía su forma de
vigilar (y el escritorio, ninguna): listas de exclusiones distintas, watchers por plataforma y ningún
sitio donde ver si el mapa estaba al día.

**Qué cambió**: `watchRepository` en `@codarch/parsers` vigila la raíz, agrupa las ráfagas y salta
`.git`, `node_modules`, `.codarch/`, `.codarch-history/` y las carpetas de salida. `serve` lo usa y
el escritorio también: al analizar o restaurar empieza a vigilar, reanaliza al guardar y solo
reescribe `.codarch/` si el checksum cambió; el mapa recibe el snapshot nuevo y la cabecera dice
`live`. Al abrir un repo que ya tenía estado, primero se ve lo guardado y a los pocos cientos de
milisegundos el análisis real: los cambios hechos sin la app se reflejan antes de ponerse en live.

**Veredicto**: **fase M34**, en la hoja de ruta de
[ADR 0050](../../adr/0041-0050/0050-el-repositorio-guarda-su-estado.md). Queda decidir si el
escritorio puede pausar la vigilancia desde los ajustes, como la web.
