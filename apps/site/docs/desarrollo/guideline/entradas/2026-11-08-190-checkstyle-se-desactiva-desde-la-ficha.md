---
title: "Checkstyle se desactiva desde la ficha"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: Checkstyle seguía siendo de solo lectura.

**Qué cambia**: el escritor de Checkstyle ([ADR 0112](/desarrollo/adr/0111-0120/0112-el-gestor-de-reglas/)) quita un `<module name="…">` de su XML, sea autocerrado o con propiedades e hijos. No se reescribe el XML entero: se retira ese elemento y se conserva el resto. Activar un módulo **no** se hace todavía: hay que saber si cuelga de `TreeWalker`, de `Checker` u otro contenedor, y la config no lo dice; inventarlo rompería la medida. La ficha lo dice y no muestra el menú de añadir para Checkstyle.

**Por qué así**: quitar es seguro; añadir sin contenedor no. La misma regla que en los demás: si no se puede hacer bien, se dice y no se finge.

**Verificado**: quitar `NeedBraces` con propiedades elimina el módulo y su `property`; quitar `LineLength` autocerrado conserva `FileLength`; activar se rechaza con el motivo del contenedor; un módulo inexistente se dice.

**Qué falta**: activar módulos de Checkstyle cuando se conozca su contenedor; el resto de linters ya está.

**Tamaño**: el escritor en `@codarch/lint`; la condición editable y la nota en la ficha.

**Veredicto**: hecho.
