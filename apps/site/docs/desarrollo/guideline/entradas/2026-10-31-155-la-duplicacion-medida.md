---
title: "La duplicación, medida"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**Qué era**: el modelo sabía cuántas líneas tenía un fichero y cuánto costaba migrarlo, pero no si esas
líneas estaban escritas dos veces. Y lo estaban: la app web y el escritorio comparten su `main.tsx`
carácter a carácter, y los barrels de `schema` y `lint` repiten buena parte de sus módulos. La deuda
agregada sube al partir un fichero grande y no había forma de distinguir «se partió» de «se copió»
(ADR 0102).

**Qué cambia**: la lente `duplication` de `cc.json`, opcional y determinista:

| Pieza | Contenido |
|---|---|
| `nodes` | `duplicatedLines`, `repeatedLines` y `duplicateOf` cuando el fichero es copia literal |
| `pairs` | `fromId`, `toId`, `lines`, `similarity` 0–100 y `status: "copy" \| "diverging"` |
| `summary` | pares, copias, líneas duplicadas, repetidas y proporción |

El detector no sabe de gramáticas: normaliza las líneas significativas que ya cuenta `rloc` y busca
ventanas de **ocho** con su SHA-256, fundiendo las contiguas antes de contar. Comparte con el mapa los
seis lenguajes y el alcance. `similarity` es ventanas compartidas sobre el mínimo de los dos ficheros:
100 es `copy`, de 40 a 99 es `diverging` y por debajo no hay par.

Dos métricas nuevas, ambas con `direction: -1`: `duplicatedLines` (entre ficheros) y `repeatedLines`
(dentro de uno). La proporción no se guarda: se divide al leer, y carpetas y proyecto suman líneas y
dividen por su `rloc`, nunca suman porcentajes. `migrationDebt` no cambia de fórmula: la duplicación no
se le suma.

**Por qué así**: una copia que se separa no se ve mirando líneas, y el umbral de ocho deja fuera el
wrapper de tres líneas y dentro una función de verdad. Se mide lo copiado tal cual en v1; el renombrado
pediría AST o normalizar identificadores y rompería la paridad entre el CLI y el navegador. La huella de
duplicación viaja en la caché de parseo, así que un guardado no relee los ficheros que no cambiaron
(ADR 0056), y el checksum sigue saliendo del código medido.

**Verificado**: **11 tests nuevos** —el corte de `K` (7 líneas no, 8 sí), el idéntico y su canónico, la
repetición interna, los umbrales, el alcance, la lectura sin lente y la determinación—; suite entera en
verde (**174 ficheros y 1509 tests**), typecheck y lint limpios y el sitio se escribe. La primera medida
de este repo dio **598 ficheros**, **2.183 líneas duplicadas**, **518 repetidas** y **5 pares**. Con los
bloques compartidos ya quitados —la superficie de `schema` y `lint`, el `reader.ts` de la web, el marco
del `InspectorBar`, la proyección de perfiles y los argumentos de `history` y `scopes`— quedan **626
ficheros**, **1.820 líneas duplicadas** y **466 repetidas**, el 3 % del `rloc`, en **1 par**: los dos
`main.tsx`, que solo difieren en un comentario. Por fichero, los primeros son
los analizadores de Go, Java y Python (53, 52 y 49 líneas), que comparten esqueleto por debajo del
umbral de par.

**Veredicto**: fase. M68 cierra la medida; M69 la pinta, M70 nombra la divergencia y M71 la lleva al diff.
