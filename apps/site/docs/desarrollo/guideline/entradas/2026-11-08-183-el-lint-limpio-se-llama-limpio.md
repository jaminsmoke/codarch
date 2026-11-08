---
title: "El lint limpio se llama limpio"
date: "2026-11-08"
category: "fix"
verdict: "adr"
---

**Qué era**: la ficha de proyecto decía «Cobertura parcial: sin hallazgos observados en lo medido. No se sabe qué ficheros eran elegibles» con ESLint y oxlint a cero sobre 685 y 731 ficheros. `eligiblePaths` no se escribía nunca, y la nota de oxlint decía «corre sus correcciones por defecto» sin nombrar lo que pasaba: estaba instalado sin archivo de configuración.

**Qué cambia**: el universo lo declara cada herramienta ([ADR 0110](/desarrollo/adr/0101-0110/0110-el-lint-limpio-se-llama-limpio/)). ESLint usa lo que devolvió —también los limpios— y oxlint un comando de listado, `--debug=files`; un `lint:` de `.codarch.yml` puede declarar `list`. La falta de config se dice con esas palabras y no bloquea `complete`. En proyecto, carpeta y fichero, la ficha dice **«Limpio y al día»** sin la tira de ceros cuando la cobertura es completa y el árbol está al día; si no, enseña las cuentas y el motivo. `codarch analyze` deja de decir «frescura sin verificar» cuando el árbol coincide.

**Por qué así**: la config cambia qué reglas corren, no qué ficheros se midieron. Deducir el universo del snapshot tampoco vale: oxlint entra en `.astro` y ESLint no. Se mantiene el contrato **1.3**: `eligiblePaths` ya existía y el `text` del motivo ya era libre.

**Verificado**: este repo pasa de `partial` a `complete` con **731** medidos (685 de ESLint y 731 de oxlint), **0** hallazgos y `fresh === true`; la nota del sistema dice «sin archivo de configuración». Tests de universo por resultados, listado, listado roto, config ausente y limpio en los tres ámbitos.

**Qué falta**: Checkstyle, Biome, Ruff, go vet y dotnet siguen en `unknown` si no listan los limpios. Ruff podrá usar `--show-files` cuando se conecte.

**Tamaño**: los adaptadores y `runLint` en `@codarch/lint`; la ficha en `packages/ui`; el resumen de `analyze`; la página del artefacto 1.3 y la guía del CLI.

**Veredicto**: hecho.
