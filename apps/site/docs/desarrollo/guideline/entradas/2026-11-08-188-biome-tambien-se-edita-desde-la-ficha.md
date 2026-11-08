---
title: "Biome también se edita desde la ficha"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: el gestor de reglas cubría oxlint y ESLint; Biome seguía siendo de solo lectura.

**Qué cambia**: el escritor de Biome ([ADR 0112](/desarrollo/adr/0111-0120/0112-el-gestor-de-reglas/)) edita su `biome.json` en el sitio real: `linter.rules.<grupo>.<regla>`. Activar escribe la severidad y enciende el linter si estaba apagado; desactivar escribe `off` mientras las recomendadas sigan encendidas y, si no, quita la entrada. `biome.jsonc` no se reescribe porque los comentarios se perderían: se dice y no se toca. La ficha muestra las recomendadas de Biome y, si el esquema instalado se puede leer, su catálogo en el menú de añadir.

**Por qué así**: es el mismo contrato que oxlint y ESLint: la config del proyecto manda. El formato es JSON y se puede validar antes de escribir; el JSONC queda para cuando haya un editor que conserve comentarios.

**Verificado**: activar `suspicious/noDoubleEquals` en un `biome.json` apagado enciende el linter y escribe la regla; desactivar con recomendadas encendidas deja `off`; con recomendadas apagadas quita la entrada; un `biome.jsonc` se rechaza con un motivo.

**Qué falta**: Ruff (TOML) y Checkstyle (XML).

**Tamaño**: el escritor y las recomendadas en `@codarch/lint`; la condición editable en la ficha.

**Veredicto**: hecho.
