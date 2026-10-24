import * as THREE from "three/webgpu";
import { createOrbitControls, orbitPosition, ORBIT_START } from "./orbit";

/**
 * La escena: las cajas del mapa en tres dimensiones.
 *
 * Cada fichero del mapa es una caja ✓: la base es su rectángulo del treemap ✓
 * (la misma distribución 2D ✓) y la altura dice cuánto pesa ✓ (el riesgo, por
 * defecto ✓). El color es el del mapa ✓, para que las dos vistas digan lo
 * mismo ✓.
 *
 * La GPU se usa con **WebGPU** ✓ (`three/webgpu` ✓): es el runtime moderno del
 * navegador ✓, va por el driver de la tarjeta ✓ (D3D12 en Windows ✓, Vulkan ✓,
 * Metal ✓) y elige la GPU dedicada con `powerPreference` ✓. Si la máquina no
 * lo tiene ✓, three cae solo a WebGL2 ✓: una sola ruta de código ✓.
 *
 * La cámara se mueve con el ratón ✓ (orbitar ✓, zoom ✓) y al pulsar una caja
 * se selecciona el fichero ✓.
 */

/** El runtime que acabó dibujando ✓. */
export type SceneBackend = "webgpu" | "webgl2";

export interface BoxCell {
  /** La ruta del fichero. */
  path: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  /** La altura de la caja. */
  height: number;
  color: string;
}

export interface SceneOptions {
  /** Las cajas a dibujar. */
  cells: BoxCell[];
  /** El fondo de la escena: el de la app ✓ (su tema manda ✓). */
  background: string;
  /** La ruta del fichero seleccionado, si lo hay. */
  selected: string | null;
  /** Se llama al pulsar una caja. */
  onSelect: (path: string) => void;
  /** El runtime que ha arrancado ✓ (para decirlo en el aviso ✓). */
  onBackend?: (backend: SceneBackend) => void;
  /** La GPU no arrancó ✓. */
  onError?: () => void;
}

/** El backend que three eligió de verdad ✓ (WebGPU o su caída a WebGL2 ✓). */
function backendOf(renderer: THREE.WebGPURenderer): SceneBackend {
  const backend = renderer.backend as { isWebGPUBackend?: boolean };
  return backend.isWebGPUBackend === true ? "webgpu" : "webgl2";
}

/** Monta la escena en un canvas y devuelve cómo destruirla. */
export function mountScene(
  canvas: HTMLCanvasElement,
  options: SceneOptions
): () => void {
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

  const camera = new THREE.PerspectiveCamera(50, 1, 1, 4000);
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
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    new THREE.MeshBasicMaterial({
      color: options.background,
      transparent: true,
      opacity: 0.55
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  scene.add(ground);

  const group = new THREE.Group();
  scene.add(group);

  const meshes = new Map<string, THREE.Mesh>();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const rebuild = (cells: BoxCell[], selected: string | null): void => {
    for (const mesh of meshes.values()) {
      group.remove(mesh);
    }
    meshes.clear();

    for (const cell of cells) {
      const isSelected = cell.path === selected;
      const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color(cell.color),
        emissive: new THREE.Color(isSelected ? "#2f6fed" : "#000000"),
        emissiveIntensity: isSelected ? 0.55 : 0
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(
        Math.max(1, cell.width - 1),
        Math.max(1, cell.height),
        Math.max(1, cell.depth - 1)
      );
      mesh.position.set(
        cell.x + cell.width / 2,
        Math.max(1, cell.height) / 2,
        cell.z + cell.depth / 2
      );
      mesh.userData.path = cell.path;
      group.add(mesh);
      meshes.set(cell.path, mesh);
    }
  };

  rebuild(options.cells, options.selected);

  const resize = (): void => {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const onTap = (clientX: number, clientY: number): void => {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(group.children, false);
    const path = hits[0]?.object.userData.path;
    if (typeof path === "string") options.onSelect(path);
  };

  const controls = createOrbitControls(camera, canvas, { onTap });

  let frame = 0;
  let disposed = false;
  const animate = (): void => {
    frame = requestAnimationFrame(animate);
    controls.update();
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

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    controls.dispose();
    for (const mesh of meshes.values()) {
      (mesh.material as THREE.Material).dispose();
    }
    geometry.dispose();
    (ground.material as THREE.Material).dispose();
    ground.geometry.dispose();
    renderer.dispose();
  };
}
