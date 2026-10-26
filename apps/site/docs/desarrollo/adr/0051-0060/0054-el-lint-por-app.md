---
title: ADR 0054 — El lint, por app y por tipo de código
description: "Oxlint sigue siendo la pasada rápida de todo el repo; ESLint añade las reglas que de verdad se escapan: hooks, accesibilidad, promesas y pruebas. Cada área tiene su configuración y sus dependencias."
section: desarrollo
status: aceptado
date: "2026-10-24"
sidebar:
  label: El lint, por app y por tipo de código
  order: 54
---

**Estado:** aceptado · **Fecha:** 2026-10-24

## Contexto

Hoy `npm run lint` es una pasada de **oxlint** por todo el repo. Es rápido y ya pilla variables sin
usar y errores evidentes, pero no cubre lo que más duele en una app de React: las reglas de los
hooks, las dependencias de los efectos, las claves de las listas, la accesibilidad de los controles,
las promesas que se quedan sin esperar y las pruebas con `only`. El tirón del zoom del mapa no era un
fallo de lint, pero sí enseñó que faltaba una segunda red.

Tampoco hay una regla escrita sobre qué se vigila en cada sitio: no es lo mismo el proceso principal
de Electron (Node) que el renderer (React), ni un paquete del core que la web.

## Decisión

### 1. Oxlint se queda

Sigue siendo la pasada rápida que corre en cada guardado y en el CI. ESLint no lo sustituye: añade
lo que oxlint no tiene.

### 2. ESLint por área, con configuración plana

Un solo `eslint.config.js` en la raíz, con bloques por ruta:

| Área | Configuración | Qué añade |
|---|---|---|
| `packages/*`, `apps/cli`, `apps/mcp`, `scripts` | `typescript-eslint` recomendado + globals de Node | promesas, tipos, imports |
| `packages/ui`, `apps/web`, `apps/desktop/src/renderer`, `apps/site/src`, `plugins/*` | lo anterior + `react`, `react-hooks` y `jsx-a11y` | hooks, claves, accesibilidad |
| `apps/desktop/src/main.ts`, `preload.ts` | Node/Electron, **sin** reglas de React | que el proceso principal no arrastre la UI |
| `**/test/**` | lo anterior + reglas de Vitest | `only`, `expect` sin aserción |

### 3. Las reglas que importan

- `react-hooks/rules-of-hooks` (error) y `exhaustive-deps` (aviso): el estado del mapa y los efectos
  viven aquí.
- `react/jsx-key` (error): listas sin clave.
- `jsx-a11y` recomendado: botones con nombre, roles, foco.
- `@typescript-eslint/no-floating-promises` y `no-misused-promises` (error, con tipos): el
  escritorio y el CLI están llenos de `async` y de `void`.
- `vitest/no-focused-tests` (error): un `it.only` no se cuela.
- Nada de reglas de formato: el repo no usa Prettier y no se va a imponer aquí.

### 4. Dos pasadas, no una

- `npm run lint`: oxlint + ESLint sin tipos. Rápido, en cada guardado y en el CI.
- `npm run lint:types`: ESLint con información de tipos (solo las reglas que la necesitan). Más
  lento; va en el CI, no en el guardado.

### 5. Las dependencias, por área

- **Base (todo el repo):** `eslint`, `typescript-eslint`, `globals`.
- **React (UI, web, renderer, sitio, plugins):** `eslint-plugin-react`, `eslint-plugin-react-hooks`,
  `eslint-plugin-jsx-a11y`.
- **Pruebas:** `@vitest/eslint-plugin`.
- **Node/Electron:** los globals de `globals`; no hace falta un plugin más.
- **No se añaden:** `eslint-plugin-import` (el grafo de CodArch ya detecta ciclos y fronteras),
  `prettier` (fuera del alcance del lint) ni reglas de estilo que oxlint ya cubre.

## Consecuencias

- Los errores de hooks y de accesibilidad se ven antes de abrir la app.
- El CI tarda un poco más; la pasada con tipos va aparte para no castigar el guardado.
- Cada área declara sus globals: el proceso principal no puede importar React por accidente.
- Las reglas nuevas se añaden con su caso, no «por si acaso»: una regla que nadie entiende se
  desactiva con un comentario y su motivo.

## Alternativas descartadas

- **Solo oxlint:** rápido, pero no cubre hooks, accesibilidad ni promesas.
- **Solo ESLint:** más lento en cada guardado y peor en lo que oxlint ya hace bien.
- **Reglas con tipos en la pasada rápida:** multiplica el tiempo de lint sin avisar antes.
- **Prettier y reglas de formato:** es otra decisión; el repo ya tiene un estilo y no se toca aquí.
- **Un plugin de imports:** duplicaría el trabajo que ya hace el analizador de CodArch.

## Hoja de ruta

### M35 — La segunda red del lint

- [x] Instalar las dependencias y escribir `eslint.config.js` por área.
- [x] Corregir lo que salga (hooks, claves, accesibilidad) sin cambiar comportamiento.
- [x] Añadir `npm run lint:types` y su paso en el CI.
- [x] Documentar en `AGENTS.md` qué pasa en cada pasada.

Quedan quince avisos de `exhaustive-deps` por los setters que llegan en `app.actions` (son estables):
no bloquean y se revisan si crecen.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
