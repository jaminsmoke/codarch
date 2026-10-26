---
title: La orquestación se comparte
date: "2026-10-24"
category: docs
verdict: fase
---

**Qué es**: que la web y el escritorio dejen de tener dos `App.tsx` independientes y compartan
la orquestación (estado, carga de datos, análisis) mediante un hook `useCodarchApp` en
`@codarch/ui`, con un adaptador por plataforma.

**Por qué**: las piezas visuales ya se comparten (M26), pero la orquestación —1821 líneas en la
web y 1106 en el escritorio— se duplica. Cada feature nueva se implementa dos veces y el drift es
inevitable.

**Decisión**: [ADR 0049](../../adr/0041-0050/0049-la-orquestacion-se-comparte.md). El hook
encapsula el estado y las operaciones; cada app solo conecta su adaptador (HTTP en la web, IPC en
el escritorio).

**Veredicto**: **fase M33**, en la hoja de ruta de [ADR 0049](../../adr/0041-0050/0049-la-orquestacion-se-comparte.md).
