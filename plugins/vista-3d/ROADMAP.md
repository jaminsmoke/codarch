# Vista 3D · su propia hoja de ruta

Este plugin tiene su propio ritmo ✓, separado del de CodArch ✓. Lo que sigue es lo que **todavía
no** está hecho, en orden ✓.

## v0.01 — Lo que había ✅

- Usa el `RenderModel` tal cual ✓: la misma distribución 2D del treemap ✓.
- Cada fichero es una caja ✓: la base es su rectángulo ✓ y la altura es su riesgo ✓.
- El color es el del mapa ✓ (el mismo criterio ✓, el de la app ✓).
- Orbitar y zoom con el ratón ✓; pulsar una caja selecciona el fichero ✓.

**Lo bueno**: cero cambios en el motor ✓, cero cambios en el snapshot ✓, y el plugin no se mezcla
con el código de las apps ✓.

**Lo malo**: una caja por fichero ✓ → un repo de 20.000 ficheros son 20.000 cajas ✗.

## v0.02 — El nivel de detalle ✅

El problema del volumen ✓ tenía dos caras ✓, y las dos están resueltas en **el plugin** ✓, sin tocar
el motor ✓ ni el snapshot ✓:

1. **Demasiadas cajas.** El árbol de volúmenes ✓ (`volumes.ts` ✓) hace de cada carpeta una caja que
   contiene a sus hijos ✓. Plegada es **una** primitiva ✓; abierta, su suelo y sus hijos ✓.
2. **La cámara dentro de la ciudad.** El LOD es **por pantalla** ✓: una carpeta se abre cuando mide
   más de ~22 px ✓ (de cerca ✓ o por ser grande ✓) y se cierra cuando no ✓. Hay un presupuesto de
   4.000 primitivas ✓: una carpeta solo se abre si caben ella y **todos** sus hijos ✓, así que no se
   abre a medias ni deja agujeros ✓.

Como el mapa es 2D (x, z) con la altura encima ✓, es un **quadtree** ✓, no un octree ✓ (la versión
anterior de esta hoja lo llamaba octree ✓).

Lo demás que llegó con esto ✅:

- **Pulsar una carpeta plegada la enfoca** ✓: la app se queda con esa carpeta ✓ y la ciudad se abre ✓.
- **Seleccionar no remonta la escena** ✓: el foco se mueve sin volver a crear el dispositivo de GPU ✓.
- **Una sola malla instanciada** ✓ con color por instancia ✓: miles de cajas son una draw call ✓.
  Seleccionar solo reescribe colores ✓ y cambiar de LOD, matrices ✓.
- **La cámara abre encuadrando el mapa entero** ✓: la distancia sale del radio del mapa y del campo
  de visión ✓ (`fitDistance` ✓), orbita alrededor del centro del mapa ✓ y la niebla se escala con
  él ✓.
- El aviso dice **cuántas cajas** hay en pantalla ✓ y con qué runtime ✓.

## v0.03 — Elegir bien

- **La altura** dice el riesgo ✓. Pero quizá la altura debería ser la **complejidad** ✓ (qué tan
  enrevesado es el código ✓), que es lo que más duele ✓. Se puede cambiar por una opción ✓.
- **Los colores** son los del mapa ✓. En 3D, el color por **altura** y el color por **riesgo** se
  pelean ✓. Quizá un color por altura ✓ y el riesgo en otro canal ✓.

## v0.04 — Lo que le falta de verdad

- **Las etiquetas**: con 200 cajas no se sabe qué es qué ✓. Un rótulo al pasar el ratón ✓ (o al
  seleccionado ✓) — y en una carpeta plegada, su nombre ✓.
- **Comparar dos momentos**: el 3D con la línea del tiempo (M12 ✓) sería **muy** speak: ver cómo
  crece la ciudad ✓.
- **La selección, con brillo**: hoy se tiñe el color de la instancia ✓ (con instancing no hay material
  por caja ✓). Un contorno o un brillo exigiría una segunda malla para lo elegido ✓.

## Decisiones ya tomadas

- **Empezar por el `RenderModel` tal cual** ✓ y migrar después ✓. El plugin aísla el trabajo ✓: si
  el modelo 3D acaba siendo otro ✓, solo cambia este plugin ✓.
- **La GPU manda** ✓: todo lo que se pueda, en la GPU ✓. El plugin pide **WebGL2** ✓
  (`requires: { webgl2: true }` ✓).
- **WebGL2 propio, sin three** ✓ (2026-10-24 ✓, ADR 0055 ✓). La vista se dibuja con WebGL2 a pelo ✓:
  un cubo instanciado ✓ (`drawArraysInstanced` ✓) y dos shaders ✓. Se probó antes con
  `three/webgpu` ✓, y el runtime costaba más que el dibujo ✓. Medido en la RTX del desarrollo ✓:
  4.000 cajas a 1280×800 → 3,1 ms por fotograma ✓; a 2560×1600 → 8,5 ms ✓ (la medida incluye leer
  un píxel, que fuerza a esperar a la GPU ✓). El chunk del plugin baja de 2,2 MB a 15 KB ✓.
- **La cámara es del plugin** ✓ (`orbit.ts` ✓): matemática pura ✓, sin cámara de librería ✓. Añade
  pinza en táctil ✓ y no selecciona al arrastrar ✓.
- **Instancing antes que más detalle** ✓ (2026-10-24 ✓). El presupuesto subió de 1.200 a 4.000 al
  pasar a una sola llamada instanciada ✓; el color por instancia respeta el degradado de las lentes ✓
  y la selección va en el color ✓.
- **El encuadre se calcula, no se fija** ✓ (2026-10-24 ✓). La distancia de apertura sale del radio
  del mapa y del campo de visión ✓: con otro tamaño de mapa o de pantalla sigue cabiendo ✓. Los
  límites de zoom y la niebla van con esa misma distancia ✓.
- **El LOD vive en el plugin** ✓ (2026-10-24 ✓). Calcularlo en el motor lo facturaría mejor ✓, pero
  el motor no sabe de volúmenes 3D ✓ y esto es una vista ✓: 400 líneas puras y probadas ✓ pesan
  menos que un concepto nuevo en el motor ✓. Si otro plugin necesita lo mismo ✓, se sube entonces ✓.
- **CUDA no está al alcance** ✓ (2026-10-24 ✓). Un plugin corre en el renderer ✓, sin APIs nativas de
  GPU ✓: el equivalente moderno es WebGPU ✓ (compute en WGSL ✓) y el driver ya manda en la RTX ✓.
  Un backend CUDA u OptiX pediría un proceso nativo en el escritorio ✓, su empaquetado por plataforma
  ✓ y tocar el núcleo ✓: fuera de un plugin ✓. Si algún día entra ✓, entra por un ADR ✓.
- **No toca el snapshot** ✓: la vista 3D es una **vista** ✓, no una lente ✓. El análisis no depende
  de que esté activa ✓.
