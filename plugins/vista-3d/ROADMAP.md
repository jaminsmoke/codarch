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
   1.200 primitivas ✓: una carpeta solo se abre si caben ella y **todos** sus hijos ✓, así que no se
   abre a medias ni deja agujeros ✓.

Como el mapa es 2D (x, z) con la altura encima ✓, es un **quadtree** ✓, no un octree ✓ (la versión
anterior de esta hoja lo llamaba octree ✓).

Lo demás que llegó con esto ✅:

- **Pulsar una carpeta plegada la enfoca** ✓: la app se queda con esa carpeta ✓ y la ciudad se abre ✓.
- **Seleccionar no remonta la escena** ✓: el foco se mueve sin volver a crear el dispositivo de GPU ✓.
- **Un material por color** ✓, no por caja ✓ (1.200 materiales serían 1.200 pipelines ✓).
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
- **Instancing** ✓: hoy son mallas separadas ✓ (1.200 como mucho ✓). Una `InstancedMesh` por color ✓
  bajaría las draw calls a decenas ✓ y dejaría subir el presupuesto ✓.
- **El encuadre al abrir**: la cámara arranca cerca ✓ y enseña una esquina del mapa ✓. Con el LOD ya
  se puede enseñar la ciudad entera ✓ sin que cueste primitivas ✓; falta decidirlo como apertura ✓.

## Decisiones ya tomadas

- **Empezar por el `RenderModel` tal cual** ✓ y migrar después ✓. El plugin aísla el trabajo ✓: si
  el modelo 3D acaba siendo otro ✓, solo cambia este plugin ✓.
- **La GPU manda** ✓: todo lo que se pueda, en la GPU ✓. El plugin pide **GPU** ✓
  (`requires: { gpu: true }` ✓) y la tienda dice con qué va a dibujar aquí ✓ (`WebGPU` o `WebGL2` ✓).
- **WebGPU primero, WebGL2 de suelo** ✓ (2026-10-24 ✓). Se dibuja con `three/webgpu` ✓: va por el
  driver de la tarjeta ✓ (D3D12 ✓, Vulkan ✓, Metal ✓), pide la GPU dedicada ✓ y three cae solo a
  WebGL2 cuando no hay WebGPU ✓, así que hay **una sola ruta de código** ✓. Cuesta ~164 KB más en el
  chunk del plugin ✓ (506 → 670 KB ✓), que se descarga solo al abrir la vista ✓.
- **La cámara es del plugin** ✓ (`orbit.ts` ✓). `OrbitControls` importa el build de WebGL de three ✓
  y, con los dos builds, el chunk llevaba three **dos veces** ✓ (836 KB ✓). La nuestra añade pinza en
  táctil ✓ y no selecciona al arrastrar ✓.
- **El LOD vive en el plugin** ✓ (2026-10-24 ✓). Calcularlo en el motor lo facturaría mejor ✓, pero
  el motor no sabe de volúmenes 3D ✓ y esto es una vista ✓: 400 líneas puras y probadas ✓ pesan
  menos que un concepto nuevo en el motor ✓. Si otro plugin necesita lo mismo ✓, se sube entonces ✓.
- **CUDA no está al alcance** ✓ (2026-10-24 ✓). Un plugin corre en el renderer ✓, sin APIs nativas de
  GPU ✓: el equivalente moderno es WebGPU ✓ (compute en WGSL ✓) y el driver ya manda en la RTX ✓.
  Un backend CUDA u OptiX pediría un proceso nativo en el escritorio ✓, su empaquetado por plataforma
  ✓ y tocar el núcleo ✓: fuera de un plugin ✓. Si algún día entra ✓, entra por un ADR ✓.
- **No toca el snapshot** ✓: la vista 3D es una **vista** ✓, no una lente ✓. El análisis no depende
  de que esté activa ✓.
