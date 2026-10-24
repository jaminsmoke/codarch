import {
  createOrbitControls,
  fitDistance,
  ORBIT_LIMITS,
  ORBIT_START,
  type OrbitPose,
  type Point
} from "./orbit";
import { lookAt, perspective, pickBox, rayFromNdc } from "./camera";
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
 * Se dibuja con **WebGL2 propio** ✓, sin librería ✓: un cubo instanciado ✓
 * (`drawArraysInstanced` ✓) donde cada caja es una instancia con su posición,
 * su tamaño y su color ✓. Miles de cajas son una draw call ✓ y el coste por
 * fotograma es el de la GPU ✓, no el de un runtime que prepara escena, nodos y
 * materiales en cada vuelta ✓.
 *
 * Y solo se dibuja **cuando hay algo nuevo** ✓: la cámara se mueve ✓, cambia
 * la selección ✓ o cambia el tamaño ✓. Quieta, la vista no consume ✓.
 */

/** El runtime que dibuja ✓. */
export type SceneBackend = "webgl2";

export interface SceneOptions {
  /** El árbol de volúmenes: carpetas y ficheros. */
  roots: Volume[];
  /** El fondo de la escena: el de la app (su tema manda). */
  background: string;
  /** La ruta del fichero seleccionado, si lo hay. */
  selected: string | null;
  /** Se llama al pulsar un fichero. */
  onSelect: (path: string) => void;
  /** Se llama al pulsar una carpeta plegada: se abre en el resto de la app. */
  onFocus?: (path: string) => void;
  /** El runtime que ha arrancado (para decirlo en el aviso). */
  onBackend?: (backend: SceneBackend) => void;
  /** La GPU no arrancó. */
  onError?: () => void;
  /** Cuántas primitivas se están dibujando (cambia con el nivel de detalle). */
  onBoxes?: (count: number) => void;
}

export interface Scene {
  /** Cambia el fichero iluminado sin volver a montar la escena. */
  setSelected(path: string | null): void;
  /** Suelta la GPU, los eventos y la geometría. */
  dispose(): void;
}

/** El campo de visión, en grados. */
const FOV = 50;
/**
 * El techo de primitivas: por encima, las carpetas se quedan plegadas.
 *
 * Con instancing el coste por caja es una matriz, así que el techo es alto:
 * el que manda es la CPU al recalcular, no la GPU al dibujar.
 */
const BUDGET = 4000;
/** Lo que tiene que medir una carpeta en pantalla para abrirse (píxeles). */
const MIN_PIXELS = 22;
/** Cada cuánto se vuelve a mirar la cámara para el nivel de detalle. */
const REFRESH_MS = 120;
/** El color con el que se tiñe la caja seleccionada (el del mapa 2D). */
const SELECTION_COLOR = "#2f6fed";
const SELECTION_MIX = 0.6;
/** Aire para que el presupuesto blando nunca se quede sin instancias. */
const SLACK = 256;
/** El techo de píxeles del lienzo: por encima, se baja la resolución. */
const MAX_PIXELS = 8_000_000;
/** Los vértices de un cubo (6 caras × 2 triángulos). */
const CUBE_VERTICES = 36;
/** Floats por instancia: posición (3), tamaño (3) y color (3). */
const STRIDE = 9;

/**
 * El cubo instanciado ✓.
 *
 * No hay búfer de vértices ✓: las 36 esquinas se sacan de `gl_VertexID` ✓ con
 * dos tablas constantes ✓. Cada instancia trae su posición ✓, su tamaño ✓ y su
 * color ✓, y la cara da la normal ✓ para que la luz dé volumen ✓.
 */
const VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aOffset;
layout(location = 1) in vec3 aScale;
layout(location = 2) in vec3 aColor;

uniform mat4 uView;
uniform mat4 uProjection;

out vec3 vColor;
out vec3 vNormal;
out float vDepth;

const vec3 CORNERS[8] = vec3[8](
  vec3(-0.5, -0.5, -0.5),
  vec3( 0.5, -0.5, -0.5),
  vec3( 0.5,  0.5, -0.5),
  vec3(-0.5,  0.5, -0.5),
  vec3(-0.5, -0.5,  0.5),
  vec3( 0.5, -0.5,  0.5),
  vec3( 0.5,  0.5,  0.5),
  vec3(-0.5,  0.5,  0.5)
);

const int FACES[36] = int[36](
  0, 1, 2,  0, 2, 3,
  4, 6, 5,  4, 7, 6,
  0, 4, 5,  0, 5, 1,
  3, 2, 6,  3, 6, 7,
  0, 3, 7,  0, 7, 4,
  1, 5, 6,  1, 6, 2
);

const vec3 NORMALS[6] = vec3[6](
  vec3( 0.0,  0.0, -1.0),
  vec3( 0.0,  0.0,  1.0),
  vec3( 0.0, -1.0,  0.0),
  vec3( 0.0,  1.0,  0.0),
  vec3(-1.0,  0.0,  0.0),
  vec3( 1.0,  0.0,  0.0)
);

void main() {
  vec3 local = CORNERS[FACES[gl_VertexID]];
  vec3 world = aOffset + local * aScale;
  vec4 view = uView * vec4(world, 1.0);
  vColor = aColor;
  vNormal = NORMALS[gl_VertexID / 6];
  vDepth = -view.z;
  gl_Position = uProjection * view;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 vColor;
in vec3 vNormal;
in float vDepth;

uniform vec3 uLight;
uniform vec3 uFill;
uniform vec3 uFog;
uniform float uFogNear;
uniform float uFogFar;

out vec4 outColor;

void main() {
  vec3 normal = normalize(vNormal);
  float key = max(dot(normal, uLight), 0.0);
  float fill = max(dot(normal, uFill), 0.0);
  // El ambiente mantiene el color de la caja y las dos direcciones dan volumen:
  // el techo y los costados no se confunden aunque no haya luces.
  float shade = 0.46 + key * 0.46 + fill * 0.18;
  vec3 color = vColor * shade;
  float fog = smoothstep(uFogNear, uFogFar, vDepth);
  outColor = vec4(mix(color, uFog, fog * 0.9), 1.0);
}
`;

/** Compila un shader ✓ o falla ✓. */
function compile(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("No se pudo crear el shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "shader roto";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

/** Enlaza el programa ✓ o falla ✓. */
function link(gl: WebGL2RenderingContext): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error("No se pudo crear el programa");
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "programa roto";
    gl.deleteProgram(program);
    throw new Error(log);
  }
  return program;
}

/**
 * Un color CSS a tres floats ✓.
 *
 * El tema entrega `rgb(...)` (lo que resuelve el navegador ✓) y el mapa entrega
 * `#rrggbb` ✓: se aceptan los dos ✓, y cualquier otra cosa cae al gris ✓.
 */
export function parseColor(
  value: string,
  fallback: [number, number, number] = [0.5, 0.5, 0.5]
): [number, number, number] {
  const text = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text);
  if (hex) {
    const digits = hex[1] as string;
    const full =
      digits.length === 3
        ? digits
            .split("")
            .map((digit) => digit + digit)
            .join("")
        : digits;
    return [
      parseInt(full.slice(0, 2), 16) / 255,
      parseInt(full.slice(2, 4), 16) / 255,
      parseInt(full.slice(4, 6), 16) / 255
    ];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(text);
  if (rgb) {
    return [
      Math.min(255, Number(rgb[1])) / 255,
      Math.min(255, Number(rgb[2])) / 255,
      Math.min(255, Number(rgb[3])) / 255
    ];
  }
  return fallback;
}

/** Un color de caja con la selección ya mezclada ✓. */
function colorOf(box: DrawnBox, selected: string | null): [number, number, number] {
  const color = parseColor(box.color);
  if (box.path !== selected) return color;
  const highlight = parseColor(SELECTION_COLOR);
  return [
    color[0] + (highlight[0] - color[0]) * SELECTION_MIX,
    color[1] + (highlight[1] - color[1]) * SELECTION_MIX,
    color[2] + (highlight[2] - color[2]) * SELECTION_MIX
  ];
}

/** Monta la escena en un canvas ✓. */
export function mountScene(
  canvas: HTMLCanvasElement,
  options: SceneOptions
): Scene {
  const gl = canvas.getContext("webgl2", {
    antialias: true,
    alpha: false,
    depth: true,
    // La tarjeta dedicada manda: en un portátil con dos GPUs, la integrada
    // dibujaría el mapa a tirones.
    powerPreference: "high-performance"
  });

  if (!gl) {
    options.onError?.();
    return {
      setSelected: () => undefined,
      dispose: () => undefined
    };
  }

  // El encuadre sale del mapa: qué ocupa y a qué distancia cabe entero.
  const bounds = boundsOf(options.roots);
  const fov = (FOV * Math.PI) / 180;
  const aspect = (canvas.clientWidth || 1) / (canvas.clientHeight || 1);
  const fit = fitDistance(bounds.radius, fov, aspect);
  const target: Point = { x: bounds.cx, y: 0, z: bounds.cz };
  const near = Math.max(1, fit * 0.01);
  const far = fit * 4 + 2000;
  const background = parseColor(options.background, [0.93, 0.94, 0.95]);

  const capacity = BUDGET + SLACK;
  const data = new Float32Array((capacity + 1) * STRIDE);

  let program: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let buffer: WebGLBuffer | null = null;
  let uniforms: {
    view: WebGLUniformLocation | null;
    projection: WebGLUniformLocation | null;
    light: WebGLUniformLocation | null;
    fill: WebGLUniformLocation | null;
    fog: WebGLUniformLocation | null;
    fogNear: WebGLUniformLocation | null;
    fogFar: WebGLUniformLocation | null;
  } = {
    view: null,
    projection: null,
    light: null,
    fill: null,
    fog: null,
    fogNear: null,
    fogFar: null
  };

  /** Crea el programa y los búferes ✓ (también al recuperar el contexto ✓). */
  const setup = (): boolean => {
    try {
      program = link(gl);
      vao = gl.createVertexArray();
      buffer = gl.createBuffer();
      if (!vao || !buffer) throw new Error("Sin VAO o sin búfer");

      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
      for (let location = 0; location < 3; location++) {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(
          location,
          3,
          gl.FLOAT,
          false,
          STRIDE * 4,
          location * 3 * 4
        );
        // Cada vértice del cubo es una instancia distinta: el divisor manda.
        gl.vertexAttribDivisor(location, 1);
      }

      uniforms = {
        view: gl.getUniformLocation(program, "uView"),
        projection: gl.getUniformLocation(program, "uProjection"),
        light: gl.getUniformLocation(program, "uLight"),
        fill: gl.getUniformLocation(program, "uFill"),
        fog: gl.getUniformLocation(program, "uFog"),
        fogNear: gl.getUniformLocation(program, "uFogNear"),
        fogFar: gl.getUniformLocation(program, "uFogFar")
      };

      // El suelo: da la referencia de dónde está el cero. Es una instancia más,
      // la primera, y no entra en el picking.
      const ground = Math.max(200, bounds.radius * 4);
      data[0] = bounds.cx;
      data[1] = -0.17;
      data[2] = bounds.cz;
      data[3] = ground;
      data[4] = 0.3;
      data[5] = ground;
      data[6] = background[0] * 0.92;
      data[7] = background[1] * 0.92;
      data[8] = background[2] * 0.92;
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, STRIDE);

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      // Las cajas son opacas y el orden no importa: no hace falta descartar
      // caras y así una caja nunca desaparece por un giro de vértices.
      gl.disable(gl.CULL_FACE);
      gl.clearColor(background[0], background[1], background[2], 1);
      return true;
    } catch {
      return false;
    }
  };

  let visible: DrawnBox[] = [];
  let selected = options.selected;
  let signature = "";
  let instanceCount = 1;
  let disposed = false;
  let ready = false;
  let lost = false;
  let frame = 0;
  let lastRefresh = 0;
  let lastCamera: Point | null = null;
  let projection = perspective(fov, aspect, near, far);

  const controls = createOrbitControls(canvas, {
    onTap: (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const ndcY = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      const pose = controls.pose();
      const ray = rayFromNdc(
        pose.position,
        pose.target,
        ndcX,
        ndcY,
        fov,
        rect.width / Math.max(1, rect.height)
      );
      const index = pickBox(ray, visible);
      const box = index === null ? undefined : visible[index];
      if (!box) return;
      // Una carpeta plegada es una pregunta: dentro hay más. Al pulsarla se
      // enfoca y la ciudad se abre.
      if (box.kind === "folder" && box.collapsed) options.onFocus?.(box.path);
      else if (box.kind === "file") options.onSelect(box.path);
    },
    start: { ...ORBIT_START, distance: fit },
    target,
    // La cámara avisa cuando hay algo nuevo que dibujar: quieta no hay fotograma.
    onChange: () => requestRender(),
    // Los límites van con el mapa: con la escena encuadrada entera, el tope de
    // siempre dejaba la cámara sin sitio para alejarse.
    limits: {
      ...ORBIT_LIMITS,
      minDistance: Math.max(20, fit * 0.05),
      maxDistance: Math.max(ORBIT_LIMITS.maxDistance, fit * 2.4)
    }
  });

  /** Sube las instancias de las cajas ✓ (el suelo se queda donde está ✓). */
  const upload = (): void => {
    if (!gl || !buffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      STRIDE * 4,
      data,
      STRIDE,
      Math.max(0, instanceCount - 1) * STRIDE
    );
  };

  /** Escribe una caja en el búfer ✓: posición, tamaño y color ✓. */
  const writeBox = (slot: number, box: DrawnBox): void => {
    const base = slot * STRIDE;
    // Un mínimo de un píxel de mundo para que una caja fina no desaparezca y
    // para que su base quede en el suelo aunque su altura sea casi cero.
    const height = Math.max(1, box.height);
    data[base] = box.x + box.width / 2;
    data[base + 1] = box.y + height / 2;
    data[base + 2] = box.z + box.depth / 2;
    data[base + 3] = Math.max(1, box.width - 1);
    data[base + 4] = height;
    data[base + 5] = Math.max(1, box.depth - 1);
    const color = colorOf(box, selected);
    data[base + 6] = color[0];
    data[base + 7] = color[1];
    data[base + 8] = color[2];
  };

  /** Rehace las instancias con las cajas que se ven ✓. */
  const draw = (boxes: DrawnBox[]): void => {
    const count = Math.min(boxes.length, capacity);
    for (let index = 0; index < count; index++) {
      writeBox(index + 1, boxes[index] as DrawnBox);
    }
    visible = boxes.slice(0, count);
    instanceCount = count + 1;
    upload();
    options.onBoxes?.(count);
    requestRender();
  };

  /** Repinta solo los colores: cambiar de selección no toca geometría. */
  const repaint = (): void => {
    for (let index = 0; index < visible.length; index++) {
      writeBox(index + 1, visible[index] as DrawnBox);
    }
    upload();
    requestRender();
  };

  /** Mira la cámara y, si cambia lo que se ve, vuelve a dibujar. */
  const refresh = (camera: Point, force = false): void => {
    // Quieto no hay nada que recalcular: mover el ratón gira la cámara, pero el
    // nivel de detalle solo cambia cuando cambia de verdad.
    if (!force && lastCamera) {
      const moved = Math.hypot(
        camera.x - lastCamera.x,
        camera.y - lastCamera.y,
        camera.z - lastCamera.z
      );
      if (moved < Math.hypot(camera.x, camera.y, camera.z) * 0.005) return;
    }
    lastCamera = { ...camera };

    const boxes = lodBoxes(options.roots, {
      camera,
      viewportHeight: canvas.clientHeight || 1,
      fov,
      minPixels: MIN_PIXELS,
      budget: BUDGET
    });
    // La firma dice qué se ve: si no cambia, no se vuelve a subir nada.
    const next = boxes
      .map((box) => (box.collapsed ? `+${box.path}` : box.path))
      .join("|");
    if (!force && next === signature) return;
    signature = next;
    draw(boxes);
  };

  /**
   * Un fotograma solo cuando hay algo que dibujar.
   *
   * Antes la escena dibujaba a 60 fps para siempre, aunque estuviera quieta:
   * con la vista 3D abierta, eso dejaba la app entera sin aire.
   */
  function requestRender(): void {
    if (disposed || lost || !ready || frame) return;
    frame = requestAnimationFrame(render);
  }

  /** Dibuja el fotograma con la cámara de ahora ✓. */
  const paint = (pose: OrbitPose): void => {
    if (!gl || !program) return;
    gl.clearColor(background[0], background[1], background[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.view, false, lookAt(pose.position, pose.target));
    gl.uniformMatrix4fv(uniforms.projection, false, projection);
    gl.uniform3f(uniforms.light, -0.38, 0.85, 0.36);
    gl.uniform3f(uniforms.fill, 0.48, 0.18, -0.86);
    gl.uniform3f(uniforms.fog, background[0], background[1], background[2]);
    gl.uniform1f(uniforms.fogNear, fit * 1.4);
    gl.uniform1f(uniforms.fogFar, fit * 5);
    gl.bindVertexArray(vao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, CUBE_VERTICES, instanceCount);
    gl.bindVertexArray(null);
  };

  const render = (): void => {
    frame = 0;
    if (disposed || lost || !gl) return;
    const moved = controls.update();
    const now = performance.now();
    const pose = controls.pose();
    if (moved) {
      if (now - lastRefresh >= REFRESH_MS) {
        lastRefresh = now;
        refresh(pose.position);
      }
      requestRender();
    }
    paint(pose);
  };

  const resize = (): void => {
    if (!gl || disposed || lost) return;
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    // La resolución sigue al DPR, con dos topes: 2× y ocho megapíxeles. Una
    // pantalla 4K a 2× serían 33 Mpx de relleno para un mapa de cajas.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixels = width * height * dpr * dpr;
    const scale = pixels > MAX_PIXELS ? dpr * Math.sqrt(MAX_PIXELS / pixels) : dpr;
    const nextWidth = Math.max(1, Math.round(width * scale));
    const nextHeight = Math.max(1, Math.round(height * scale));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
    projection = perspective(fov, width / height, near, far);
    gl.viewport(0, 0, canvas.width, canvas.height);
    refresh(controls.pose().position, true);
    requestRender();
  };

  const onContextLost = (event: Event): void => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const onContextRestored = (): void => {
    if (disposed) return;
    lost = false;
    if (!setup()) {
      options.onError?.();
      return;
    }
    resize();
    options.onBackend?.("webgl2");
    requestRender();
  };

  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener("resize", resize);

  if (!setup()) {
    options.onError?.();
  } else {
    ready = true;
    options.onBackend?.("webgl2");
    resize();
  }

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
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      controls.dispose();
      if (gl) {
        if (buffer) gl.deleteBuffer(buffer);
        if (vao) gl.deleteVertexArray(vao);
        if (program) gl.deleteProgram(program);
      }
    }
  };
}
