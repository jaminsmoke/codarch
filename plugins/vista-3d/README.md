# Vista 3D

Un plugin ✓: el mapa en tres dimensiones ✓.

Cada fichero es una caja ✓: la base es su rectángulo del treemap ✓ (la misma distribución 2D ✓) y la
altura dice cuánto pesa ✓ (el riesgo ✓). El color es el del mapa ✓, para que las dos vistas digan
lo mismo ✓.

**Las carpetas son contenedores** ✓: de lejos, una carpeta es una caja que resume lo que tiene ✓; al
acercarte se abre ✓ y enseña a sus hijos ✓, con su suelo debajo ✓. Es el **nivel de detalle** ✓
(`volumes.ts` ✓): una carpeta solo se abre si se ve (más de ~22 px en pantalla ✓) y si caben sus
hijos en el presupuesto de primitivas ✓ (4.000 ✓). Así un repo de 20.000 ficheros no dibuja 20.000
cajas ✓. Como el mapa es 2D (x, z) con la altura encima ✓, el árbol es un **quadtree** ✓, no un
octree ✓.

Las cajas se dibujan en **una sola malla instanciada** ✓ (`InstancedMesh` ✓) con su color por
instancia ✓: miles de cajas son una draw call ✓. La selección se tiñe del azul de la app ✓ en la
propia instancia ✓.

Al abrir, la cámara **encuadra el mapa entero** ✓: la distancia sale del radio del mapa y del campo de
visión ✓ (`fitDistance` ✓), y la niebla se escala con él ✓.

- **Orbita** con el ratón ✓, **zoom** con la rueda ✓ y **pinza** con dos dedos ✓.
- **Pulsa un fichero** para seleccionarlo ✓ (un arrastre no selecciona ✓) y **una carpeta plegada**
  para enfocarla ✓: la app se queda con esa carpeta ✓ y el mapa se abre ✓.
- Dibuja con **WebGPU** ✓ si la máquina lo tiene ✓ y cae a **WebGL2** ✓ si no ✓; el aviso de la
  escena dice con cuál está corriendo ✓ y cuántas cajas hay en pantalla ✓.
- Necesita **GPU** ✓: la que haya, WebGPU o WebGL2 ✓ (`requires: { gpu: true }` ✓). La tienda enseña
  con cuál va a dibujar en esta máquina ✓.

La GPU va por WebGPU ✓ (`three/webgpu` ✓): el driver elige la tarjeta ✓ (D3D12 en Windows ✓, Vulkan ✓,
Metal ✓) y `powerPreference` pide la dedicada ✓. La cámara es **propia del plugin** ✓ (`orbit.ts` ✓):
`OrbitControls` importa el build de WebGL de three ✓ y con los dos el chunk llevaría three dos veces ✓.

No toca el snapshot ✓ ni el motor ✓: es una **vista** ✓, no una lente ✓. El análisis no depende de
que esté activa ✓.

Su propia hoja de ruta (las etiquetas, la comparación de dos momentos, la instancing ✓) está en
[ROADMAP.md](ROADMAP.md) ✓.
