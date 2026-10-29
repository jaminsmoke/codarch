---
title: "El lint se lanza"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**Qué era**: el [ADR 0094](../../adr/0091-0100/0094-el-lint-en-el-mapa.md) tenía su formato y sus normalizadores, pero ningún comando escribía el artefacto: el lint seguía sin existir para quien usa CodArch.

**Qué cambia**: `codarch lint` lee el bloque `lint:` de `.codarch.yml` —`name`, `command` y `format` (`eslint-json` u `oxlint-json`)—, lanza todas las herramientas **en paralelo** en la raíz del repo y escribe `.codarch/lint.json`. Falla blando: una herramienta que no está o revienta se avisa y las demás siguen; el artefacto sale con lo que sí se midió y solo con esas herramientas en `meta.tools`. Un linter con hallazgos que sale con código distinto de cero **no** es un fallo si dejó su JSON, y el comando no bloquea por defecto: `--fail-on never|errors|warnings` decide. Sin ninguna herramienta que mida no hay artefacto y el código de salida es 1, porque un fichero vacío diría «limpio» cuando en realidad es «sin medir». Si `.codarch/` nace aquí, se añade al `.gitignore`, como en `analyze`.

**Por qué así**: el comando es el que sabe de procesos y el paquete de lint el que sabe de dialectos; por eso `runLint` recibe un runner y el normalizador no ve un `child_process`. Los avisos que `npx` escribe en stdout antes del JSON se toleran leyendo del primer corchete al último: una herramienta no deja de haber medido porque npm hable.

**Verificado**: 12 tests nuevos en `packages/lint` (configuración válida y mal formada, orden y fallo blando, JSON envuelto en avisos, determinismo) y 9 en la CLI, que cubren el artefacto, el `.gitignore`, `--fail-on`, `--out` y la configuración inválida. A mano, con ESLint y oxlint reales sobre un fichero con `var` y `debugger`: el artefacto sale con 1 error y 3 avisos, `--fail-on errors` devuelve 1, y el bundle de `build:cli` hace lo mismo desde `apps/cli/dist`. Suite completa (1.165), lint, typecheck y `site:build` en verde.

**Lo que falta**: que `serve`, la web y el escritorio lean el artefacto, la cuarta señal del riesgo, las fichas de fichero y carpeta, y la lente Linter.

**Veredicto**: fase en marcha.
