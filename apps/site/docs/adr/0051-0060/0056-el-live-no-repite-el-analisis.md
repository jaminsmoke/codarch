---
title: ADR 0056 — El live no repite el análisis
description: "Guardar un fichero reparsea solo lo que cambió: el análisis incremental reutiliza el parseo por fichero y rehace resolución, grafo y snapshot, que cuestan milisegundos. El churn de git se cachea por HEAD, la vigilancia son dos handles por repo y `git status` decide si un aviso cambia el mapa."
section: adr
status: aceptado
date: "2026-10-24"
sidebar:
  label: El live no repite el análisis
  order: 56
---

**Estado:** aceptado · **Fecha:** 2026-10-24

## Contexto

El live funciona (ADR 0050), pero cuesta lo mismo que un análisis desde cero: cada guardado reparsea
los 303 ficheros del repositorio. Medido en este repo con el árbol de una pasada (ADR del parser):

| Fase | Coste |
|---|---|
| Leer y parsear todos los ficheros | **2 194 ms** (78 %) |
| Churn de git (`git log --numstat` del historial) | **480 ms** |
| Recorrido, resolución, grafo, migración y snapshot | ~140 ms |
| Total | 2 819 ms |

Es decir: el 92 % del tiempo se va en trabajo que no ha cambiado. Y la vigilancia abre un `fs.watch`
por carpeta con chokidar: cientos de handles por repo, que es el equivalente a tener un websocket por
directorio. Lo único grande que se escribe es el snapshot (431 KB en este repo), y ya solo cuando
cambia el checksum.

## Decisión

### 1. Se reutiliza el parseo, no el snapshot

El análisis guarda por fichero lo que cuesta calcular: métricas, importaciones, símbolos y el hash del
cuerpo, con una versión `tamaño:mtime` del fichero. Al cambiar algo se releen **solo** los ficheros con
otra versión y se rehace el resto del pipeline entero:

- La **resolución de imports, el grafo, la migración y el snapshot** se rehacen siempre (~140 ms),
  porque dependen del conjunto de ficheros: añadir `foo/index.ts` cambia lo que resuelve `./foo`.
- El **churn de git** se cachea por `HEAD`. `git log` no cambia si no hay commit nuevo; si lo hay, se
  rehace (480 ms), que es cuando toca.
- La caché vive en memoria del proceso que analiza (el `utilityProcess` del escritorio, el CLI, `serve`).
  No se persiste: es derivada y no altera el estado del repo.

El invariante es el de siempre: **el checksum depende del código**. Un análisis incremental tiene que
dar exactamente el mismo `cc.json` que uno completo, y hay un test diferencial que lo comprueba sobre
ediciones, altas y bajas de ficheros.

### 2. La vigilancia son dos handles, no un árbol de handles

- Un `fs.watch(root, { recursive: true })` para el árbol (Windows, macOS y Linux modernos).
- Un `fs.watch(.git, { recursive: false })` para lo que no toca el árbol: un commit o un cambio de
  rama mueven el índice y `HEAD`, y eso cambia el churn aunque ningún fichero se haya guardado. No se
  escucha `refs/` carpeta por carpeta: lo que mueve el mapa es `HEAD` y el índice.
- **Dos handles por repo, nunca uno por carpeta.** Si la plataforma no soporta `recursive`, se cae a
  chokidar, que sigue siendo dependencia.
- Se mantiene la lista de exclusiones (`.git`, `node_modules`, `.codarch/`, `.codarch-history/` y las
  carpetas de salida) y el agrupado de ráfagas.

### 3. Un aviso no es un cambio: decide el pulso

Entre el vigilante y el análisis hay una decisión barata (`ChangeGate`), porque avisar avisa de todo:
un `git add` que solo mueve el índice, compilar en `dist/`, guardar `.gitignore` sin cambiar el código
—o el propio `.codarch/snapshot.cc.json`— despertaban un análisis que no cambiaba nada.

- **Con git**, `git status --porcelain=v2 --branch -z --no-optional-locks` contesta en ~25 ms con lo
  que difiere de `HEAD`: modificados, altas, bajas y renombrados con sus dos rutas. Lo que git ignora
  no aparece, y el mapa tampoco lo mira. La firma es `HEAD` más `ruta + tamaño:mtime` de cada cambio:
  `git add` no la mueve y un guardado sí.
- **Sin git**, manda la versión (`tamaño:mtime`) de las rutas que trajo el aviso. Un directorio —o algo
  que no se puede leer— no se puede comparar por versión y se analiza.
- Las dos señales **suman y ninguna veta**: una carpeta que el repo padre ignora —o que vive fuera de su
  árbol versionado— no aparece en `git status` y aun así se analiza y se guarda, así que sus avisos
  también cuentan. Sin esto, abrir una carpeta ignorada dentro de un repo dejaba el mapa congelado.
- La firma se apunta **antes** de leer el disco: lo que cambie durante el análisis se ve en el pulso
  siguiente. Sin firma previa, el primer pulso analiza.
- `--no-optional-locks` no es un detalle: sin él, `git status` puede escribir el índice y despertar a
  nuestro propio vigilante.

La decisión vive en la **sesión** de la raíz (`AnalysisSession`), junto a la caché de parseo y la del
churn, en el proceso que analiza. El proceso principal solo escribe el snapshot cuando llega uno nuevo
con otro checksum, y lo manda al renderer por el mismo canal de siempre.

El renderer tampoco vuelve a guardar lo que acaba de mandar el proceso principal: al abrir o refrescar,
el snapshot que llega ya está en `.codarch/` y `persist-project` lo reconoce por su checksum sin
serializarlo. Antes, el hook reescribía el proyecto en cada `cc` nuevo —otro viaje de ida y vuelta con
el snapshot entero y otro `JSON.stringify` de cientos de KB en el principal— para dejar el fichero como
ya estaba.

### 4. El snapshot se sigue enviando entero

El delta al renderer queda descartado con datos: aplicar un refresco en la ventana cuesta ~30 ms de
script, 13 ms de layout y 8 ms de estilo, y **cero tareas largas** (medido con el depurador de
Chromium). Mandar un parche obligaría a reimplementar en el cliente la agregación del snapshot
(attributes, lentes, aristas, migración) para ahorrar una decena de milisegundos, y abriría la puerta a
que el mapa y el fichero de `.codarch/` digan cosas distintas. El snapshot se manda entero; lo que no se
manda es un análisis nuevo cuando no hay cambios.

La escritura ya está condicionada al checksum, y ahora también al pulso: `.codarch/snapshot.cc.json`
solo se reescribe cuando git ve algo distinto en el código (o, sin git, cuando cambia la versión de un
fichero analizado). Compilar, un `git add` o guardar un fichero sin cambios no escriben nada. Con el
análisis incremental, una escritura de 431 KB cuesta menos que el análisis que la provoca, así que no
se agrupa: el estado en disco sigue a la verdad en el mismo guardado.

### 5. Nada cambia para el navegador

El análisis en el navegador (M6) analiza la carpeta que el usuario elige una vez: no hay live. La
caché es del proceso, no del protocolo, así que la web servida por `serve` gana lo mismo que el CLI.

## Consecuencias

Medido con este repo (298 ficheros analizados, 263 commits):

| Pieza | Coste |
|---|---|
| Análisis completo | 2 850 ms |
| Análisis incremental (caché al día) | **81–105 ms** |
| Recorrido y `stat` de los 298 ficheros | ~15 ms |
| `git status --porcelain=v2` | ~25 ms |
| Guardado en la app (debounce incluido) | ~450 ms |
| Pulso sin cambios | un `git status` y nada más |

- Un guardado pasa de 2 819 ms a ~100 ms de análisis; la app tarda ~450 ms porque agrupa la ráfaga
  (300 ms) antes de mirar.
- Un commit dispara además el churn (480 ms): es lo correcto, cambió el historial. Un guardado normal
  no lo paga: el churn se reutiliza por `HEAD`.
- Al abrir un repo se pinta el snapshot guardado al instante y detrás se reanaliza entero (~3 s en este
  repo): la caché vive en memoria del proceso, así que arranca fría.
- Menos handles y menos CPU en repos grandes, que es donde el live dolía.
- La caché puede quedarse con entradas de ficheros borrados; se recorta en cada análisis con la lista
  de ficheros vivos.
- El checksum no cambia: ni el incremental ni el pulso tocan el modelo.
- Abrir una foto del historial ya no la convierte en el proyecto guardado ni deja el repo sin vigilancia.

## Alternativas descartadas

- **Enviar un delta del snapshot al renderer:** reimplementa la agregación en el cliente para ahorrar
  ~10 ms; rompe la única verdad del snapshot.
- **Persistir la caché en `.codarch/`:** es derivada y volvería a ensuciar el estado del repo; además
  habría que invalidarla por versión de la app.
- **Sondear `git status` sin vigilante:** cero handles, pero un proceso de git cada segundo (con su
  CPU y su batería) y sin aviso de lo que git no ve.
- **Vigilar solo `.git`:** viviría a saltos —el mapa no cambiaría hasta el `git add`— y el live dejaría
  de serlo mientras se escribe.
- **Analizar solo los ficheros cambiados sin rehacer el grafo:** más rápido todavía, pero deja aristas
  y niveles de dependencia viejos; el grafo entero cuesta milisegundos.

## Hoja de ruta

### M36 — El live no repite el análisis

- [x] Caché de parseo por fichero con versión `tamaño:mtime` y recorte de ficheros borrados.
- [x] Churn de git cacheado por `HEAD`.
- [x] Test diferencial: incremental y completo dan el mismo `cc.json` y el mismo checksum.
- [x] Vigilancia con dos handles por repo: el árbol recursivo y `.git`; chokidar de reserva.
- [x] El pulso decide: `git status` con git y versiones sin git; un aviso no analiza por sí solo.
- [x] Medido en la app real: guardado ~450 ms (era 2,8 s), alta con churn ~3 s en frío.
- [ ] Decidir si la caché se comparte entre el análisis del escritorio y `serve` (hoy cada proceso
  tiene la suya).
- [ ] El churn al añadir o borrar un fichero rehace `git log` entero (480 ms); medir si compensa pedir
  solo los caminos nuevos.
- [ ] Repaso del vigilante cuando el sistema pierda avisos (desbordes de Windows): hoy no hay red de
  seguridad además del evento.

El registro de lo hecho vive en el [feed de la guía](/guia/).
