---
title: El lint, por app y por tipo de código
date: "2026-10-24"
category: chore
verdict: adr
---

**Qué es**: una segunda red de lint, con ESLint por área, además de oxlint.

**Por qué**: oxlint es rápido y pilla lo evidente, pero no las reglas de los hooks, las claves de
las listas, la accesibilidad, las promesas sin esperar ni un `it.only` colado. El tirón del zoom no
era un fallo de lint, pero dejó claro que faltaba una red.

**Qué quedó decidido**: oxlint sigue en cada guardado; ESLint añade hooks, React, accesibilidad y
promesas con configuración plana por ruta (core/Node, UI/React, proceso principal de Electron,
pruebas). Las reglas con tipos van en una pasada aparte (`lint:types`) para no castigar el guardado.
Dependencias: `eslint`, `typescript-eslint`, `globals`; para React, `eslint-plugin-react`,
`eslint-plugin-react-hooks` y `eslint-plugin-jsx-a11y`; para pruebas, `@vitest/eslint-plugin`. Sin
`eslint-plugin-import` (el grafo de CodArch ya hace ese trabajo) ni Prettier.

**Veredicto**: [ADR 0054](../../adr/0051-0060/0054-el-lint-por-app.md), fase M35.
