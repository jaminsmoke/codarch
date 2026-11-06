---
title: "La cobertura del lint es 1.3"
date: "2026-11-06"
category: "feature"
verdict: "adr"
---

**Qué era**: `summary.measured` era un número suelto y un fichero limpio no dejaba rastro de que se hubiera mirado.

**Qué cambia**: el artefacto sube a **1.3** ([ADR 0107](/desarrollo/adr/0101-0110/0107-la-cobertura-del-lint/)). `coverage` dice qué se miró, `files` solo guarda hallazgos y `scopeHealth` interpreta el ámbito. Un 1.0–1.2 se lee como `unknown` con `legacy-global`. El contrato, con un ejemplo por estado, está en [el artefacto 1.3](/desarrollo/lint-1.3/).

**Por qué así**: sin universo, un cero de hallazgos no se puede llamar limpio. ESLint y Checkstyle no lo dan; los documentos sí, y se cuentan por documento, no por regla.

**Verificado**: `scopeHealth` para los cuatro estados y los códigos, lectura de 1.0–1.2, ESLint con fichero limpio en la cobertura, Checkstyle, oxlint desconocido, CLI, MCP y el resto.

**Veredicto**: hecho. La UI no entra en esta entrega.
