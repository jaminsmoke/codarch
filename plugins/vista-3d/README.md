# Vista 3D

Un plugin ✓: el mapa en tres dimensiones ✓.

Cada fichero es una caja ✓: la base es su rectángulo del treemap ✓ (la misma distribución 2D ✓) y la
altura dice cuánto pesa ✓ (el riesgo ✓). El color es el del mapa ✓, para que las dos vistas digan
lo mismo ✓.

- **Orbita** con el ratón ✓, **zoom** con la rueda ✓ y **pinza** con dos dedos ✓.
- **Pulsa una caja** para seleccionar el fichero ✓ (un arrastre no selecciona ✓).
- Dibuja con **WebGPU** ✓ si la máquina lo tiene ✓ y cae a **WebGL2** ✓ si no ✓; el aviso de la
  escena dice con cuál está corriendo ✓.
- Necesita **GPU** ✓; el suelo es **WebGL2** ✓ (el store lo comprueba y no deja activarlo si falta ✓).

La GPU va por WebGPU ✓ (`three/webgpu` ✓): el driver elige la tarjeta ✓ (D3D12 en Windows ✓, Vulkan ✓,
Metal ✓) y `powerPreference` pide la dedicada ✓. La cámara es **propia del plugin** ✓ (`orbit.ts` ✓):
`OrbitControls` importa el build de WebGL de three ✓ y con los dos el chunk llevaría three dos veces ✓.

No toca el snapshot ✓ ni el motor ✓: es una **vista** ✓, no una lente ✓. El análisis no depende de
que esté activa ✓.

Su propia hoja de ruta (el octree, el nivel de detalle, las carpetas como contenedores ✓) está en
[ROADMAP.md](ROADMAP.md) ✓.
