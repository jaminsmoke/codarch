---
title: "El lint tiene formato"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**Qué era**: el [ADR 0094](../../adr/0091-0100/0094-el-lint-en-el-mapa.md) decidió que el lint tendría su propio artefacto, pero nadie lo escribía ni lo leía: no había formato, ni forma de pasar de lo que dice ESLint a lo que el mapa necesita.

**Qué cambia**: nace `packages/lint` con `.codarch/lint.json` (`schemaVersion` 1.0): herramientas ordenadas y sin repetir, ficheros por ruta relativa con `errors`, `warnings` y `messages`, resumen y checksum MD5 de `{ tools, files }`. Dos normalizadores traducen la salida real de las herramientas: `eslint --format json` —rutas absolutas a relativas, severidades 1 y 2, `ruleId: null` como `(parser)`— y `oxlint --format json` —con o sin la envoltura `diagnostics`, `eslint(no-debugger)` como `no-debugger` y la etiqueta como línea y columna—. Los mensajes idénticos de dos herramientas se cuentan una vez y todo se ordena, así que el orden de entrada no cambia el fichero. `stableStringify` se muda a `@codarch/schema` para que el snapshot y el lint compartan un solo serializador canónico, y `@codarch/lint/browser` deja el formato disponible sin `node:path` para cuando lo lea la app.

**Por qué así**: el artefacto es la frontera. Cada linter habla su dialecto y la app no tiene por qué conocerlos; lo que comparte es el mensaje normalizado. Que el fichero exista significa «medido», aunque no haya ni un mensaje: sin él, un repo no está limpio, está sin medir.

**Verificado**: 14 tests nuevos —orden y checksum, deduplicado entre herramientas, rutas fuera del repo, entradas mal formadas y los dos dialectos— y comprobación a mano con la salida real de `eslint -f json` y `oxlint -f json` sobre un fichero con `var` y `debugger`. Suite completa (1144), lint y typecheck en verde.

**Lo que falta**: `codarch lint`, la carga en `serve`, la web y el escritorio, la cuarta señal del riesgo, las fichas y la lente Linter.

**Veredicto**: fase en marcha.
