---
title: El escritorio analiza sin congelarse
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué es**: que abrir, arrancar o reanalizar un repositorio en la app de escritorio deje de parar la
app entera. Antes, mientras analizaba, la ventana no atendía ni los clics: se medían acuses de clic de
0,4 a 3,4 segundos al arrancar y de hasta 5 segundos al guardar un fichero.

**Por qué**: `analyzeRepository` corría **síncrono en el proceso principal** de Electron
(`codarch:analyze`, `refreshFromDisk` y `openTarget`). Ese proceso es el navegador de Chromium: no solo
hace IPC, menú y diálogos, también despacha el input, así que un análisis de 4–8 segundos congelaba la
app otros tantos. La web no lo sufría porque analiza en un **Worker** (`apps/web/src/analysis/client.ts`).
Medido en este repositorio (297 ficheros): 8,1 s de análisis con la app sin responder, 130–350 ms de
retraso por clic y rachas de más de 500 ms sin entregar eventos. Con el análisis fuera del hilo: el
proceso principal gasta 125–203 ms de CPU en todo el arranque, su peor parada baja a 23–28 ms y los
clics se acusan en 1 ms (mediana). El mapa tarda lo mismo: el análisis no se acelera, solo deja de
estorbar.

**Qué cambió**:

- `analyze-worker.ts`: el análisis vive en un `utilityProcess`, con su propio bundle
  (`dist/analyze-worker.cjs`) y un protocolo mínimo (`analyze-protocol.ts`).
- `analyzer.ts` y `pending-analyses.ts`: un cliente que arranca el proceso la primera vez, corre **un
  análisis a la vez** y agrupa por raíz. Si el vigilante avisa cinco veces durante una ráfaga de
  guardados, se hace **una repetición** y no cinco análisis: la repetición ya ve el disco de después.
- `main.ts`: los tres caminos pasan a `async` (`codarch:analyze`, `refreshFromDisk` y `openTarget`) y
  el proceso auxiliar se cierra en `before-quit`. El snapshot se sigue escribiendo en el principal.
- `build-main.mjs`: tercera entrada de esbuild, compartiendo externals y versión.

**Cómo se encontró**: se midió la app real con el depurador de Chromium (acuses de clic con
`Input.dispatchMouseEvent`, tareas largas del renderer y paradas del hilo principal con un muestreador
de `setInterval` en el inspector de Node), y se comparó con la web. Se descartaron la GPU —ANGLE/D3D11
con la RTX, ya en uso—, el tamaño del bundle (367 KB, el mismo que la web), el CSS y el renderer en
reposo, que ya iba a 8 ms por fotograma.

**Queda abierto**: el refresco `live` no llegó a dispararse en algunas pruebas aunque la cabecera dice
`live`; en el proceso principal empaquetado no aparece ningún `FSWatcher` activo. `watchRepository`
funciona en Node con el mismo repositorio, así que el siguiente sospechoso es `chokidar` dentro del
bundle del proceso principal.

**Veredicto**: arreglo de rendimiento; no necesita ADR.
