import * as THREE from "three/webgpu";
import {
  createOrbitControls,
  fitDistance,
  orbitPosition,
  ORBIT_LIMITS,
  ORBIT_START
} from "./orbit";
import { boundsOf, lodBoxes, type DrawnBox, type Volume } from "./volumes";

/**
 * La escena: las cajas del mapa en tres dimensiones.
 *
 * Cada fichero es una caja ✓: la base es su rectángulo del treemap ✓ (la misma
 * distribución 2D ✓) y la altura dice cuánto pesa ✓ (el riesgo, por defecto ✓).
 * El color es el del mapa ✓, para que las dos vistas digan lo mismo ✓.
 *
 * Y las carpetas son **contenedores** ✓: si están lejos, son una caja que
 * resume lo que tienen ✓; al acercarte se abren ✓ y enseñan a sus hijos ✓.
 * Eso es el nivel de detalle ✓ (`volumes.ts` ✓): el número de primitivas no
 * crece con el repo ✓.
 *
 * Las cajas se dibujan con **una sola malla instanciada** ✓ (`InstancedMesh` ✓)
 * con su color por instancia ✓: miles de cajas son una draw call ✓, no miles ✓.
 *
 * La cámara abre **encuadrando el mapa entero** ✓: la distancia sale del radio
 * del mapa y del campo de visión ✓ (`fitDistance` ✓), no de un número fijo ✓.
 *
 * La GPU se usa con **WebGPU** ✓ (`three/webgpu` ✓): es el runtime moderno del
 * navegador ✓, va por el driver de la tarjeta ✓ (D3D12 en Windows ✓, Vulkan ✓,
 * Metal ✓) y elige la GPU dedicada con `powerPreference` ✓. Si la máquina no
 * lo tiene ✓, three cae solo a WebGL2 ✓: una sola ruta de código ✓.
 */

/** El runtime que acabó dibujando ✓. */
export type SceneBackend = "webgpu" | "webgl2";

export interface SceneOptions {
  /** El árbol de volúmenes: carpetas y ficheros ✓. */
  roots: Volume[];
  /** El fondo de la escena: el de la app ✓ (su tema manda ✓). */
  background: string;
  /** La ruta del fichero seleccionado, si lo hay. */
  selected: string | null;
  /** Se llama al pulsar un fichero ✓. */
  onSelect: (path: string) => void;
  /** Se llama al pulsar una carpeta plegada ✓: se abre en el resto de la app ✓. */
  onFocus?: (path: string) => void;
  /** El runtime que ha arrancado ✓ (para decirlo en el aviso ✓). */
  onBackend?: (backend: SceneBackend) => void;
  /** La GPU no arrancó ✓. */
  onError?: () => void;
  /** Cuántas primitivas se están dibujando ✓ (cambia con el nivel de detalle ✓). */
  onBoxes?: (count: number) => void;
}

export interface Scene {
  /** Cambia el fichero iluminado sin volver a montar la escena ✓. */
  setSelected(path: string | null): void;
  /** Suelta la GPU, los eventos y la geometría ✓. */
  dispose(): void;
}

/** El campo de visión, en grados ✓. */
const FOV = 50;
/**
 * El techo de primitivas: por encima, las carpetas se quedan plegadas ✓.
 *
 * Con instancing el coste por caja es una matriz ✓, así que el techo es alto ✓:
 * el que manda es la CPU al recalcular ✓, no la GPU al dibujar ✓.
 */
const BUDGET = 4000;
/** Lo que tiene que medir una carpeta en pantalla para abrirse ✓ (píxeles ✓). */
const MIN_PIXELS = 22;
/** Cada cuánto se vuelve a mirar la cámara para el nivel de detalle ✓. */
const REFRESH_MS = 120;
/** El color con el que se tiñe la caja seleccionada ✓ (el del mapa 2D ✓). */
const SELECTION_COLOR = "#2f6fed";
const SELECTION_MIX = 0.6;
/** Aire para que el presupuesto blando nunca se quede sin instancias ✓. */
const SLACK = 256;

/** El backend que three eligió de verdad ✓ (WebGPU o su caída a WebGL2 ✓). */
function backendOf(renderer: THREE.WebGPURenderer): SceneBackend {
  const backend = renderer.backend as { isWebGPUBackend?: boolean };
  return backend.isWebGPUBackend === true ? "webgpu" : "webgl2";
}

/** Monta la escena en un canvas ✓. */
export function mountScene(
  canvas: HTMLCanvasElement,
  options: SceneOptions
): Scene {
  const renderer = new THREE.WebGPURenderer({
    canvas,
    antialias: true,
    alpha: false,
    // La tarjeta dedicada manda ✓: en un portátil con dos GPUs ✓, la integrada
    // dibujaría el mapa a tirones ✓.
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // El encuadre sale del mapa ✓: qué ocupa ✓ y a qué distancia cabe entero ✓.
  const bounds = boundsOf(options.roots);
  const fov = (FOV * Math.PI) / 180;
  const aspect = (canvas.clientWidth || 1) / (canvas.clientHeight || 1);
  const fit = fitDistance(bounds.radius, fov, aspect);
  const target = { x: bounds.cx, y: 0, z: bounds.cz };

  const scene = new THREE.Scene();
  // El fondo es el del tema ✓: un mapa en 3D sobre un color ajeno parece un
  // programa pegado dentro de otro ✓.
  scene.background = new THREE.Color(options.background);
  // La niebla da profundidad, pero se escala con el mapa ✓: con la escena
  // encuadrada entera, una niebla fija se comería media ciudad ✓, y al
  // alejarse la borraría del todo ✓.
  scene.fog = new THREE.Fog(options.background, fit * 1.4, fit * 5);

  const camera = new THREE.PerspectiveCamera(
    FOV,
    aspect,
    Math.max(1, fit * 0.01),
    fit * 4 + 2000
  );
  const start = { ...ORBIT_START, distance: fit };
  const at = orbitPosition(start, target);
  camera.position.set(at.x, at.y, at.z);

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(-300, 500, 200);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x88aaff, 0.45);
  fill.position.set(320, 180, -260);
  scene.add(fill);

  // El suelo: da la referencia de dónde está el cero.
  const groundGeometry = new THREE.PlaneGeometry(1200, 1200);
  const groundMaterial = new THREE.MeshBasicMaterial({
    color: options.background,
    transparent: true,
    opacity: 0.55
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  scene.add(ground);

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const mesh = new THREE.InstancedMesh(geometry, material, BUDGET + SLACK);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array((BUDGET + SLACK) * 3),
    3
  );
  mesh.count = 0;
  scene.add(mesh);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const color = new THREE.Color();
  const highlight = new THREE.Color(SELECTION_COLOR);

  let visible: DrawnBox[] = [];
  let selected = options.selected;
  let signature = "";

  const paint = (index: number, box: DrawnBox): void => {
    color.set(box.color);
    // La selección se tiñe del azul de la app ✓: con instancing no hay un
    // material por caja ✓, así que el aviso va en el color de la instancia ✓.
    if (box.path === selected) color.lerp(highlight, SELECTION_MIX);
    mesh.setColorAt(index, color);
  };

  const draw = (boxes: DrawnBox[]): void => {
    const count = Math.min(boxes.length, BUDGET + SLACK);
    for (let index = 0; index < count; index++) {
      const box = boxes[index] as DrawnBox;
      position.set(
        box.x + box.width / 2,
        box.height / 2,
        box.z + box.depth / 2
      );
      scale.set(
        Math.max(1, box.width - 1),
        Math.max(1, box.height),
        Math.max(1, box.depth - 1)
      );
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(index, matrix);
      paint(index, box);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor!.needsUpdate = true;
    mesh.computeBoundingSphere();
    visible = boxes.slice(0, count);
    options.onBoxes?.(count);
  };

  /** Repinta solo los colores ✓: cambiar de selección no toca geometría ✓. */
  const repaint = (): void => {
    for (let index = 0; index < visible.length; index++) {
      paint(index, visible[index] as DrawnBox);
    }
    mesh.instanceColor!.needsUpdate = true;
  };

  let lastCamera: { x: number; y: number; z: number } | null = null;

  /** Mira la cámara y, si cambia lo que se ve, vuelve a dibujar ✓. */
  const refresh = (force = false): void => {
    // Quieto no hay nada que recalcular ✓: mover el ratón gira la cámara ✓,
    // pero el nivel de detalle solo cambia cuando cambia de verdad ✓.
    if (!force && lastCamera) {
      const moved = Math.hypot(
        camera.position.x - lastCamera.x,
        camera.position.y - lastCamera.y,
        camera.position.z - lastCamera.z
      );
      if (moved < camera.position.length() * 0.005) return;
    }
    lastCamera = { x: camera.position.x, y: camera.position.y, z: camera.position.z };

    const boxes = lodBoxes(options.roots, {
      camera: camera.position,
      viewportHeight: canvas.clientHeight || 1,
      fov,
      minPixels: MIN_PIXELS,
      budget: BUDGET
    });
    // La firma dice qué se ve ✓; cambiar de selección también redibuja ✓.
    const next = `${selected ?? ""}§${boxes
      .map((box) => (box.collapsed ? `+${box.path}` : box.path))
      .join("|")}`;
    if (!force && next === signature) return;
    signature = next;
    draw(boxes);
  };

  const resize = (): void => {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    refresh(true);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const onTap = (clientX: number, clientY: number): void => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(mesh, false)[0];
    const box = hit?.instanceId === undefined ? undefined : visible[hit.instanceId];
    if (!box) return;
    // Una carpeta plegada es una pregunta ✓: dentro hay más ✓. Al pulsarla se
    // enfoca y la ciudad se abre ✓.
    if (box.kind === "folder" && box.collapsed) options.onFocus?.(box.path);
    else if (box.kind === "file") options.onSelect(box.path);
  };

  const controls = createOrbitControls(camera, canvas, {
    onTap,
    start,
    target,
    // Los límites van con el mapa ✓: con la escena encuadrada entera, el tope
    // de siempre dejaba la cámara sin sitio para alejarse ✓.
    limits: {
      ...ORBIT_LIMITS,
      minDistance: Math.max(20, fit * 0.05),
      maxDistance: Math.max(ORBIT_LIMITS.maxDistance, fit * 2.4)
    }
  });

  let frame = 0;
  let disposed = false;
  let lastRefresh = 0;
  const animate = (time = 0): void => {
    frame = requestAnimationFrame(animate);
    controls.update();
    if (time - lastRefresh >= REFRESH_MS) {
      lastRefresh = time;
      refresh();
    }
    renderer.render(scene, camera);
  };

  // El backend arranca de forma asíncrona ✓: hasta que hay dispositivo no
  // hay primer fotograma ✓, y `render()` antes de tiempo solo avisaría por
  // consola en cada fotograma ✓.
  void renderer
    .init()
    .then(() => {
      if (disposed) return;
      resize();
      options.onBackend?.(backendOf(renderer));
      animate();
    })
    .catch(() => {
      if (!disposed) options.onError?.();
    });

  return {
    setSelected(path: string | null): void {
      if (path === selected) return;
      selected = path;
      repaint();
    },
    dispose(): void {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      mesh.dispose();
      geometry.dispose();
      material.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
      renderer.dispose();
    }
  };
}
