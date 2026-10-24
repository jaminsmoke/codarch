---
title: La vista 3D dibuja en una sola llamada
date: "2026-10-24"
category: optimized
verdict: arreglo
---

**Qué es**: que las cajas del 3D sean **una sola malla instanciada** (`InstancedMesh`) con su color por
instancia, en vez de una malla por caja. Miles de cajas pasan a ser **una draw call** y el presupuesto
del nivel de detalle sube de 1.200 a 4.000.

**Por qué**: el nivel de detalle ya acotaba cuántas cajas hay, pero cada una era su propia malla con su
propio material. A más presupuesto, más draw calls y más objetos que crear y tirar cada vez que la
cámara cruza un umbral.

**Qué cambió**:

- Una `InstancedMesh` con capacidad para el presupuesto: cada caja es una matriz y un color. Al
  cambiar el nivel de detalle solo se reescriben matrices, y al seleccionar, solo colores.
- El color del mapa va por instancia (`instanceColor`), así que el degradado continuo de la lente se
  respeta tal cual.
- La selección se tiñe del azul de la app en la propia instancia: con instancing no hay un material por
  caja donde poner el `emissive`.
- El clic usa `instanceId` de la intersección y mira su caja: seleccionar un fichero y enfocar una
  carpeta plegada siguen funcionando.
- El techo sube a 4.000 porque el coste por caja ya no es una draw call; el que manda es la CPU al
  recalcular el nivel de detalle, que va cada 120 ms y solo cuando la cámara se ha movido.

**Verificado**: con este repo, 314 cajas en pantalla, 227 al alejarse (las carpetas se pliegan) y 319
al acercarse, a 120 fps con WebGPU y sin errores de consola. Clics en tres puntos seleccionan tres
ficheros distintos (`useCodarchApp.tsx`, `apps/mcp/src/tools.ts`, `packages/schema/src/parse2.ts`), y con
el presupuesto bajado a 3 en una prueba el clic deja `Todo / apps` y `Todo / packages`, o sea que el
`instanceId` también llega bien a las carpetas.

**Veredicto**: arreglo del plugin (M15), dentro de su v0.02.
