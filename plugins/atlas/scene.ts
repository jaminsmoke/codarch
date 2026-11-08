import {
  createOrbitControls,
  fitDistance,
  ORBIT_LIMITS,
  type OrbitPose,
  type Point
} from "./orbit";
import { lookAt, perspective, pickBox, rayFromNdc } from "./camera";
import { boundsOf, lodBoxes, type DrawnBox, type Volume } from "./volumes";

/**
 * El escenario del Atlas.
 *
 * Es un renderizador propio del plugin: una malla de cubos instanciados para
 * carpetas y ficheros, un plano con rejilla y una cámara orbital. Las carpetas
 * se leen como contenedores: cuando están plegadas son un volumen; al acercarse
 * se abren en una losa y sus hijos. Los ficheros son cubos dentro de ellas.
 *
 * La diferencia con `vista-3d` no es solo estética: el Atlas usa una cámara más
 * aérea, una rejilla de referencia y aristas en los contenedores para que la
 * profundidad se lea como un atlas y no como un histograma.
 */

export type SceneBackend = "webgl2";

export interface SceneOptions {
  roots: Volume[];
  background: string;
  selected: string | null;
  onSelect: (path: string) => void;
  onFocus?: (path: string) => void;
  onBackend?: (backend: SceneBackend) => void;
  onError?: () => void;
  onBoxes?: (count: number) => void;
  onContainers?: (count: number) => void;
}

export interface Scene {
  setSelected(path: string | null): void;
  dispose(): void;
}

const FOV = 48;
const BUDGET = 3000;
const MIN_PIXELS = 24;
const REFRESH_MS = 120;
const SELECTION_COLOR = "#2f6fed";
const SELECTION_MIX = 0.6;
const EDGE_COLOR = "#8fe7ff";
const GRID_COLOR = "#52606d";
const SLACK = 256;
const MAX_PIXELS = 8_000_000;
const CUBE_VERTICES = 36;
/** Posición, tamaño, color y tipo (0 fichero, 1 carpeta, 2 suelo). */
const STRIDE = 10;

const VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aOffset;
layout(location = 1) in vec3 aScale;
layout(location = 2) in vec3 aColor;
layout(location = 3) in float aKind;

uniform mat4 uView;
uniform mat4 uProjection;

out vec3 vColor;
out vec3 vNormal;
out vec3 vWorld;
out vec3 vLocal;
out float vDepth;
out float vKind;

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
  vWorld = world;
  vLocal = local;
  vDepth = -view.z;
  vKind = aKind;
  gl_Position = uProjection * view;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 vColor;
in vec3 vNormal;
in vec3 vWorld;
in vec3 vLocal;
in float vDepth;
in float vKind;

uniform vec3 uLight;
uniform vec3 uFill;
uniform vec3 uFog;
uniform vec3 uEdge;
uniform vec3 uGrid;
uniform float uFogNear;
uniform float uFogFar;

out vec4 outColor;

float gridLine(vec2 point, float spacing) {
  vec2 coord = point / spacing;
  vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
  return 1.0 - min(min(grid.x, grid.y), 1.0);
}

void main() {
  vec3 normal = normalize(vNormal);
  float key = max(dot(normal, uLight), 0.0);
  float fill = max(dot(normal, uFill), 0.0);
  float shade = 0.46 + key * 0.46 + fill * 0.18;
  vec3 color = vColor * shade;

  if (vKind > 1.5) {
    // El suelo: una rejilla tenue da la referencia de profundidad.
    color = mix(color, uGrid, gridLine(vWorld.xz, 36.0) * 0.42);
  } else if (vKind > 0.5) {
    // Las carpetas se leen como contenedores: sus aristas marcan el volumen.
    vec3 absolute = abs(normal);
    vec2 face = absolute.y > 0.5
      ? vLocal.xz
      : (absolute.x > 0.5 ? vLocal.zy : vLocal.xy);
    float distanceToEdge = min(0.5 - abs(face.x), 0.5 - abs(face.y));
    float edge = 1.0 - smoothstep(0.0, 0.05, distanceToEdge);
    color = mix(color, uEdge, edge * 0.82);
  }

  float fog = smoothstep(uFogNear, uFogFar, vDepth);
  outColor = vec4(mix(color, uFog, fog * 0.9), 1.0);
}
`;

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

export function colorOf(
  box: DrawnBox,
  selected: string | null
): [number, number, number] {
  const color = parseColor(box.color);
  if (box.path !== selected) return color;
  const highlight = parseColor(SELECTION_COLOR);
  return [
    color[0] + (highlight[0] - color[0]) * SELECTION_MIX,
    color[1] + (highlight[1] - color[1]) * SELECTION_MIX,
    color[2] + (highlight[2] - color[2]) * SELECTION_MIX
  ];
}

export interface InstanceLayout {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: [number, number, number];
  kind: 0 | 1;
}

export function instanceLayout(
  box: DrawnBox,
  selected: string | null
): InstanceLayout {
  const height = Math.max(1, box.height);
  return {
    x: box.x + box.width / 2,
    y: box.y + height / 2,
    z: box.z + box.depth / 2,
    width: Math.max(1, box.width - 1),
    height,
    depth: Math.max(1, box.depth - 1),
    color: colorOf(box, selected),
    kind: box.kind === "folder" ? 1 : 0
  };
}

export function canvasPixelScale(
  width: number,
  height: number,
  devicePixelRatio: number,
  maxPixels: number = MAX_PIXELS
): number {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const pixels = width * height * dpr * dpr;
  return pixels > maxPixels ? dpr * Math.sqrt(maxPixels / pixels) : dpr;
}

export function mountScene(
  canvas: HTMLCanvasElement,
  options: SceneOptions
): Scene {
  const gl = canvas.getContext("webgl2", {
    antialias: true,
    alpha: false,
    depth: true,
    powerPreference: "high-performance"
  });

  if (!gl) {
    options.onError?.();
    return {
      setSelected: () => undefined,
      dispose: () => undefined
    };
  }

  const bounds = boundsOf(options.roots);
  const fov = (FOV * Math.PI) / 180;
  const aspect = (canvas.clientWidth || 1) / (canvas.clientHeight || 1);
  const fit = fitDistance(bounds.radius, fov, aspect);
  const target: Point = { x: bounds.cx, y: 0, z: bounds.cz };
  const near = Math.max(1, fit * 0.01);
  const far = fit * 5 + 2000;
  const background = parseColor(options.background, [0.93, 0.94, 0.95]);
  const edge = parseColor(EDGE_COLOR);
  const grid = parseColor(GRID_COLOR);

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
    edge: WebGLUniformLocation | null;
    grid: WebGLUniformLocation | null;
    fogNear: WebGLUniformLocation | null;
    fogFar: WebGLUniformLocation | null;
  } = {
    view: null,
    projection: null,
    light: null,
    fill: null,
    fog: null,
    edge: null,
    grid: null,
    fogNear: null,
    fogFar: null
  };

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
        gl.vertexAttribDivisor(location, 1);
      }
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 1, gl.FLOAT, false, STRIDE * 4, 9 * 4);
      gl.vertexAttribDivisor(3, 1);

      uniforms = {
        view: gl.getUniformLocation(program, "uView"),
        projection: gl.getUniformLocation(program, "uProjection"),
        light: gl.getUniformLocation(program, "uLight"),
        fill: gl.getUniformLocation(program, "uFill"),
        fog: gl.getUniformLocation(program, "uFog"),
        edge: gl.getUniformLocation(program, "uEdge"),
        grid: gl.getUniformLocation(program, "uGrid"),
        fogNear: gl.getUniformLocation(program, "uFogNear"),
        fogFar: gl.getUniformLocation(program, "uFogFar")
      };

      // La primera instancia es el suelo, fuera del picking.
      const ground = Math.max(220, bounds.radius * 4);
      data[0] = bounds.cx;
      data[1] = -0.18;
      data[2] = bounds.cz;
      data[3] = ground;
      data[4] = 0.34;
      data[5] = ground;
      data[6] = background[0] * 0.92;
      data[7] = background[1] * 0.92;
      data[8] = background[2] * 0.92;
      data[9] = 2;
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, STRIDE);

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
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
      if (box.kind === "folder") options.onFocus?.(box.path);
      else options.onSelect(box.path);
    },
    // La vista inicial es más aérea que la de barras: primero se lee el atlas.
    start: { azimuth: -0.58, polar: 0.9, distance: fit },
    target,
    onChange: () => requestRender(),
    limits: {
      ...ORBIT_LIMITS,
      minDistance: Math.max(18, fit * 0.04),
      maxDistance: Math.max(ORBIT_LIMITS.maxDistance, fit * 2.8)
    }
  });

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

  const writeBox = (slot: number, box: DrawnBox): void => {
    const base = slot * STRIDE;
    const layout = instanceLayout(box, selected);
    data[base] = layout.x;
    data[base + 1] = layout.y;
    data[base + 2] = layout.z;
    data[base + 3] = layout.width;
    data[base + 4] = layout.height;
    data[base + 5] = layout.depth;
    data[base + 6] = layout.color[0];
    data[base + 7] = layout.color[1];
    data[base + 8] = layout.color[2];
    data[base + 9] = layout.kind;
  };

  const draw = (boxes: DrawnBox[]): void => {
    const count = Math.min(boxes.length, capacity);
    for (let index = 0; index < count; index++) {
      writeBox(index + 1, boxes[index] as DrawnBox);
    }
    visible = boxes.slice(0, count);
    instanceCount = count + 1;
    upload();
    options.onBoxes?.(count);
    options.onContainers?.(
      visible.filter((box) => box.kind === "folder").length
    );
    requestRender();
  };

  const repaint = (): void => {
    for (let index = 0; index < visible.length; index++) {
      writeBox(index + 1, visible[index] as DrawnBox);
    }
    upload();
    requestRender();
  };

  const refresh = (camera: Point, force = false): void => {
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
    const next = boxes
      .map((box) => `${box.kind}:${box.collapsed ? "+" : ""}${box.path}`)
      .join("|");
    if (!force && next === signature) return;
    signature = next;
    draw(boxes);
  };

  function requestRender(): void {
    if (disposed || lost || !ready || frame) return;
    frame = requestAnimationFrame(render);
  }

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
    gl.uniform3f(uniforms.edge, edge[0], edge[1], edge[2]);
    gl.uniform3f(uniforms.grid, grid[0], grid[1], grid[2]);
    gl.uniform1f(uniforms.fogNear, fit * 1.6);
    gl.uniform1f(uniforms.fogFar, fit * 6);
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
    const scale = canvasPixelScale(
      width,
      height,
      window.devicePixelRatio || 1,
      MAX_PIXELS
    );
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
