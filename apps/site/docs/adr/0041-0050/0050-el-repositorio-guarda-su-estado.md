---
title: ADR 0050 — El repositorio guarda su estado
description: "`.codarch.yml` configura, `.codarch/` guarda el estado local y `.codarch-history/` la línea del tiempo. Quien crea el estado lo ignora en git, y el análisis se ancla en la carpeta analizada."
section: adr
status: aceptado
date: "2026-10-24"
sidebar:
  label: El repositorio guarda su estado
  order: 50
---

**Estado:** aceptado · **Fecha:** 2026-10-24

## Contexto

Desde M32 el proyecto analizado vive en el repositorio, no en la app: el escritorio escribe
`.codarch/snapshot.cc.json` y `.codarch/report.json`, y al arrancar restaura de ahí. Eso dejó tres
sitios con papeles distintos, pero solo uno estaba escrito:

- `.codarch.yml`, en la raíz: alcance, reglas, addons y perfil de dominio. Es configuración y se
  versiona.
- `.codarch/`: snapshot, reporte y mapa. Es estado derivado y no se versiona.
- `.codarch-history/`: la línea del tiempo. Se versiona **a propósito**, porque es lo que un equipo
  comparte (ADR 0024).

El repaso dejó cuatro huecos:

1. El escritorio añadía `.codarch/` al `.gitignore` del repo, pero el CLI (`codarch analyze`) no:
   analizar desde la terminal dejaba el estado como ficheros sin seguimiento.
2. El escritorio lo añadía en **cada** guardado, así que quitar la línea del `.gitignore` no servía
   de nada: volvía en el siguiente análisis.
3. Analizar una subcarpeta (`repo/src`) crea su propio `.codarch/` y no había regla escrita sobre
   si debía heredar el del repo.
4. `codarch serve --watch` reanaliza en memoria, pero el escritorio no vigila nada: su mapa se
   queda viejo hasta que se vuelve a analizar a mano.

Lo único que la app guarda fuera del repo es lo de la máquina: la última raíz analizada y las
preferencias de vista.

## Decisión

### 1. Tres sitios, tres papeles

- **`.codarch.yml`** (raíz, versionado): la configuración declarativa. Viaja con el repo y la lee
  también el CI.
- **`.codarch/`** (ignorado): el estado derivado del análisis. Se puede borrar sin miedo; se
  reconstruye.
- **`.codarch-history/`** (versionado): la línea del tiempo. No se mete dentro de `.codarch/`
  porque entonces dejaría de compartirse.

### 2. Quien crea el estado lo ignora en git

El CLI y el escritorio añaden `.codarch/` al `.gitignore` del repositorio **solo cuando el
directorio nace**, sin tocar el resto del fichero y sin repetir la entrada si ya está (`.codarch/`
o `.codarch` valen igual). Si el usuario quita la línea para versionar el estado, no vuelve.

Un `--out` distinto de `.codarch/` no toca el `.gitignore`. `serve` no escribe nada: analiza en
memoria y sirve.

### 3. El estado se ancla en la carpeta analizada

Analizar `repo/src` escribe `repo/src/.codarch/`, aunque `repo/.codarch/` ya exista. Un snapshot de
`src/` no es el del repo y no puede pisarlo. La app enseña qué raíz está viendo.

Buscar el `.codarch/` más cercano hacia arriba queda descartado por ahora: es más limpio, pero
convierte un análisis parcial en una escritura sobre el estado del repo entero. Si molesta la
duplicación, se resuelve con una acción explícita («analizar el repo desde su raíz»), no en
silencio.

### 4. Global, lo mínimo

En la máquina quedan solo la última raíz y las preferencias de vista; el proyecto, su configuración
y su estado viven en el repo. Abrir otro repositorio no hereda nada del anterior.

### 5. A tiempo real

El escritorio vigilará la raíz analizada como hace `serve --watch`: reanaliza con retardo, reescribe
`.codarch/` y refresca el mapa. Al abrir un repo que ya tiene estado, enseña lo guardado al instante
y refresca después, sin esperar al análisis.

## Consecuencias

- Analizar desde el CLI o desde el escritorio deja el repo limpio en git sin que el usuario toque
  nada.
- El estado se puede borrar y regenerar; no es una copia de seguridad.
- Analizar subcarpetas no rompe el estado del repo, pero puede duplicarlo; el mapa dice qué raíz se
  está viendo.
- Vigilar consume CPU y disco: el retardo, el respeto a `.gitignore` y el nivel de detalle lo
  acotan.
- El historial sigue siendo lo único que un equipo comparte por git; el resto es de cada máquina.

## Alternativas descartadas

- **Reutilizar el `.codarch/` del ancestro:** más limpio, pero un análisis de `src/` sobrescribiría
  el snapshot del repo. Se puede ofrecer como acción explícita más adelante.
- **Meter el historial en `.codarch/`:** se perdería justo lo que se quiere compartir.
- **Guardar el estado en el directorio de instalación:** un proyecto por máquina y la web no lo
  vería; es lo que arregló M32.
- **Ignorar en cada análisis:** impediría versionar el estado si alguien lo quiere.
- **Escribir `.codarch/` desde `serve`:** sirve para mirar; escribir convertiría un servidor de
  solo lectura en otro dueño del estado.

## Hoja de ruta

### M34 — El estado vive en el repositorio

- [x] El escritorio escribe `.codarch/` en el repo y lo ignora al crearlo (M32).
- [x] El CLI `analyze` ignora `.codarch/` cuando lo crea; `--out` no toca el `.gitignore`.
- [x] La cabecera dice si el repo se vigila: `live`, `live en pausa` o `sin vigilancia`.
- [ ] Al abrir un repo con `.codarch/`, enseñar lo guardado al instante y refrescar en segundo plano.
- [ ] Vigilar la raíz en el escritorio y reanalizar con retardo: el mapa cambia con el repo.
- [ ] Probar la regla de anclaje con subcarpetas y decir en la app qué raíz se está viendo.

El registro de lo hecho vive en el [feed de la guía](/guia/).
