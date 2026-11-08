---
title: "El Atlas se mira de frente"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: el primer Atlas era un plano aéreo con rejilla. Los contenedores flotaban sobre el suelo y
la cámara miraba desde arriba; no era el atlas que se buscaba.

**Qué cambia**: el [ADR 0115](/desarrollo/adr/0111-0120/0115-el-atlas-frontal/) rehace la geometría y
la cámara.

- La vista general son **contenedores de carpeta en el suelo** y **hojas de fichero en estanterías**.
- Al entrar en una carpeta, sus **subcarpetas siguen siendo contenedores** y sus ficheros van a las
  estanterías de la sala.
- La cámara es frontal, con límites que impiden volver al plano cenital.
- El suelo se funde con el fondo y solo deja la rejilla.
- El breadcrumb y el botón Volver siguen funcionando.
- Funciona en los dos mapas.

**Por qué así**: una carpeta nunca se convierte en estantería. El contenedor conserva la misma lectura
en la vista general y dentro de otra carpeta; las hojas son siempre el contenido.

**Verificado**: en Chrome, la vista general dibuja 4 contenedores y 3 hojas; `packages/ui` abre su sala
con 2 contenedores y 0 hojas. Sin errores de consola y con WebGL2.

**Qué falta**: la transición animada tipo Google Earth, las etiquetas y el visor de fichero.

**Tamaño**: `room.ts` y `scene.ts` del plugin, la cámara frontal y la prueba de la geometría.

**Veredicto**: hecho.
