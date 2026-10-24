# Vista 3D · su propia hoja de ruta

Este plugin tiene su propio ritmo ✓, separado del de CodArch ✓. Lo que sigue es lo que **todavía
no** está hecho, en orden ✓.

## v0.01 — Lo que hay ahora

- Usa el `RenderModel` tal cual ✓: la misma distribución 2D del treemap ✓.
- Cada fichero es una caja ✓: la base es su rectángulo ✓ y la altura es su riesgo ✓.
- El color es el del mapa ✓ (el mismo criterio ✓, el de la app ✓).
- Orbitar y zoom con el ratón ✓; pulsar una caja selecciona el fichero ✓.

**Lo bueno**: cero cambios en el motor ✓, cero cambios en el snapshot ✓, y el plugin no se mezcla
con el código de las apps ✓.

**Lo malo**: una caja por fichero ✓ → un repo de 20.000 ficheros son 20.000 cajas ✗.

## v0.02 — El nivel de detalle

El problema del volumen ✓ tiene dos caras ✓:

1. **Demasiadas cajas.** Con un octree ✓ (una caja por carpeta ✓, sus hijos dentro ✓) el número de
   primitivas baja a miles ✓ en vez de miles de miles ✓.
2. **La cámara dentro de la ciudad.** Cuando te acercas ✓, el octree se abre ✓ (más detalle ✓); cuando
   te alejas ✓, se cierra ✓. Eso es un LOD ✓.

El octree se puede calcular **en el plugin** ✓ (a partir del `RenderModel` ✓) o en el motor ✓. La
primera opción no toca el motor ✓; la segunda factura mejor ✓ (el motor ya sabe podar ✓, ADR 0019 ✓).
**Pendiente de decidir** ✓.

## v0.03 — Elegir bien

- **La altura** dice el riesgo ✓. Pero quizá la altura debería ser la **complejidad** ✓ (qué tan
  enrevesado es el código ✓), que es lo que más duele ✓. Se puede cambiar por una opción ✓.
- **Los colores** son los del mapa ✓. En 3D, el color por **altura** y el color por **riesgo** se
  pelean ✓. Quizá un color por altura ✓ y el riesgo en otro canal ✓.

## v0.04 — Lo que le falta de verdad

- **Las carpetas** no se ven ✓ (solo los ficheros ✓). En 3D, las carpetas son los **contenedores** ✓
  (una caja que contiene a sus hijos ✓) — y eso es justo lo que el octree daría ✓.
- **Las etiquetas**: con 200 cajas no se sabe qué es qué ✓. Un rótulo al pasar el ratón ✓ (o al
  selected ✓).
- **Comparar dos momentos**: el 3D con la línea del tiempo (M12 ✓) sería **muy** speak: ver cómo
  crece la ciudad ✓.

## Decisiones ya tomadas

- **Empezar por el `RenderModel` tal cual** ✓ y migrar después ✓. El plugin aísla el trabajo ✓: si
  el modelo 3D acaba siendo otro ✓, solo cambia este plugin ✓.
- **La GPU manda** ✓: todo lo que se pueda, en la GPU ✓. El plugin declara sus requisitos ✓
  (`webgl2` ✓, `gpu` ✓) y la app avisa si no se pueden cumplir ✓.
- **WebGPU primero, WebGL2 de suelo** ✓ (2026-10-24 ✓). Se dibuja con `three/webgpu` ✓: va por el
  driver de la tarjeta ✓ (D3D12 ✓, Vulkan ✓, Metal ✓), pide la GPU dedicada ✓ y three cae solo a
  WebGL2 cuando no hay WebGPU ✓, así que hay **una sola ruta de código** ✓. Cuesta ~164 KB más en el
  chunk del plugin ✓ (506 → 670 KB ✓), que se descarga solo al abrir la vista ✓.
- **La cámara es del plugin** ✓ (`orbit.ts` ✓). `OrbitControls` importa el build de WebGL de three ✓
  y, con los dos builds, el chunk llevaba three **dos veces** ✓ (836 KB ✓). La nuestra añade pinza en
  táctil ✓ y no selecciona al arrastrar ✓.
- **CUDA no está al alcance** ✓ (2026-10-24 ✓). Un plugin corre en el renderer ✓, sin APIs nativas de
  GPU ✓: el equivalente moderno es WebGPU ✓ (compute en WGSL ✓) y el driver ya manda en la RTX ✓.
  Un backend CUDA u OptiX pediría un proceso nativo en el escritorio ✓, su empaquetado por plataforma
  ✓ y tocar el núcleo ✓: fuera de un plugin ✓. Si algún día entra ✓, entra por un ADR ✓.
- **No toca el snapshot** ✓: la vista 3D es una **vista** ✓, no una lente ✓. El análisis no depende
  de que esté activa ✓.
