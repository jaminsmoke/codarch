---
title: "El proyecto también es una sala"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: el primer nivel se dibujaba como un overview plano, distinto de las salas. El proyecto no
tenía paredes, techo ni viga, y su cámara encuadraba de otra manera.

**Qué cambia**:

- El proyecto pasa a ser la primera sala; los contenedores de primer nivel son sus archivadores.
- Todas las escalas comparten suelo, paredes, techo, rodapiés, paneles y tira de luz.
- El frente sigue abierto, con una viga que lo cruza arriba.
- La viga lleva el letrero de la sala: `Proyecto` en la raíz y el nombre de la carpeta en el resto.
- El encuadre incluye la viga y el letrero también en salas altas.
- Se retira el caso especial `overview` de `buildRoom`.

**Por qué así**: una sola geometría evita que el primer nivel sea una excepción y hace que entrar en
una carpeta sea el mismo gesto en cualquier profundidad. La viga da nombre y escala sin cerrar el
frente ni tapar las estanterías.

**Verificado**: en Chrome, la raíz, `scripts` y `packages/ui/src` se ven como salas con su viga y su
letrero; los contenedores y las hojas mantienen la lectura; sin errores de consola.

**Qué falta**: el pulido de distribución, luces y LOD. La puerta animada de entrada, al estilo de
Resident Evil, queda para más adelante.

**Tamaño**: `room.ts`, `scene.ts`, las pruebas del Atlas y la documentación del plugin.

**Veredicto**: hecho.
