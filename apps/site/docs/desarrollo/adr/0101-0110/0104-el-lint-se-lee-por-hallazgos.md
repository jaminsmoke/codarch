---
title: ADR 0104 — El lint se lee por hallazgos; las reglas son de doc y config
description: "La ficha de código pierde Reglas: el lint es una sección propia que cuenta los hallazgos y su peso en el riesgo, sin catálogo de reglas activas. Las reglas de arquitectura, todavía sin fijar, serán una subsección de Reglas en doc y config."
section: desarrollo
status: aceptado
date: "2026-10-31"
sidebar:
  label: El lint se lee por hallazgos
  order: 104
---

**Estado:** aceptado · **Fecha:** 2026-10-31

## Contexto

La sección **Reglas** de la ficha de código nació con dos trabajos que no eran el
mismo: enseñar lo que el proyecto le exige al fichero y contar el lint. Con el
tiempo acabó mezclando tres cosas: las violaciones de arquitectura del reporte,
la deuda de migración con sus cruces FFI y el bloque de lint. En carpeta y
proyecto quedó solo el lint, con los sistemas detectados y el catálogo de reglas
activas.

Ese catálogo es **configuración**, no un hallazgo: «372 reglas como error» no
dice qué está mal en el código. Lo que se arregla es el mensaje: la regla que
falló, su línea y su texto. Y lo que pesa en el riesgo es la deuda —errores + ¼
avisos—, no cuántas reglas están activas.

Además, la ficha de un documento o de un fichero de configuración no tenía
ninguna sección de reglas: todo `RulesSection` vivía detrás de `showCode`. La
vista de código mostraba lo que no era suyo y la de doc/config no mostraba nada.

Las violaciones de arquitectura todavía no están fijadas como producto. Hoy se
leen del reporte del diff, pero no hay una decisión cerrada sobre qué reglas
son, cómo se declaran ni cómo se enseña su cumplimiento.

## Decisión

1. **La ficha de código no tiene sección Reglas.** Ni fichero, ni carpeta, ni
   proyecto. Salen las violaciones de arquitectura, la deuda de migración y el
   catálogo de lint. La vista de código habla de lo que el fichero es y de lo
   que falla, no de las reglas que lo juzgan.

2. **Entra una sección Lint, con los hallazgos como sujeto.** En el fichero:
   la deuda, su peso en el riesgo y los mensajes —regla, línea, severidad y
   texto—, cortados a los primeros. En carpeta y proyecto: la deuda del ámbito y
   los hallazgos agrupados por regla, que es lo que se puede leer de un subárbol.
   Sin sistemas, sin reglas activas y sin configuraciones: eso es configuración y
   no vive en una ficha de código.

3. **Los cruces FFI se mudan a Dependencias.** Ya no son una regla: son una
   arista que cruza la frontera de la migración, y su sitio es la lista de
   dependencias del fichero.

4. **Reglas queda reservada a doc y config.** Cuando las reglas de arquitectura
   se fijen, serán una **subsección** de Reglas en las fichas de documentos y
   configuración, junto a las reglas del resto —enlaces rotos, huérfanos,
   frontmatter y la gemela declarada—. No se crea una sección vacía mientras no
   haya nada medido que enseñar.

5. **La pestaña Reglas del diff no cambia.** No es una ficha: es la lectura del
   cambio y sigue enseñando las violaciones nuevas, existentes y resueltas que
   trae el reporte.

## Consecuencias

- La ficha del fichero pierde una sección que mezclaba dominio, migración y
  lint; gana una que se puede accionar: qué regla falló, en qué línea y cuánto
  pesa.
- El catálogo de reglas activas deja de verse en la hoja del proyecto. Sigue en
  el artefacto `lint.repmod.json`, que es donde se lee la configuración.
- Un fichero medido y limpio se distingue de uno sin medir: la sección dice
  «sin hallazgos» con la cobertura, o «sin medir» con el mínimo recomendable.
- Las violaciones de arquitectura no desaparecen del producto: viven en la
  pestaña Reglas y en el reporte. Solo dejan de ocupar la ficha de código antes
  de que su modelo esté fijado.
- Enmienda el reparto del [ADR 0096](../0091-0100/0096-el-lint-es-del-proyecto.md), que decía
  que no habría una sección Lint, y el «sin listado de mensajes» del
  [ADR 0095](../0091-0100/0095-la-ficha-del-proyecto.md).
- Tests: los mensajes del fichero, el peso del lint en el riesgo, la cobertura
  del cero y la ausencia de sistemas y reglas activas en las tres fichas.

## Alternativas descartadas

- **Dejar Reglas en código y añadir Lint dentro.** Dos nombres para el mismo
  contenido y el catálogo otra vez en medio.
- **Mantener el catálogo de reglas activas en el proyecto.** Es el sitio donde
  se decide el lint del repo, pero no es el sitio donde se lee el riesgo: sus
  cifras no son hallazgos y se confunden con la deuda.
- **Crear ya la sección Reglas en doc y config.** Sin reglas de arquitectura
  fijadas ni reglas del resto medidas, sería una sección vacía o un catálogo
  repetido en cada documento.
- **Llevar los mensajes de todo el proyecto a la ficha de proyecto.** Miles de
  filas que no se leen; en el proyecto se agrupa por regla y se baja al fichero.

## Hoja de ruta

Fase **M75 — El lint se lee por hallazgos**.

- ✅ Quitar **Reglas** de las fichas de fichero, carpeta y proyecto.
- ✅ **Lint** en las tres: deuda, peso en el riesgo y hallazgos; mensajes en el
  fichero y agrupados por regla en carpeta y proyecto.
- ✅ Los cruces FFI, en **Dependencias**.
- ✅ Fuera el catálogo de reglas activas y los sistemas de la vista de código.
- ✅ Reglas reservada a doc y config, sin sección vacía.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
