---
title: Lo que fallaba en silencio
date: "2026-10-25"
category: fix
verdict: arreglo
---

**Qué era**: la app se callaba justo cuando había que explicarse. Elegías la carpeta en el diálogo, dabas a Abrir y no pasaba nada: el menú abría el diálogo y tiraba lo elegido, y si la ruta no existía, era la carpeta del sistema o el análisis se caía, la ventana se quedaba como estaba. En la CLI, `analyze` con una ruta mal escrita creaba la carpeta con un `mkdir` recursivo y dejaba un snapshot vacío dentro; `serve` arrancaba sobre una ruta que no existe y servía el vacío; `history` decía «no hay fotos» de una carpeta que no está; `inspect` contestaba con un `EISDIR` a una carpeta y enseñaba `commit —` porque el snapshot no guardaba el commit; y un repo de Python daba un mapa en blanco sin decir que el mapa solo dibuja TS/JS. Con Node 20, `npm i -g codarch` fallaba al compilar `tree-sitter` y dejaba el comando roto con un error nativo.

**Qué cambió**: el escritorio abre lo que se elige —menú, Ctrl+O, «Abrir con» y arrastrar pasan por el mismo `openTarget`—, el título de la ventana dice el proyecto (`CodArch · <carpeta>`), el menú está en español con sus mnemónicos (`Alt+A` abre Archivo, «Salir» en vez de «Quit») y, cuando algo no se puede abrir, sale un aviso con el motivo en vez del silencio. El diálogo reintenta una vez sin ventana padre: hay portales de Linux que lo devuelven cerrado y vacío. En la CLI, los cinco comandos comprueban la ruta antes de tocar nada y contestan con el motivo y código 1; `inspect` nombra lo que espera cuando le pasas una carpeta; `diff` que no llega a comparar no escribe `report.json`; el snapshot lleva `meta.commitHash` para que `inspect` diga en qué commit se hizo. El binario publicado (`bin.js`) mira la versión de Node antes de importar nada, así que con Node 20 se lee qué falta en vez de un error de compilación.

**Números**: cinco comandos con la misma comprobación de ruta (un `directoryProblem`/`fileProblem` en `io.ts`). `meta.commitHash` es opcional y vive fuera del checksum, que depende del código y las lentes: los snapshots de antes valen igual. El tag `v1` se queda: no es una release, es la referencia que usa la acción (`@v1`); el feed ya resuelve la última release por sí mismo, así que no hay nada que borrar del registro.

**Veredicto**: arreglo, hecho. Queda abierto que instalar con Node 20 falle igualmente al compilar `tree-sitter`: ahora se dice antes, pero el arreglo de verdad es Node 22 y el `engines` ya lo pide.
