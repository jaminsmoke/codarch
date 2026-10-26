---
title: La segunda red del lint
date: "2026-10-24"
category: chore
verdict: fase
---

**Qué es**: ESLint por área, además de oxlint, con una pasada aparte para las reglas que necesitan
tipos.

**Por qué**: oxlint es rápido y pilla lo evidente, pero no las reglas de los hooks, las claves de las
listas, la accesibilidad, las promesas sin esperar ni un `it.only`. El tirón del zoom no era un fallo
de lint, pero dejó claro que faltaba una segunda red.

**Qué cambió**: `eslint.config.js` con bloques por ruta (core/Node, UI/React, proceso principal de
Electron y pruebas) y `eslint.config.types.js` con `no-floating-promises`, `no-misused-promises` y
`await-thenable` sobre el código de Node. `npm run lint` hace oxlint + ESLint; el CI corre además
`npm run lint:types`.

La primera pasada encontró trece errores reales: un `require` en un fixture, la ampliación de
Starlight (namespace y merging), el fondo del selector de carpetas, tres efectos que sincronizan
estado (documentados con su motivo), el patrón de referencia de la vista 3D, un handler `async` que
Node no espera y un `whenReady()` sin `catch`. Se corrigieron o se documentaron uno a uno. Quedan
quince avisos de `exhaustive-deps` por setters estables de `app.actions`: no bloquean.

**Veredicto**: **fase M35, cerrada**, en la hoja de ruta de
[ADR 0054](../../adr/0051-0060/0054-el-lint-por-app.md).
