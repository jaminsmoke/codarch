---
title: La vista 3D enseña el bosque
date: "2026-10-24"
category: feature
verdict: arreglo
---

**Qué es**: que la vista 3D agrupe por carpeta y abra el detalle solo cuando se ve. Una carpeta lejos
es **una** caja que resume lo que tiene dentro; al acercarte se abre y enseña a sus hijos, con su
suelo debajo.

**Por qué**: con una caja por fichero, un repo de 20.000 ficheros son 20.000 primitivas y la escena
se arrastra. Era lo apuntado como «lo malo» del plugin desde su primera versión.

**Qué cambió** (todo dentro del plugin, sin tocar el motor ni el snapshot):

- `volumes.ts`: árbol de volúmenes carpetas/ficheros a partir del `layoutMap` de siempre. La carpeta
  plegada mide lo que su hijo más alto y lleva su color; los hijos van ordenados por área, para que
  el recorte sea determinista.
- Nivel de detalle **por pantalla**, no por nivel fijo: una carpeta se abre si mide más de ~22 px en
  su posición, así que se abre al acercarse o por ser grande, y se cierra al alejarse.
- Presupuesto de 1.200 primitivas: una carpeta solo se abre si caben ella y **todos** sus hijos; si
  no, se queda plegada como una caja. Nada de abrir a medias ni de agujeros en el mapa.
- Pulsar una carpeta plegada la enfoca (`focus`): la app se queda con esa carpeta y el mapa se abre.
- Diseño de la escena: un material **por color**, no por caja, y seleccionar ya no remonta la escena
  (el foco se mueve sin recrear el dispositivo de GPU).
- El aviso dice cuántas cajas hay en pantalla.

Como el mapa es 2D (x, z) con la altura encima, esto es un **quadtree**, no un octree: así queda dicho
en la hoja de ruta del plugin, que antes lo llamaba octree.

**Verificado**: tests del árbol y del recorte (carpeta con 400 hijos y presupuesto 50 → una sola caja,
sin agujeros). En Chrome, 263 ficheros → 317 cajas (54 suelos de carpeta) a 120 fps con WebGPU; con el
presupuesto bajado a 3 en una prueba, 5 cajas y el clic en una carpeta deja `Todo / packages`.

**Lo que queda**: `InstancedMesh` por color para bajar las draw calls y subir el presupuesto, y las
etiquetas. Y decidir el encuadre de apertura: la cámara arranca cerca y enseña una esquina.

**Veredicto**: arreglo del plugin (M15), la v0.02 de su hoja de ruta.
