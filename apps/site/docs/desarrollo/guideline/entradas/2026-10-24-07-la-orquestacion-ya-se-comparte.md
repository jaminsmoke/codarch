---
title: La orquestación ya se comparte
date: "2026-10-24"
category: chore
verdict: fase
---

**Qué es**: que la web y el escritorio dejen de tener dos `App.tsx` independientes. El estado y
las operaciones viven en `useCodarchApp` (`@codarch/ui`); cada app solo conecta su adaptador.

**Por qué**: las piezas visuales ya se compartían (M26), pero la orquestación se duplicaba:
`loadSnapshot`, `loadReport`, `analyzeFolder`, preferencias, pestañas, foco, zoom y etiquetas
estaban escritos dos veces. Cada feature nueva era doble y el drift, inevitable.

**Qué cambió**: los dos `App.tsx` usan el hook y bajan de 1821 a 1565 líneas (web) y de 1106 a
762 (escritorio). Desaparecen las dos copias de `plugins.ts` y los tipos de almacenamiento pasan a
`@codarch/ui`. El escritorio conserva lo suyo (IPC, `.codarch/`) y la web lo suyo (servidor, URL,
demo, análisis en el navegador con progreso y cancelación); las capacidades que una plataforma no
tiene se quedan opcionales en `Plataforma`.

**Veredicto**: **fase M33, cerrada**, en la hoja de ruta de
[ADR 0049](../../adr/0041-0050/0049-la-orquestacion-se-comparte.md).
