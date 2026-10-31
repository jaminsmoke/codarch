---
title: "ADR 0103 — El checksum es del código, también con historial"
description: "El checksum cubre hoy `files` + `lenses`, y la lente de historial entra cuando hay git: el mismo árbol da dos checksums y el navegador solo se compara con `--no-git`. La identidad pasa a ser el código; el churn se queda en el snapshot con su propio hash, y el navegador lee el mismo alcance que el CLI."
section: desarrollo
status: aceptado
date: "2026-10-31"
sidebar:
  label: El checksum es del código
  order: 103
---

**Estado:** aceptado · **Fecha:** 2026-10-31

## Contexto

El checksum de `cc.json` es MD5 de `{ files, lenses }` serializado de forma canónica. Es la identidad
del snapshot: el diff decide con él si hay algo que contar, la app si el documento que llega es otro, el
lint firma con él el árbol que midió y el MCP lo enseña como la versión del mapa.

Hasta hoy, la lente de métricas lleva dos campos que **no salen del código**: `number_of_commits` y
`number_of_authors`, medidos con git ([ADR 0009](../0001-0010/0009-churn-desde-git.md)). Cuando el
análisis corre sin git —el navegador, `--no-git`, un test—, esos campos no existen. Medido en este repo
en la auditoría de esta semana: **626 ficheros**, mismo árbol, dos checksums distintos según se pase
`git: true` o `git: false` (`261d1e41…` y `b246b7bb…`). La consecuencia es que el CLI por defecto y el
navegador no coinciden nunca, y el producto tiene que pedir un flag para comparar dos lecturas del
mismo código.

El punto 5 del [ADR 0020](../0011-0020/0020-analisis-en-el-navegador.md) ya lo vio y lo resolvió a
medias: «el checksum del navegador será el del CLI con `--no-git`». Eso no es un contrato entre
entornos; es una condición que el usuario tiene que recordar. Además choca con la regla que el producto
repite: **el checksum depende del código, no de lo que tengas instalado** ([ADR 0029](../0021-0030/0029-los-addons.md)),
y un clon superficial, un repo sin historial o el navegador son formas distintas de mirar lo mismo.

No es el primer dato que se queda fuera por este motivo. Las cadenas de símbolos viven en su libro
mayor y no en el snapshot precisamente para no atar el checksum al historial
([ADR 0026](../0021-0030/0026-la-vida-de-un-simbolo.md)). El lint tampoco entra: depende de las
herramientas instaladas y tiene su propio checksum y su `meta.tree`
([ADR 0099](../0091-0100/0099-el-lint-se-mide-al-analizar.md)). El churn es el caso que faltaba.

Hay una segunda divergencia, más silenciosa, en el camino del navegador. El lector de la web salta
directorios **por su nombre** —`dist`, `build`, `out`, `target`, `coverage`, `.next`, `.turbo`,
`.cache`, `.venv`, `__pycache__`— además de los internos del modelo. El walker del CLI solo salta
`node_modules`, `.git` y `.codarch`, y deja el resto a `.gitignore` y al `ignore` del proyecto
([ADR 0038](../0031-0040/0038-el-alcance-del-analisis.md)). Un repo que versiona `build/generated.ts`
sin ignorarlo entra en el mapa del CLI y no en el del navegador: mismo código, distinto conjunto de
ficheros y distinto checksum. Comparar los dos snapshots no puede depender de una lista de nombres que
solo conoce una de las dos apps.

## Decisión

### 1. El checksum cubre solo lo que sale del código

El payload canónico sigue siendo `{ files, lenses }`, pero la lente de métricas se normaliza antes de
hashear: se quitan `number_of_commits` y `number_of_authors` de `attributes`, de
`attributeDescriptors` y de `attributeTypes`. Todo lo demás —tamaño, complejidad, acoplamiento, ciclos,
migración, símbolos, estructura, duplicación— entra igual que hoy.

Con eso, el mismo árbol da el mismo checksum en el CLI por defecto, en `--no-git`, en el navegador, en
la acción de GitHub y en cualquier clon, mida o no el historial. La identidad pasa a significar **este
código**, no «este código y lo que este clon sabe de su historia».

### 2. El historial se queda en el snapshot, con su propio hash

El churn no se borra: es una señal legítima, la usan el riesgo y el calor del mapa, y se mide en la
misma pasada. Se queda en la lente de métricas, pero deja de ser identidad. Cuando hay historial, el
snapshot lleva además `meta.historyChecksum`: MD5 canónico de los valores de historial medidos
(fichero a fichero). Sin historial —navegador, `--no-git`— el campo no existe.

Así, dos snapshots del mismo código con distinto historial comparten `meta.checksum` y difieren en
`meta.historyChecksum`; y uno sin historial es **sin medir**, no «cero commits», igual que el lint
([ADR 0098](../0091-0100/0098-el-lint-dice-que-arbol-midio.md)). `meta` queda fuera del checksum, como
siempre: añadir el campo no cambia la identidad.

### 3. Comparar dos snapshots: primero el código, después el calor

| Caso | `checksum` | `historyChecksum` | Lectura |
|---|---|---|---|
| Mismo código y mismo historial | igual | igual | Nada que refrescar |
| Mismo código, historial distinto | igual | distinto | Mismo árbol; solo cambia el calor |
| Mismo código, uno sin historial | igual | uno ausente | Mismo árbol; uno no mide historial |
| Código o alcance distintos | distinto | — | Otro árbol |

La app no vuelve a decir «este snapshot es de otro árbol» cuando lo único que cambia es el historial:
refresca el calor y conserva la vista. `lint.meta.tree` se sigue comparando con `meta.checksum`, así que
un lint medido con git vale también para el mismo código analizado sin git. El `commitHash` de `meta`
sigue siendo informativo y no entra en ningún hash.

El diff y el reporte no cuentan el churn como cambio de código: un PR no «cambia» un fichero porque su
número de commits suba. Si el código es el mismo, el diff está vacío aunque el historial haya cambiado.

### 4. El navegador lee el mismo alcance que el CLI

El lector del navegador solo puede saltar los directorios internos del modelo: `node_modules`, `.git` y
`.codarch`. Deja de saltar `dist`, `build`, `out`, `target` y los demás por su nombre: el alcance lo
deciden `.gitignore` y el `ignore` del proyecto, y el analizador ya los aplica. La lista de internos se
comparte entre el walker y el lector para que no vuelva a haber dos listas.

El tope de ficheros del navegador (20 000) sigue abortando con un error y nunca produce un snapshot
parcial: un mapa incompleto con checksum válido sería la peor de las dos verdades.

### 5. Compatibilidad y coste

No sube `apiVersion`: es una lente opcional y un campo opcional de `meta`. Los checksums existentes
cambian **una vez**, como cambiaron al unificar la regla de comentarios
([ADR 0020](../0011-0020/0020-analisis-en-el-navegador.md)): un snapshot de antes y uno de después no son
comparables por checksum, y eso es esperado. El snapshot gana un campo; ningún consumidor que no lo
conozca se rompe.

## Consecuencias

- El CLI por defecto, `--no-git`, el navegador y la acción dan el mismo checksum para el mismo código.
  La documentación deja de pedir `--no-git` para comparar.
- El calor y el riesgo pueden cambiar sin cambiar el checksum; es una lectura del historial, no del
  código, y la app lo dice así.
- Un snapshot sin historial no es un snapshot con cero calor: es uno sin medir.
- La app necesita mirar los dos hashes para decidir si refresca solo el calor o todo el documento.
- El navegador lee más directorios en algunos repos; el tope y el error explícito son la red.
- Tests: mismo árbol con y sin git da el mismo checksum; historial distinto da el mismo checksum y otro
  `historyChecksum`; un repo con `build/` versionado da el mismo conjunto de ficheros en CLI y
  navegador; determinismo del payload normalizado.

## Alternativas descartadas

- **Dejarlo como está y comparar con `--no-git`.** Es el punto 5 del ADR 0020: dos verdades por defecto
  y un flag que hay que recordar. El checksum deja de ser una propiedad del código.
- **Meter el churn en su propio artefacto, como el lint o el resto.** Es coherente con el ADR 0093 y el
  0099, pero obliga a repetir el recorrido y a migrar el riesgo y el calor sin necesidad para esta
  decisión. Se puede hacer después sin romper este contrato.
- **Hashear todo `meta` (commit y churn).** Ata la identidad al historial y a lo que el clon conoce: dos
  clones del mismo commit darían cosas distintas ([ADR 0026](../0021-0030/0026-la-vida-de-un-simbolo.md)).
- **Quitar la lente de métricas entera del checksum.** Perdería tamaño, complejidad y acoplamiento, que
  sí salen del código.
- **Usar `commitHash` como versión del historial.** No distingue un clon superficial de uno completo y
  no existe en el navegador.
- **Dejar que el navegador salte directorios por nombre.** Es un alcance distinto que el checksum no
  puede explicar: mismo código, otra lista de ficheros.
- **Comparar por lista de ficheros en vez de por checksum.** Es lo mismo que hace el checksum, pero más
  caro y sin cubrir las métricas.

## Hoja de ruta

**Estado:** abierta. M72 y M73 cerradas; M74 ajusta la comparación en la app.

### M72 — El checksum es del código

- ✅ Normalizar el payload del checksum: fuera `number_of_commits` y `number_of_authors` de atributos,
  descriptores y tipos; el resto de lentes entra igual.
- ✅ `meta.historyChecksum` cuando hay churn, calculado sobre los valores medidos; ausente sin git.
- ✅ Tests: mismo árbol con y sin git da el mismo checksum; historial distinto da el mismo checksum y
  otro `historyChecksum`; un snapshot sin historial no es cero; determinismo del payload.
- ✅ El diff y el reporte no cuentan el churn como cambio de código.
- ✅ Documentos: `model.md` (ES/EN), el punto 5 del ADR 0020 queda enmendado y la guía recoge la cifra
  del cambio único de checksum.

Medido al cerrarla: el mismo árbol de **626 ficheros** da un solo checksum con git y sin git, y el
`historyChecksum` aparece solo cuando se mide el historial. El auditor de lentes queda en verde.

### M73 — El navegador lee el mismo alcance

- ✅ La lista de directorios internos se comparte entre el walker y el lector del navegador: solo
  `node_modules`, `.git` y `.codarch`.
- ✅ El lector deja de saltar `dist`, `build`, `out`, `target`, `coverage` y los demás por su nombre; el
  `.gitignore` y el `ignore` se aplican en el analizador.
- ✅ Test: un repo con `build/generated.ts` versionado y sin ignorar da el mismo conjunto de ficheros y
  el mismo checksum en el CLI con `--no-git` y en el navegador.
- ✅ El tope de 20 000 ficheros sigue abortando con error, nunca con un snapshot parcial.

Al implementarla se vio que el lector **no leía los `.gitignore`**: sin ellos en memoria, el walker no
podía aplicar el alcance del proyecto y el navegador medía de más. Ahora los lee como un fichero de
configuración más y las reglas las aplica el analizador.

### M74 — La app compara código e historial

- ⬜ La app y el live comparan `{ checksum, historyChecksum }`: mismo código con más calor refresca el
  calor sin resetear la vista; sin historial se dice «sin historial», no «otro árbol».
- ⬜ `lint.meta.tree` se compara con `meta.checksum`, que ya es el del código.
- ⬜ El MCP expone los dos hashes y qué significa cada uno.
- ⬜ Tests de la app, del live y de las consultas del MCP.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
