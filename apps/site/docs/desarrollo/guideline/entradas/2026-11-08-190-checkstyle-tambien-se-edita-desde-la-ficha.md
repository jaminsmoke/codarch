---
title: "Checkstyle también se edita desde la ficha"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: Checkstyle seguía siendo de solo lectura.

**Qué cambia**: el escritor de Checkstyle ([ADR 0112](/desarrollo/adr/0111-0120/0112-el-gestor-de-reglas/)) quita un `<module name="…">` de su XML, sea autocerrado o con propiedades e hijos. Activar solo se permite con un **catálogo curado** de módulos frecuentes que ya saben si cuelgan de `Checker` o de `TreeWalker`: el módulo se inserta en ese contenedor. Un módulo desconocido se rechaza; no se adivina el contenedor. No se reescribe el XML entero: se toca ese elemento.

**Por qué así**: quitar es seguro; añadir sin contenedor no. La misma regla que en los demás: si no se puede hacer bien, se dice y no se finge.

**Verificado**: quitar `NeedBraces` con propiedades elimina el módulo y su `property`; quitar `LineLength` autocerrado conserva `FileLength`; activar `LineLength` lo mete en `Checker` y `NeedBraces` en `TreeWalker`; un módulo desconocido se rechaza con el motivo del contenedor; un módulo inexistente se dice.

**Qué falta**: ampliar el catálogo curado a más módulos de Checkstyle; el resto de linters ya está.

**Tamaño**: el escritor en `@codarch/lint`; la condición editable y la nota en la ficha.

**Veredicto**: hecho.
