---
title: El live mira a git
date: "2026-10-24"
category: feature
verdict: adr
---

**Qué era**: el live analizaba el repo entero en cada guardado y abría un handle de vigilancia por
carpeta. Guardar un fichero costaba 2 819 ms en este repo (2 194 ms solo en releer y parsear lo que no
había cambiado) y un repo mediano dejaba cientos de handles abiertos.

**Qué cambió**: el parseo se reutiliza por fichero con su versión `tamaño:mtime`, y entre el
vigilante y el análisis hay un **pulso** que decide si el aviso cambia algo: con git, `git status
--porcelain=v2` da la lista exacta —renombrados y bajas incluidos— y lo que git ignora no cuenta; sin
git, mandan las versiones de lo que avisó el vigilante. La vigilancia queda en **dos handles por
repo**: el árbol recursivo y `.git` para los commits, que no tocan el árbol.

**Números**: análisis incremental 81–105 ms (antes 2 850), recorrido y `stat` ~15 ms, `git status`
~25 ms, un guardado en la app ~450 ms contando el agrupado de la ráfaga. Un `git add`, compilar en
`dist/` o guardar sin cambios ya no analiza **ni escribe** `.codarch/snapshot.cc.json`.

**Veredicto**: [ADR 0056](../../adr/0051-0060/0056-el-live-no-repite-el-analisis.md), hecho; no abre
fase nueva. Queda en su hoja de ruta compartir la caché entre el escritorio y `serve`, y decidir si
compensa pedir a git solo los caminos nuevos cuando aparece o desaparece un fichero.
