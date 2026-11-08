---
title: "Ruff también se edita desde la ficha"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: Biome ya se podía activar y desactivar, pero Ruff seguía siendo de solo lectura.

**Qué cambia**: el escritor de Ruff ([ADR 0112](/desarrollo/adr/0111-0120/0112-el-gestor-de-reglas/)) toca el TOML real de `ruff.toml`, `.ruff.toml` o `[tool.ruff.lint]` de `pyproject.toml`. Activar añade el código a `extend-select` y lo quita de `ignore`/`extend-ignore`; desactivar lo añade a `extend-ignore` y lo quita de `select`/`extend-select`. No se reescribe el TOML entero: se edita el array concreto. Un array con comentarios se rechaza para no perderlos. El menú de añadir usa `ruff rule --all --output-format=json` cuando el binario está en el proyecto; si no, lo dice y no inventa.

**Por qué así**: la config del proyecto manda y el formato es TOML; tocar solo el array evita perder tablas, comentarios y orden. Los selectores de Ruff agrupan reglas, por eso se trabaja con códigos concretos y `ignore`.

**Verificado**: en `ruff.toml`, activar `F401` crea `extend-select` y conserva `[format]`; en `pyproject.toml`, desactivar `E501` lo quita de `select`, deja `ignore` vacío y crea `extend-ignore`; un array con comentarios se rechaza.

**Qué falta**: Checkstyle (XML).

**Tamaño**: el escritor y el catálogo de Ruff en `@codarch/lint`; la condición editable en la ficha.

**Veredicto**: hecho.
