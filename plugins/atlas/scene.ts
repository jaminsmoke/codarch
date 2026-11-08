import {
  createOrbitControls,
  fitDistance,
  ORBIT_LIMITS,
  type OrbitPose,
  type Point
} from "./orbit";
import {
  lookAt,
  perspective,
  pickBox,
  projectPoint,
  rayFromNdc
} from "./camera";
import type { AtlasBox, AtlasRole, Room } from "./room";

/**
 * La escena frontal del Atlas.
 *
 * El suelo, las estanterías y las paredes son mobiliario; las carpetas son
 * contenedores en el suelo y los ficheros son hojas en las estanterías. La
 * cámara mira de frente y no puede volver al plano cenital.
 */

export type SceneBackend = "webgl2";

export interface SceneOptions {
  room: Room;
  background: string;
  selected: string | null;
  onSelect: (path: string) => void;
  onFocus?: (path: string) => void;
  onBackend?: (backend: SceneBackend) => void;
  onError?: () => void;
  onBoxes?: (count: number) => void;
  onContainers?: (count: number) => void;
  /** Lienzo transparente encima del WebGL para las etiquetas. */
  labelCanvas?: HTMLCanvasElement | null;
  labelTextColor?: string;
  labelBackground?: string;
}

export interface Scene {
  setSelected(path: string | null): void;
  /** Vuela hasta una carpeta, o al atlas entero con `null`. */
  flyTo(path: string | null, duration: number, onDone: () => void): void;
  dispose(): void;
}

const FOV = 52;
const SELECTION_COLOR = "#2f6fed";
const SELECTION_MIX = 0.6;
const EDGE_COLOR = "#8fe7ff";
const GRID_COLOR = "#6b7e8d";
const MAX_PIXELS = 8_000_000;
const MAX_LABELS = 64;
const CUBE_VERTICES = 36;
/** Posición, tamaño, color y tipo (0 hoja, 1 contenedor, 2 suelo, 3 mobiliario). */
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
uniform float uRoomHeight;

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
  float ceiling = smoothstep(0.55, 1.0, vWorld.y / max(1.0, uRoomHeight));
  float shade = 0.6 + key * 0.36 + fill * 0.14 + ceiling * 0.06;
  vec3 color = vColor * shade;

  if (vKind > 1.5 && vKind < 2.5) {
    // El suelo se tiñe con la luz y la rejilla marca la profundidad.
    color = mix(color, uGrid, gridLine(vWorld.xz, 26.0) * 0.72);
  } else if (vKind > 2.5) {
    // Paredes y estanterías: aristas suaves para separar planos.
    vec3 absolute = abs(normal);
    vec2 face = absolute.y > 0.5
      ? vLocal.xz
      : (absolute.x > 0.5 ? vLocal.zy : vLocal.xy);
    float distanceToEdge = min(0.5 - abs(face.x), 0.5 - abs(face.y));
    float edge = 1.0 - smoothstep(0.0, 0.04, distanceToEdge);
    color = mix(color, uGrid, edge * 0.28);
  } else if (vKind > 0.5) {
    // Las carpetas se leen como contenedores: sus aristas marcan el volumen.
    vec3 absolute = abs(normal);
    vec2 face = absolute.y > 0.5
      ? vLocal.xz
      : (absolute.x > 0.5 ? vLocal.zy : vLocal.xy);
    float distanceToEdge = min(0.5 - abs(face.x), 0.5 - abs(face.y));
    float edge = 1.0 - smoothstep(0.0, 0.05, distanceToEdge);
    color = mix(color, uEdge, edge * 0.82);
  } else {
    // Las hojas tienen un borde fino para no perderse sobre el fondo.
    vec3 absolute = abs(normal);
    vec2 face = absolute.y > 0.5
      ? vLocal.xz
      : (absolute.x > 0.5 ? vLocal.zy : vLocal.xy);
    float distanceToEdge = min(0.5 - abs(face.x), 0.5 - abs(face.y));
    float edge = 1.0 - smoothstep(0.0, 0.035, distanceToEdge);
    color = mix(color, uEdge, edge * 0.38);
  }

  float fog = smoothstep(uFogNear, uFogFar, vDepth);
  outColor = vec4(mix(color, uFog, fog * 0.75), 1.0);
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
  box: AtlasBox,
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
  kind: 0 | 1 | 2 | 3;
}

export function kindOf(role: AtlasRole): 0 | 1 | 2 | 3 {
  if (role === "folder") return 1;
  if (role === "floor") return 2;
  if (role === "furniture" || role === "beam") return 3;
  return 0;
}

export function instanceLayout(
  box: AtlasBox,
  selected: string | null
): InstanceLayout {
  const height = Math.max(0.05, box.height);
  return {
    x: box.x,
    y: box.y + height / 2,
    z: box.z,
    width: Math.max(0.05, box.width),
    height,
    depth: Math.max(0.05, box.depth),
    color: colorOf(box, selected),
    kind: kindOf(box.role)
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
      flyTo: (_path, _duration, onDone) => onDone(),
      dispose: () => undefined
    };
  }

  const room = options.room;
  const fov = (FOV * Math.PI) / 180;
  const aspect = (canvas.clientWidth || 1) / (canvas.clientHeight || 1);
  const fit = Math.max(
    room.depth * 1.1,
    room.width * 1.15,
    room.radius * 1.3,
    // La viga y su letrero viven por encima de las estanterías: el encuadre
    // deja aire suficiente para que se lean también en salas altas.
    (room.height - room.target.y + 6) / Math.tan(fov / 2),
    24
  );
  const target: Point = room.target;
  const near = Math.max(1, fit * 0.01);
  const far = fit * 5 + 2000;
  const background = parseColor(options.background, [0.93, 0.94, 0.95]);
  const edge = parseColor(EDGE_COLOR);
  const grid = parseColor(GRID_COLOR);
  const labelCanvas = options.labelCanvas ?? null;
  const labels = labelCanvas?.getContext("2d") ?? null;
  const labelText = options.labelTextColor ?? "#1d232a";
  const labelBackground = options.labelBackground ?? "#ffffff";

  const capacity = Math.max(1, room.boxes.length);
  const data = new Float32Array(capacity * STRIDE);

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
    roomHeight: WebGLUniformLocation | null;
  } = {
    view: null,
    projection: null,
    light: null,
    fill: null,
    fog: null,
    edge: null,
    grid: null,
    fogNear: null,
    fogFar: null,
    roomHeight: null
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
        fogFar: gl.getUniformLocation(program, "uFogFar"),
        roomHeight: gl.getUniformLocation(program, "uRoomHeight")
      };

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);
      gl.clearColor(background[0], background[1], background[2], 1);
      return true;
    } catch {
      return false;
    }
  };

  let visible: AtlasBox[] = room.boxes;
  let selected = options.selected;
  let instanceCount = 0;
  let flight: {
    fromTarget: Point;
    toTarget: Point;
    fromDistance: number;
    toDistance: number;
    start: number;
    duration: number;
    onDone: () => void;
  } | null = null;
  let disposed = false;
  let ready = false;
  let lost = false;
  let frame = 0;
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
      const index = pickBox(ray, visible.filter((box) => box.selectable));
      if (index === null) return;
      const box = visible.filter((box) => box.selectable)[index];
      if (!box) return;
      if (box.role === "folder") options.onFocus?.(box.path ?? "");
      else if (box.role === "file") options.onSelect(box.path ?? "");
    },
    // La cámara mira de frente desde delante de la sala; las estanterías
    // quedan en las paredes laterales y los contenedores en el centro.
    start: { azimuth: Math.PI, polar: 1.38, distance: fit },
    target,
    onChange: () => requestRender(),
    limits: {
      ...ORBIT_LIMITS,
      minPolar: 1.02,
      maxPolar: 1.55,
      minDistance: Math.max(8, fit * 0.04),
      maxDistance: Math.max(ORBIT_LIMITS.maxDistance, fit * 2.2)
    }
  });

  const focusFor = (
    path: string | null
  ): { target: Point; distance: number } => {
    if (!path) return { target, distance: fit };
    const box = room.boxes.find(
      (item) => item.role === "folder" && item.path === path
    );
    if (!box) return { target, distance: fit };
    const radius = Math.max(
      6,
      Math.hypot(box.width, box.depth, box.height) / 2
    );
    return {
      target: {
        x: box.x,
        y: box.y + box.height * 0.45,
        z: box.z
      },
      distance: Math.max(8, fitDistance(radius, fov, aspect, 1.45))
    };
  };

  const flyTo = (
    path: string | null,
    duration: number,
    onDone: () => void
  ): void => {
    if (flight || disposed) return;
    const pose = controls.pose();
    const end = focusFor(path);
    const fromDistance = Math.hypot(
      pose.position.x - pose.target.x,
      pose.position.y - pose.target.y,
      pose.position.z - pose.target.z
    );
    if (duration <= 0) {
      controls.setTarget(end.target, end.distance);
      onDone();
      requestRender();
      return;
    }
    flight = {
      fromTarget: pose.target,
      toTarget: end.target,
      fromDistance,
      toDistance: end.distance,
      start: performance.now(),
      duration,
      onDone
    };
    requestRender();
  };

  const writeBox = (slot: number, box: AtlasBox): void => {
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

  const upload = (): void => {
    if (!gl || !buffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, instanceCount * STRIDE);
  };

  const draw = (boxes: AtlasBox[]): void => {
    const count = Math.min(boxes.length, capacity);
    for (let index = 0; index < count; index++) {
      writeBox(index, boxes[index] as AtlasBox);
    }
    visible = boxes.slice(0, count);
    instanceCount = count;
    upload();
    options.onBoxes?.(count);
    options.onContainers?.(
      visible.filter((box) => box.role === "folder").length
    );
    requestRender();
  };

  const repaint = (): void => {
    for (let index = 0; index < visible.length; index++) {
      writeBox(index, visible[index] as AtlasBox);
    }
    upload();
    requestRender();
  };

  function requestRender(): void {
    if (disposed || lost || !ready || frame) return;
    frame = requestAnimationFrame(render);
  }

  const drawLabels = (pose: OrbitPose): void => {
    if (!labelCanvas || !labels) return;
    const width = labelCanvas.clientWidth || 1;
    const height = labelCanvas.clientHeight || 1;
    labels.clearRect(0, 0, width, height);
    if (width < 2 || height < 2) return;
    labels.font = '600 10px "Inter", system-ui, sans-serif';
    labels.textBaseline = "middle";
    const occupied: Array<{ x: number; y: number; w: number; h: number }> =
      [];
    const candidates = visible
      .filter((box) => box.label)
      .map((box) => {
        const point = projectPoint(
          pose.position,
          pose.target,
          fov,
          aspect,
          width,
          height,
          {
            x: box.x,
            y:
              box.y +
              box.height +
              (box.role === "folder" ? 0.8 : 0.35),
            z: box.z
          }
        );
        return { box, point };
      })
      .filter(
        (
          entry
        ): entry is {
          box: AtlasBox;
          point: { x: number; y: number; depth: number };
        } => {
          const point = entry.point;
          if (!point) return false;
          const screenHeight =
            (entry.box.height * height) /
            (2 * Math.max(0.01, point.depth) * Math.tan(fov / 2));
          if (
            entry.box.role === "file" &&
            entry.box.path !== selected &&
            screenHeight < 9
          ) {
            return false;
          }
          return (
            point.x > -80 &&
            point.x < width + 80 &&
            point.y > -20 &&
            point.y < height + 20
          );
        }
      )
      .sort((left, right) => {
        const focus = (box: AtlasBox): number =>
          box.role === "beam"
            ? -2
            : box.path === selected
              ? -1
              : box.role === "folder"
                ? 0
                : 1;
        const leftFocus = focus(left.box);
        const rightFocus = focus(right.box);
        return leftFocus - rightFocus || left.point.depth - right.point.depth;
      })
      .slice(0, MAX_LABELS);

    for (const { box, point } of candidates) {
      const text =
        (box.label as string).length > 28
          ? `${(box.label as string).slice(0, 27)}…`
          : (box.label as string);
      const textWidth = labels.measureText(text).width;
      const rect = {
        x: point.x - textWidth / 2 - 4,
        y: point.y - 7,
        w: textWidth + 8,
        h: 14
      };
      if (
        occupied.some(
          (other) =>
            rect.x < other.x + other.w + 3 &&
            rect.x + rect.w + 3 > other.x &&
            rect.y < other.y + other.h + 2 &&
            rect.y + rect.h + 2 > other.y
        )
      ) {
        continue;
      }
      occupied.push(rect);
      labels.globalAlpha = 0.9;
      labels.fillStyle =
        box.path === selected ? "#2f6fed" : labelBackground;
      labels.fillRect(rect.x, rect.y, rect.w, rect.h);
      labels.globalAlpha = 1;
      labels.fillStyle = box.path === selected ? "#ffffff" : labelText;
      labels.fillText(text, rect.x + 4, rect.y + rect.h / 2 + 0.5);
    }
  };

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
    gl.uniform1f(uniforms.roomHeight, room.height);
    gl.bindVertexArray(vao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, CUBE_VERTICES, instanceCount);
    gl.bindVertexArray(null);
  };

  const render = (): void => {
    frame = 0;
    if (disposed || lost || !gl) return;
    const now = performance.now();
    if (flight) {
      const raw = Math.min(1, (now - flight.start) / flight.duration);
      const t = raw * raw * (3 - 2 * raw);
      controls.setTarget(
        {
          x: flight.fromTarget.x + (flight.toTarget.x - flight.fromTarget.x) * t,
          y: flight.fromTarget.y + (flight.toTarget.y - flight.fromTarget.y) * t,
          z: flight.fromTarget.z + (flight.toTarget.z - flight.fromTarget.z) * t
        },
        flight.fromDistance + (flight.toDistance - flight.fromDistance) * t
      );
      if (raw >= 1) {
        const done = flight.onDone;
        flight = null;
        done();
      }
      requestRender();
    }
    const moved = controls.update();
    const pose = controls.pose();
    if (moved) requestRender();
    paint(pose);
    drawLabels(pose);
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
    if (labelCanvas) {
      labelCanvas.width = Math.max(1, Math.round(width));
      labelCanvas.height = Math.max(1, Math.round(height));
    }
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
    draw(room.boxes);
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
    draw(room.boxes);
  }

  return {
    setSelected(path: string | null): void {
      if (path === selected) return;
      selected = path;
      repaint();
    },
    flyTo,
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
