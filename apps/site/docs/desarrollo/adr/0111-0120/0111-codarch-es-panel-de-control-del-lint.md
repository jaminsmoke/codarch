---
title: "ADR 0111 — CodArch es también panel de control del lint"
description: "La ficha deja de ser solo lectura: activa y desactiva reglas escribiendo en la config del proyecto, con confirmación y sin una segunda fuente de verdad. Empieza por oxlint en JSON."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: CodArch es panel de control del lint
  order: 111
---

**Estado:** aceptado · **Fecha:** 2026-11-08

**Enmienda** el punto del [ADR 0096](0096-el-lint-es-del-proyecto.md) que dejaba la
configuración como solo lectura y el [ADR 0104](0104-el-lint-se-lee-por-hallazgos.md) que hacía
read-only la sección de reglas.

## Contexto

CodArch leía el lint del proyecto y enseñaba sus reglas, pero no podía cambiarlas. La ficha era un
espejo. Para que sea útil como panel de control, activar o desactivar una regla tiene que cambiar la
configuración real del proyecto: si CodArch guardara una preferencia propia, `npm run lint` y CodArch
dirían cosas distintas. Eso no se acepta.

## Decisión

1. **Una sola fuente de verdad: la config del proyecto.** Toda acción de la ficha escribe en el
   fichero que el proyecto ya usa. CodArch no mantiene una lista paralela de reglas activas.
2. **Solo se escribe lo que se puede leer y validar.** La primera herramienta es **oxlint** en JSON
   (`oxlint.json`, `.oxlintrc.json`). ESLint queda fuera de esta entrega: su config es JavaScript
   ejecutable y exige un escritor con AST y una decisión sobre presets y overrides.
3. **Activar** escribe `"regla": "error"` o `"regla": "warn"` en `rules`. **Desactivar** quita la
   entrada si era explícita y no hay categorías activas; si la regla puede venir de una categoría o de
   un preset, escribe `"regla": "off"` en la config del proyecto. Nunca se toca una regla heredada a
   ciegas.
4. **Confirmación con contexto.** El botón de desactivar abre una confirmación en la propia fila con la
   regla, el fichero y el cambio exacto. No hay un «¿seguro?» sin sujeto.
5. **Recomendadas.** Un catálogo curado y versionado en `@codarch/lint` dice el mínimo por herramienta.
   La ficha enseña las recomendadas que no están activas y las activa con la misma escritura. Las
   recomendaciones específicas por proyecto llegan después, cuando haya señales que las justifiquen.
6. **Escritura segura.** El servidor valida el origen, el sistema y la regla, escribe de forma atómica
   y pide al live que reanalice. La ficha se actualiza con el artefacto nuevo: no se inventa el estado.
7. **Si no se puede escribir, se dice.** Una config de solo lectura, un formato desconocido o una
   plataforma sin escritura no muestran botones activos. No se simula el cambio.

## Consecuencias

- CodArch deja de ser un espejo y pasa a ser monitor y panel de control; el artefacto sigue siendo la
  medida de la config del proyecto.
- La rama de solo lectura (catálogo, agrupación, plegado) sigue siendo la presentación; la escritura
  es una capa aparte.
- El live necesita reanalizar después de escribir. Sin live, el cambio se aplica igual, pero la ficha
  no se actualiza sola.
- ESLint conserva la ficha de lectura hasta que exista su escritor. No se finge que se puede editar.

## Alternativas descartadas

- **Guardar las reglas en `.codarch.yml` y aplicarlas solo al medir.** Sería una segunda fuente de
  verdad y `npm run lint` no vería el cambio.
- **Reescribir `eslint.config.js` como texto.** Es código: presets, spreads y overrides no se pueden
  borrar buscando líneas.
- **Activar sin confirmación.** Un cambio de configuración es una escritura en el repo; el usuario
  tiene que ver qué fichero y qué línea se toca.
- **Enseñar el catálogo completo de reglas de cada herramienta.** No lo tenemos para ESLint y
  envejecería con cada versión; las recomendadas son un set pequeño y mantenido.

## Hoja de ruta

Sin fase nueva.

- ✅ La decisión y el catálogo mínimo de recomendadas.
- ✅ El escritor de oxlint JSON con activar, desactivar y validación.
- ✅ La ruta del servidor y el reanálisis del live.
- ✅ La confirmación en la fila y el bloque de recomendadas.
- ⬜ ESLint con AST y overrides, en una entrega aparte.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
