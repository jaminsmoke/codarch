import * as THREE from "three/webgpu";
import { createOrbitControls, orbitPosition, ORBIT_START } from "./orbit";
import { lodBoxes, type DrawnBox, type Volume } from "./volumes";

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
/** El techo de primitivas: por encima, las carpetas se quedan plegadas ✓. */
const BUDGET = 1200;
/** Lo que tiene que medir una carpeta en pantalla para abrirse ✓ (píxeles ✓). */
const MIN_PIXELS = 22;
/** Cada cuánto se vuelve a mirar la cámara para el nivel de detalle ✓. */
const REFRESH_MS = 120;

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

  const scene = new THREE.Scene();
  // El fondo es el de la app ✓: un mapa en 3D sobre un color ajeno al tema
  // parece un programa pegado dentro de otro ✓.
  scene.background = new THREE.Color(options.background);
  scene.fog = new THREE.Fog(options.background, 400, 1600);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 4000);
  const start = orbitPosition(ORBIT_START, { x: 0, y: 0, z: 0 });
  camera.position.set(start.x, start.y, start.z);

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

  const group = new THREE.Group();
  scene.add(group);

  // Un material por color ✓, no por caja ✓: con 1.200 cajas, 1.200 materiales
  // son 1.200 pipelines ✓ y la GPU se atraganta ✓.
  const materials = new Map<string, THREE.MeshLambertMaterial>();
  const materialFor = (color: string, isSelected: boolean): THREE.MeshLambertMaterial => {
    const key = `${color}|${isSelected ? 1 : 0}`;
    const cached = materials.get(key);
    if (cached) return cached;
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(isSelected ? "#2f6fed" : "#000000"),
      emissiveIntensity: isSelected ? 0.55 : 0
    });
    materials.set(key, material);
    return material;
  };

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let drawn: THREE.Mesh[] = [];
  let selected = options.selected;
  let signature = "";

  const clear = (): void => {
    for (const mesh of drawn) group.remove(mesh);
    drawn = [];
  };

  const draw = (boxes: DrawnBox[]): void => {
    clear();
    for (const box of boxes) {
      const mesh = new THREE.Mesh(
        geometry,
        materialFor(box.color, box.path === selected)
      );
      mesh.scale.set(
        Math.max(1, box.width - 1),
        Math.max(1, box.height),
        Math.max(1, box.depth - 1)
      );
      mesh.position.set(
        box.x + box.width / 2,
        box.height / 2,
        box.z + box.depth / 2
      );
      mesh.userData.path = box.path;
      mesh.userData.kind = box.kind;
      mesh.userData.collapsed = box.collapsed;
      group.add(mesh);
      drawn.push(mesh);
    }
    options.onBoxes?.(boxes.length);
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
      fov: (FOV * Math.PI) / 180,
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
    const bounds = canvas.getBoundingClientRect();
    pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(drawn, false)[0]?.object.userData;
    if (typeof hit?.path !== "string") return;
    // Una carpeta plegada es una pregunta ✓: dentro hay más ✓. Al pulsarla se
    // enfoca y la ciudad se abre ✓.
    if (hit.kind === "folder" && hit.collapsed === true) options.onFocus?.(hit.path);
    else if (hit.kind === "file") options.onSelect(hit.path);
  };

  const controls = createOrbitControls(camera, canvas, { onTap });

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
      refresh(true);
    },
    dispose(): void {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      clear();
      geometry.dispose();
      for (const material of materials.values()) material.dispose();
      materials.clear();
      groundGeometry.dispose();
      groundMaterial.dispose();
      renderer.dispose();
    }
  };
}
