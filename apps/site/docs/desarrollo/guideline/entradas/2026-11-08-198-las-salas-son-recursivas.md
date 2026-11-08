---
title: "Las salas del Atlas son recursivas"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: la sala ponía las estanterías en las paredes laterales y los ficheros se veían de canto.
Además, entrar en una subcarpeta no abría su propio espacio.

**Qué cambia**: el [ADR 0117](/desarrollo/adr/0111-0120/0117-salas-recursivas-y-estanterias/) fija la
estructura definitiva.

- El **overview** solo tiene el primer nivel del repo.
- Cada carpeta abre una **sala recursiva**.
- Las subcarpetas son **archivadores**; al pulsarlas se entra en su sub-sala.
- Las estanterías están al fondo y las **hojas miran a la cámara**.
- Los archivadores van delante, para no tapar las hojas.
- El viaje de entrada y salida se mantiene.

**Por qué así**: las estanterías laterales hacían ilegible el fichero y la jerarquía se quedaba a dos
niveles. Ahora el mapa plano es solo el overview y el resto es un árbol de salas.

**Verificado**: `scripts` muestra sus 16 hojas de frente; `packages/ui/src` muestra 5 archivadores y
53 hojas; las etiquetas se leen y no hay errores de consola.

**Qué falta**: pulir paredes, luces y distribución, y añadir LOD para salas muy grandes.

**Tamaño**: `room.ts` y la disposición de las salas; el overview se mantiene.

**Actualizado**: el proyecto también pasa a ser una sala; ver la entrada 200 y el
[ADR 0118](../../adr/0111-0120/0118-el-proyecto-tambien-es-una-sala.md).

**Veredicto**: hecho.
