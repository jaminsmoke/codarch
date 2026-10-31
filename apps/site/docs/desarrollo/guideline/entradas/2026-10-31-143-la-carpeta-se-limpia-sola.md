---
title: "La carpeta se limpia sola, y los nombres viven en un registro"
date: "2026-10-31"
category: "feature"
verdict: "arreglo"
---

**Qué era**: el ADR 0100 puso regla a los nombres, pero la carpeta no tenía dueño. `snapshot.cc.json`
aparecía en once ficheros y `.codarch` en treinta, cada paquete con su constante y cada consumidor con su
copia; `report.json` y `head-report.json` tenían la regla de cuál manda escrita cinco veces —MCP, `serve`,
escritorio, web y documentación—. Y nada limpiaba: un `lint.json` borrado a mano **reaparecía**, porque un
script viejo lo seguía escribiendo y `analyze` no miraba lo que sobraba. En este repo convivían tres
nombres del lint y un `map.html` de una copia de trabajo.

**Qué cambia**: el [ADR 0101](../../adr/0101-0110/0101-la-carpeta-es-del-producto.md). Los nombres pasan a
un **registro** en `@codarch/schema` —`CODARCH_ENTRIES`, con el papel de cada fichero—, y de ahí salen las
constantes, `codarchPath` y la lista que reconoce la limpieza. `codarch analyze` y el escritorio, después
de escribir, **borran lo que no reconocen** y dicen qué se llevaron con sus nombres. El estado local
—preferencias, caché de parseo, libro de cadenas, alcances, caché de reglas, capturas— se conserva aunque
esa pasada no lo escriba. Y los dos reportes tienen un módulo: `report-store` declara qué compara cada
uno, quién lo escribe y que el del árbol de trabajo manda.

**Por qué así**: una carpeta sin dueño se llena, y una regla repetida en cinco sitios se desincroniza. La
alternativa —borrar todo lo que no se acaba de escribir— era más simple y peor: se llevaba la vista
elegida y obligaba a parsear entero cada análisis. `--out` no se limpia porque esa carpeta la eligió
quien llamó, y `serve` no limpia porque reanaliza cada guardado: la limpieza es de la pasada completa.

**Verificado**: en este repo, `codarch analyze .` deja `.codarch/` en sus nueve ficheros, con
`lint.repmod.json` de 525 ficheros medidos y sin `lint.json` ni `lint.cc.json`, y el aviso dice qué borró.
Tests nuevos para `sweepCodarch` (conserva lo conocido, borra ficheros y carpetas, no crea la carpeta,
lista ordenada), para `preferredReport` (precedencia, fichero ilegible, escritura determinista) y dos de
`analyze` (limpia el repo y avisa; no toca la salida de `--out`). El de paridad del escritorio y `serve`
ahora escribe un reporte de verdad: un JSON que el lector no entiende ya no vale como respaldo.

**Veredicto**: arreglo.
