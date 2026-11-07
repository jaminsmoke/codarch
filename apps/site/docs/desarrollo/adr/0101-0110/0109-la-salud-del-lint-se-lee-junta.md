---
title: "ADR 0109 — La salud del lint se lee junta"
description: "scopeHealthMerged junta el lint de código y el de documentos por ruta canónica, sin reescribir los artefactos ni meter los documentos en el riesgo."
section: desarrollo
status: aceptado
date: "2026-11-07"
sidebar:
  label: La salud del lint se lee junta
  order: 109
---

**Estado:** aceptado · **Fecha:** 2026-11-07

**Enmienda** el punto de la hoja de ruta del [ADR 0105](0105-las-reglas-de-doc-y-config.md) que pintaba los hallazgos del resto en las hojas de Docs y config. La cobertura de cada artefacto sigue siendo la del [ADR 0107](0107-la-cobertura-del-lint.md). El riesgo no cambia: sigue leyendo `scopeHealth` de cada fichero de código ([ADR 0108](0108-el-lint-suma-al-riesgo.md)).

## Contexto

El código se guarda en `lint.repmod.json` y los documentos en `lint-rest.repmod.json`. Cada uno tiene su `meta.tree`. La ficha de Código leía solo el primero, así que un legado 1.2 vacío salía como cobertura desconocida y los `doc/broken-link` acababan en Docs y config, mezclados con el catálogo.

Sumar los dos en la interfaz duplica la cuenta en cuanto alguien vuelve a sumar. Hace falta un solo adaptador.

## Decisión

1. La suma vive en una función pura. No escribe artefactos, no cambia `domain` y no guarda salud por carpeta.

```ts
function scopeHealthMerged(
  artifacts: readonly (LintArtifact | null)[],
  scope: HealthScope,
  snapshot?: HealthSnapshot
): MergedScopeHealth
```

2. Los hallazgos se funden por ruta canónica. Cada uno conserva `domain`, `tool` y `ruleId`. Si el artefacto de código no dice qué herramienta escribió el mensaje —eslint y oxlint comparten fichero—, la herramienta se infiere por el `ruleId` de `meta.systems` y el hallazgo queda `inferred`. Si las dos podrían haberlo escrito, no se duplica: `tool` junta las candidatas. `anchor` dice el mapa (`code` o `rest`) y la ruta, para que la UI pueda abrir el nodo.
3. La cobertura va por origen y por ruta. Un documento enumerado sale `enumerated` en sus `measuredPaths`. Un legado sale `legacy` / `unknown` en las suyas, con el motivo `legacy-version` («medido con una versión anterior»). `summary.measured > 0` de un 1.0–1.2 no lo pasa a `complete`. Un código 1.3 con ESLint enumerado y `eligiblePaths: null`, y oxlint en `unknown`, sigue en `partial`: no se fuerza a `complete`.
4. El agregado solo es limpio si todos los dominios aplicables a la selección están en `complete`, con `fresh === true` y cero hallazgos. Un legado o un `unknown` aplicable no es limpio. Un dominio que la ruta canónica deja fuera no cuenta.
5. En la raíz no se recortan los documentos con la lista de rutas del snapshot de código. En carpeta y fichero manda la ruta canónica.
6. `meta.tree` no se funde. Cada origen guarda el suyo y su frescura. Si el snapshot es el árbol del otro origen, la frescura de este queda en `null`: no se declara viejo y no se finge que los dos árboles son uno.
7. El riesgo no llama a `scopeHealthMerged`. Sigue leyendo el artefacto de código.
8. Docs y config lee el catálogo, no los hallazgos. `systemActivity` deriva `activeRules` y `countState` (`known-complete`, `partial` o `unknown`) de `meta.systems`. No se escriben en el fichero. Oxlint con la nota «no se enumeran» y sin lista es `unknown`, nunca cero.
9. Las reglas del sistema `codarch` salen de `codarchActiveRules` en `packages/lint/src/rest.ts`: el enlace roto siempre, y huérfanos, frontmatter y gemelas solo si el bloque `docs:` los enciende. No salen de los mensajes. `buildRestLint` las escribe en `meta.systems[].rules`, campo que ya existía.

## Checksum

El checksum del artefacto sigue siendo el de `{ domain, tools, systems, files, coverage }`. `countState`, `activeRules`, `inferred` y `anchor` no entran: se calculan al leer.

Escribir `rules` en el sistema `codarch` sí cambia el checksum de un `lint-rest.repmod.json` nuevo, porque `systems` ya formaba parte de la entrada. Un artefacto ya guardado no se recalcula: `readLintArtifact` conserva el checksum del fichero. Un sistema sin `rules` se sigue leyendo; el catálogo, si falta la lista, enseña `codarchRuleCatalog()` y no los hallazgos.

## Consecuencias

- La ficha de Código enseña la salud y los hallazgos de los dos dominios, filtrados por la selección. Docs y config no enseña cuentas de hallazgos ni ficheros afectados.
- Un `.md` no es un nodo del mapa de código: las extensiones del análisis no lo incluyen. Está en el mapa del resto. El `anchor` del hallazgo apunta a ese mapa. Si la ficha de código no tiene el nodo, el botón no puede seleccionarlo ahí.
- La frescura de los documentos no se verifica contra el checksum del código. Con los dos árboles distintos, el agregado no se llama limpio.

## Alternativas descartadas

- **Reescribir los dos artefactos en uno.** Un `meta.tree` no puede firmar dos árboles.
- **Sumar en cada panel.** La segunda suma no cuadra con la primera.
- **Tratar el legado con `measured > 0` como verificado.** El número no dice qué rutas se miraron.
- **Forzar el código 1.3 a `complete`.** ESLint deja el universo en `null` y oxlint no enumera: es `partial` a propósito.
- **Guardar `countState` en el fichero.** Obligaría a un campo nuevo en el checksum para un dato que sale de la nota y de `rules`.

## Hoja de ruta

Sin fase nueva.

- ✅ `scopeHealthMerged`, el catálogo con `countState` y las reglas de `codarch` en el productor.
- ✅ La ficha de Código lee los dos orígenes. Docs y config queda en el catálogo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
