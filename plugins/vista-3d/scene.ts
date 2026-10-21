import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * La escena: las cajas del mapa en tres dimensiones.
 *
 * Cada fichero del mapa es una caja ✓: la base es su rectángulo del treemap ✓
 * (la misma distribución 2D ✓) y la altura dice cuánto pesa ✓ (el riesgo, por
 * defecto ✓). El color es el del mapa ✓, para que las dos vistas digan lo
 * mismo ✓.
 *
 * La cámara se mueve con el ratón ✓ (orbitar ✓, zoom ✓) y al pulsar una caja
 * se selecciona el fichero ✓.
 */

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
  /** La ruta del fichero seleccionado, si lo hay. */
  selected: string | null;
  /** Se llama al pulsar una caja. */
  onSelect: (path: string) => void;
  /** Las capacidades del navegador. */
  webgl2: boolean;
}

/** Monta la escena en un canvas y devuelve cómo destruirla. */
export function mountScene(
  canvas: HTMLCanvasElement,
  options: SceneOptions
): () => void {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#121a20");
  scene.fog = new THREE.Fog("#121a20", 400, 1600);

  const camera = new THREE.PerspectiveCamera(50, 1, 1, 4000);
  camera.position.set(-220, 260, 320);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.target.set(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-300, 500, 200);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x88aaff, 0.5);
  fill.position.set(320, 180, -260);
  scene.add(fill);

  // El suelo: da la referencia de dónde está el cero.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    new THREE.MeshBasicMaterial({ color: "#182129", transparent: true, opacity: 0.7 })
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

  let frame = 0;
  const animate = (): void => {
    frame = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  const onPointerDown = (event: PointerEvent): void => {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(group.children, false);
    const path = hits[0]?.object.userData.path;
    if (typeof path === "string") options.onSelect(path);
  };
  canvas.addEventListener("pointerdown", onPointerDown);

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.removeEventListener("pointerdown", onPointerDown);
    controls.dispose();
    for (const mesh of meshes.values()) {
      (mesh.material as THREE.Material).dispose();
    }
    geometry.dispose();
    renderer.dispose();
  };
}
