---
title: "ADR 0101 — La carpeta es del producto"
description: "`.codarch/` pasa a tener un registro de nombres en `@codarch/schema` —un nombre, un sitio—, una limpieza al analizar que borra lo que no reconoce con aviso y conserva el estado local, y un solo módulo que declara los dos reportes y cuál manda. La carpeta deja de ser un cajón."
section: desarrollo
status: aceptado
date: "2026-10-31"
sidebar:
  label: La carpeta es del producto
  order: 101
---

**Estado:** aceptado · **Fecha:** 2026-10-31

## Contexto

El [ADR 0100](../0091-0100/0100-los-nombres-de-los-artefactos.md) puso regla a los nombres, pero no
dueño a la carpeta. Cada paquete declaraba el suyo —`CHAINS_FILE`, `REST_FILE`, `PARSE_CACHE_FILE`,
`SCOPES_FILE`, `LINT_FILE`, `PREFERENCES_FILE`— y cada consumidor repetía la cadena cuando no la
importaba: `snapshot.cc.json` aparecía en once ficheros, `report.json` en una docena y `.codarch` en
treinta. El resultado de esta pasada lo enseñó: al borrar `lint.json` a mano, reaparecía.

La causa no era un script olvidado, era que **nada limpiaba la carpeta**. Un servidor de desarrollo
viejo seguía escribiendo `lint.json` y `codarch analyze` no lo miraba: escribía sus ficheros y dejaba
los demás donde estaban. En este repo convivían `lint.cc.json`, `lint.json` y `lint.repmod.json`, y
`map.html` de una copia de trabajo. La carpeta del producto se había convertido en el taller.

El otro resto era el reporte. `report.json` y `head-report.json` son dos documentos de la misma
familia, y la regla de cuál enseña la app estaba escrita **cinco veces**: en el store del MCP, en
`serve`, en el escritorio, en la web y en la documentación. Cada copia es un sitio donde la
precedencia puede cambiar sin que las demás se enteren.

## Decisión

### 1. Un registro de nombres

`packages/schema/src/artifacts.ts` declara **todos** los nombres de la carpeta en una tabla,
`CODARCH_ENTRIES`, con el papel de cada uno. De ahí salen las constantes (`SNAPSHOT_FILE`,
`REPORT_FILE`, `LINT_FILE`, …), `CODARCH_KNOWN` —la lista que la limpieza reconoce— y
`isCodarchEntry`. `codarch-path.ts` añade `codarchDir(root)` y `codarchPath(root, entrada)` para
componer rutas sin repetir `.codarch`.

Esto enmienda el punto 5 del ADR 0100: el nombre ya no lo declara cada paquete que escribe, lo declara
**el registro**; el paquete que escribe lo importa y lo reexporta si su API lo usaba. Es la misma regla
—un nombre, un sitio— con un solo sitio en vez de once.

### 2. Analizar deja la carpeta limpia

`codarch analyze` y el análisis del escritorio, después de escribir sus artefactos, borran de
`.codarch/` **todo lo que no reconoce** y dicen qué se llevaron, con los nombres:

```
aviso: .codarch/ es del producto, no un cajón: se borraron 3 entradas que no reconoce (backup, lint.json, map.html)
```

La lista de lo que se conserva es `CODARCH_KNOWN`, y **el estado local está dentro**: preferencias,
caché de parseo, libro de cadenas, registro de alcances, caché de reglas y capturas. No se escriben
en esa pasada, pero son del producto y borrarlos costaría la vista elegida y un parseo entero. La
promesa es «lo que no reconozco se va», no «lo que no acabo de escribir se va».

Dos límites, a propósito:

- Solo se limpia el `.codarch/` del repo. Una salida de `--out` es una carpeta que eligió quien llamó,
  y ahí no se borra nada.
- `codarch serve` y `codarch lint` escriben sus ficheros pero no limpian: la limpieza es de la pasada
  que se sabe completa, y un servidor que reanaliza cada guardado no es el sitio para borrar.

### 3. Los dos reportes, en un módulo

`packages/parsers/src/report-store.ts` es el único sitio que sabe de los dos ficheros y de su
precedencia:

| Reporte | Fichero | Qué compara | Quién lo escribe |
|---|---|---|---|
| árbol de trabajo | `head-report.json` | lo que hay ahora contra el último commit | el escritorio en cada pasada |
| guardado | `report.json` | el par base/head que se abrió | quien guardó ese reporte |

`preferredReport(root)` devuelve el del árbol de trabajo y, si no lo hay, el guardado. `serve` usa ese
respaldo cuando git no puede comparar —un repo sin commits—, y el MCP lo usa cuando no se le pasa una
ruta explícita. Un reporte que no se entiende no es un reporte: se ignora en vez de servirse a medias.

Los dos ficheros siguen existiendo: son sujetos distintos y quien abre un PR quiere que su reporte no
lo pise el vigilante. Lo que cambia es que la relación está escrita y probada en un módulo, no
repetida en cada consumidor.

## Consecuencias

- Añadir un artefacto es añadir una línea a `CODARCH_ENTRIES`; si no está ahí, el siguiente `analyze`
  lo borra. Un fichero nuevo que se escriba en la carpeta y no entre en la tabla se pierde con aviso,
  que es la forma de que el olvido se note.
- Las pruebas siguen escribiendo el nombre literal a propósito: son el contrato del fichero. El código
  de producción no tiene literales de estos nombres.
- La carpeta se puede borrar entera sin perder nada que no se regenere, salvo preferencias y cachés:
  el siguiente análisis la reconstruye.
- Un `.codarch/` con un fichero de ayer se limpia en la siguiente pasada; mientras tanto `serve` y el
  escritorio leen lo que reconocen y nada más.

## Hoja de ruta

- ✅ El registro de nombres, la limpieza con aviso y el módulo de los dos reportes.
- ⬜ Lo que `serve` deja por el camino: hoy no limpia a propósito; si aparece basura que solo escribe
  el servidor, se decidirá si le toca a él o a la pasada completa.
- ⬜ El estado local no tiene versión: `chains.json`, `scopes.json` y `parse-cache.json` se leen por su
  forma. Un campo de versión por artefacto es otra decisión.
