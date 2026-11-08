---
title: "ADR 0115 — El Atlas se mira de frente: contenedores y salas"
description: "El Atlas deja de ser un plano aéreo con rejilla. La vista general son contenedores 3D con hojas en estanterías; al entrar en una carpeta, las subcarpetas siguen siendo contenedores sobre el plano y los ficheros van a las estanterías de la sala."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: El Atlas frontal
  order: 115
---

**Estado:** aceptado · **Fecha:** 2026-11-08

**Rehace** la metáfora del [ADR 0113](0113-el-atlas-es-un-plugin.md): el Atlas no es un mapa
aéreo, es un zoom jerárquico de frente. El [ADR 0114](0114-el-atlas-sustituye-a-la-vista-3d.md)
ya retiró la vista de barras.

## Contexto

El primer corte del Atlas puso el mapa en un plano con una rejilla y una cámara alta. Funciona como
prototipo, pero no es lo que se busca: parece un mapa cenital de cajas, no un atlas que se recorre.

La referencia es otra:

- una vista general de contenedores 3D, con los ficheros como hojas dentro de su espacio;
- al entrar en una carpeta, una sala de frente, con estanterías y objetos;
- al abrir un fichero, su editor o visor.

La cámara no debe mirar desde arriba. La distribución no es una ciudad ni un treemap con altura: es
una jerarquía de contenedores y salas.

## Decisión

### 1. Tres escalas, una sola vista

El Atlas tiene tres escalas dentro de la misma vista:

1. **General**: contenedores de carpeta sobre el plano y hojas de fichero en estanterías.
2. **Sala**: al entrar en una carpeta, sus subcarpetas siguen siendo contenedores sobre el plano; sus
   ficheros van a las estanterías de la sala.
3. **Fichero**: al seleccionar una hoja, se abre su editor o visor.

No son tres pantallas separadas: es un zoom con niveles de detalle. El fichero se deja para una fase
posterior porque necesita decidir si el visor vive dentro del plugin o delega en el editor de la app.

### 2. El contenedor nunca se convierte en estantería

La regla que evita dos lenguajes:

- **Carpeta = contenedor 3D**, en la vista general y dentro de otra carpeta.
- **Fichero = hoja**, en una estantería.
- Si una carpeta contiene carpetas y ficheros, se ven las dos cosas: contenedores en el suelo y hojas
  en las estanterías.
- Al entrar en una subcarpeta se repite la regla.

Una carpeta nunca se dibuja como una fila de estantería. La estantería es solo para las hojas.

### 3. Cámara frontal

La cámara mira la escena de frente, a una altura de recorrido, no desde arriba. La vista general puede
tener una ligera inclinación para leer los contenedores, pero el eje no es cenital.

- Se puede orbitar y acercar, pero con límites que impiden volver al plano aéreo.
- Entrar en una carpeta cambia la escena a su sala.
- La transición animada tipo Google Earth llega después; primero la geometría y el frente.

### 4. La sala se genera por carpeta

La sala de una carpeta se construye con sus hijos:

- contenedores en el suelo, en una rejilla legible;
- hojas en estanterías laterales y de fondo, por filas;
- suelo y estanterías como mobiliario, no como datos;
- las hojas conservan el color del mapa.

No se guarda una segunda lectura del modelo: se deriva del `RenderModel` y del foco actual.

### 5. Todos los mapas y ningún checksum nuevo

El Atlas frontal funciona con el mapa de código y el de documentos y configuración. No añade lentes,
no escribe en `.codarch/` y no cambia el checksum.

### 6. El fichero, después

El visor de fichero necesita una pieza más: abrir código desde el plugin o delegar en el editor de la
app. Se decide en su propia fase. Por ahora, clic en una hoja selecciona el fichero y la app sigue
mostrando su ficha.

## Consecuencias

- Se sustituyen el layout aéreo y la cámara orbital alta por una sala frontal.
- El plugin sigue siendo `atlas`; no vuelve la vista de barras.
- Las subcarpetas mantienen la misma lectura que en el mapa general: son contenedores.
- La navegación gana una escala más: general → sala → fichero.
- El primer corte puede ser visualmente más sencillo que la referencia, pero la metáfora ya es la
  correcta.

## Alternativas descartadas

- **Seguir con el plano aéreo y bajar la cámara.** Cambia el ángulo, no la distribución ni la lectura.
- **Convertir las subcarpetas en estanterías.** Rompe la continuidad con el mapa general y confunde
  contenedor con contenido.
- **Hacer tres pantallas distintas.** El Atlas es un zoom, no un menú de vistas.
- **Meter el visor de código en este mismo corte.** Añade una decisión de contrato que no hace falta
  para validar la sala.

## Hoja de ruta

Fase **M77 · El Atlas frontal** (continúa la fase del [ADR 0113](0113-el-atlas-es-un-plugin.md)).

- ✅ La decisión: frente, contenedores y salas.
- ✅ Sustituir el layout aéreo por contenedores y hojas.
- ✅ La sala de carpeta con subcarpetas en el suelo y ficheros en estanterías.
- ✅ La cámara frontal y sus límites.
- ⬜ La transición animada de entrada y salida.
- ⬜ Etiquetas por nivel.
- ⬜ El visor de fichero.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
