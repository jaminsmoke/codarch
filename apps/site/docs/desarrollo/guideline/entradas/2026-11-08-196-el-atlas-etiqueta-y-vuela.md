---
title: "El Atlas etiqueta y vuela"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: el Atlas ya tenía contenedores y salas, pero al entrar en una carpeta la escena cambiaba
de golpe y no había forma de saber qué caja era cada cosa.

**Qué cambia**:

- **Etiquetas** sobre contenedores y hojas, con fondo y colisión para que no se pisen. Las carpetas se
  dibujan primero; las hojas, después.
- **Vuelo de cámara** al entrar en un contenedor: la cámara se acerca y després cambia a la sala.
- **Vuelo de vuelta** desde el breadcrumb, con el botón Volver.
- La etiqueta del fichero seleccionado se resalta.

**Por qué así**: sin etiquetas el 3D se lee pero no se navega; sin vuelo, entrar en una carpeta es un
corte. El vuelo no es todavía un morphing continuo de la geometría, pero ya da la continuidad de
movimiento que faltaba.

**Verificado**: la vista general muestra `apps`, `packages`, `scripts`, `plugins/atlas` y las hojas de
la raíz; al hacer clic en `scripts`, la cámara vuela y aparece su sala con 16 hojas. Sin errores de
consola.

**Qué falta**: el visor de fichero al pulsar una hoja y el morphing de geometría entre escalas.

**Tamaño**: proyección de etiquetas en `camera.ts` y `scene.ts`, el canvas de etiquetas en la vista y
el vuelo en `scene.ts`.

**Veredicto**: hecho.
