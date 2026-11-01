---
title: "ADR 0100 — Los nombres de los artefactos de `.codarch/`"
description: "Una regla para nombrar lo que el producto deja en `.codarch/`: `.cc.json` solo para los cc.json 2.x que se abren fuera, `report.json` con sus módulos `<módulo>.repmod.json` al lado, `head-report.json` como está y el estado local sin sufijo. Sin alias: un artefacto, un nombre, declarado en el paquete que lo escribe."
section: desarrollo
status: aceptado
date: "2026-10-31"
sidebar:
  label: Los nombres de los artefactos
  order: 100
---

**Estado:** aceptado · **Fecha:** 2026-10-31

## Contexto

La carpeta `.codarch/` había crecido sin una regla de nombres, y eso ya costaba código: el artefacto
del lint se llama `lint.cc.json` desde el [ADR 0094](0094-el-lint-en-el-mapa.md), pero **no es un
cc.json** —lleva `schemaVersion` propio, no `meta.apiVersion`—, así que el sufijo prometía una
interoperabilidad que no tiene. El nombre anterior, `lint.json`, dejó de escribirse y **seguía
leyéndose en siete sitios** —la web dos veces, dos funciones del CLI, `serve`, el MCP y el escritorio,
con su constante copiada—, cada uno con su lista de nombres. En este repo convivían los dos ficheros:
uno lo escribía un servidor viejo y el otro ya nadie.

Alrededor del mismo problema había más preguntas sin respuesta escrita: `report.json` y
`head-report.json` son dos documentos de la misma familia sin relación declarada, y `chains.json`,
`scopes.json`, `parse-cache.json` y `preferences.json` son estado local que se lee igual que un
documento que se comparte.

## Decisión

### 1. `.cc.json` es el formato, no la propiedad

El sufijo `.cc.json` se reserva a los documentos **cc.json 2.x** —`meta`, `files`, `lenses`,
`meta.apiVersion`—, que son los que otra herramienta puede abrir sin CodArch: `snapshot.cc.json` y
`rest.cc.json`. Nada más lo lleva. Si un fichero no se abre fuera, no lleva `cc` en el nombre.

### 2. `report.json`, y sus módulos al lado

`report.json` es **el reporte**: lo que un diff deja para la vista de PR, con su `schemaVersion` y su
resumen. Sus piezas —datos que se consumen junto al reporte y no por separado— se llaman
`<módulo>.repmod.json`, con `repmod` de *report module*, y viven en la misma carpeta:

| Fichero | Qué es |
|---|---|
| `report.json` | el reporte del diff |
| `lint.repmod.json` | el módulo de lint del reporte |

El módulo se lee cuando se lee el reporte y hereda su árbol: `meta.tree` del lint es el checksum del
snapshot que el reporte compara ([ADR 0098](0098-el-lint-dice-que-arbol-midio.md)). Un módulo nuevo se
nombra igual, sin inventar otro sufijo.

### 3. `head-report.json` se queda

Es el reporte de lo tocado desde el último commit, y su nombre dice qué es sin ambigüedad: no es otro
formato, es otro sujeto. Cambiarlo no aclararía nada y rompería a quien ya lo lee.

### 4. El estado local no lleva sufijo

`chains.json`, `scopes.json`, `parse-cache.json` y `preferences.json` son estado de este repo, no
documentos que se compartan: nombre llano, sin `cc` ni `repmod`.

La tabla completa de lo que escribe el producto queda así:

| Fichero | Familia | Se comparte |
|---|---|---|
| `snapshot.cc.json` | cc.json 2.x | sí |
| `rest.cc.json` | cc.json 2.x | sí |
| `report.json` | reporte | sí |
| `lint.repmod.json` | módulo del reporte | con el reporte |
| `lint-rest.repmod.json` | módulo del resto | con el resto ([ADR 0105](../0101-0110/0105-las-reglas-de-doc-y-config.md)) |
| `head-report.json` | reporte | sí |
| `chains.json` | estado local | no |
| `scopes.json` | estado local | no |
| `parse-cache.json` | estado local | no |
| `preferences.json` | estado local | no |

### 5. Un nombre, un sitio

Cada artefacto tenía su nombre **en el paquete que lo escribe** —`packages/lint` para el lint,
`packages/schema` para los cc.json, `packages/metrics` para el reporte— y los consumidores importaban
la constante. Ningún consumidor repetía la lista de nombres ni mantenía alias propios: si un artefacto
cambiaba de nombre, se cambiaba en un sitio.

El [ADR 0101](../0101-0110/0101-la-carpeta-es-del-producto.md) lo enmienda: los nombres viven en un
**registro** de `packages/schema` —`CODARCH_ENTRIES`— y el paquete que escribe el artefacto lo
importa. Un sitio y no uno por paquete, porque la lista también es la que decide qué se limpia.

### 6. Sin compatibilidad

El producto va por 0.x y un artefacto local se regenera midiendo otra vez. No se lee ningún nombre
anterior: `lint.json` y `lint.cc.json` dejan de existir, y un fichero con esos nombres se ignora en vez
de leerse a medias. La lectura de nombres viejos —que era la fuente de la duplicación— desaparece.

## Consecuencias

- El artefacto del lint pasa a ser `.codarch/lint.repmod.json`, también en lo que sirve `serve`
  (`/data/lint.repmod.json`) y en lo que copia `codarch render` a `data/`.
- Se borran los siete lectores de nombres viejos y la constante `LINT_ARTIFACT_FILE_LEGACY`.
- `escritorio.md` y las páginas del CLI dicen el nombre nuevo, y la tabla de la carpeta deja de tener
  dos nombres para lo mismo.
- Un repo con un `lint.cc.json` de ayer no lo verá hasta volver a analizar: la hoja dirá «sin medir»,
  que es exactamente lo que ese fichero es para esta versión.

## Hoja de ruta

- ✅ El nombre del artefacto del lint y la regla escrita (ADR 0100).
- ⬜ Los módulos que vengan después —historial de cambio, símbolos— adoptan `repmod` sin decidir otro
  sufijo.
- ✅ Los nombres viven en un registro y la carpeta se limpia al analizar (ADR 0101).
- ⬜ Si `report.json` y `head-report.json` acaban unificándose en un documento con `base` y `head`, el
  nombre se decide entonces y con otro ADR; hoy son dos sujetos distintos y así se leen.
