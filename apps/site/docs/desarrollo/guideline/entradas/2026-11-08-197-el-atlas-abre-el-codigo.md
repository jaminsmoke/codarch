---
title: "El Atlas abre el código de una hoja"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: al pulsar una hoja, el Atlas solo seleccionaba el fichero en la app. No había forma de
leer su código sin salir del viaje.

**Qué cambia**: el [ADR 0116](/desarrollo/adr/0111-0120/0116-el-visor-de-fichero/) añade `readCode` al
contexto del plugin y un panel de solo lectura dentro del Atlas.

- La hoja abre un panel lateral con la ruta, las líneas numeradas y el total.
- El panel se cierra con su botón o al cambiar de sala/mapa.
- El código sale del mismo lector que la ficha; el plugin no toca el disco ni guarda una segunda copia.
- No hay edición ni escritura: es un visor.

**Por qué así**: leer el código no debe cambiar el checksum ni abrir otra fuente de verdad. El editor
completo, con escritura, es otra decisión.

**Verificado**: el contrato nuevo pasa tipos y tests; el panel se abre al pulsar una hoja; la suite y el
build web pasan.

**Qué falta**: el editor completo, si se decide, y el pulido de la hoja seleccionada.

**Tamaño**: `readCode` en `@codarch/plugin-api`, el puente de la app y el panel del Atlas.

**Veredicto**: hecho.
