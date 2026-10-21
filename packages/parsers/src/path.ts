/**
 * Rutas virtuales POSIX.
 *
 * El análisis habla siempre con rutas absolutas virtuales: la raíz es `/` y
 * todo lo demás cuelga de ella (`/src/app/main.ts`). Así el CLI y el
 * navegador ven exactamente las mismas rutas, sin depender de cómo se llamen
 * las carpetas en el disco del usuario.
 *
 * Son las operaciones que necesita el pipeline, con la semántica de `path` de
 * Node para rutas POSIX.
 */

/**
 * Une segmentos y normaliza la ruta (elimina `.`, resuelve `..`).
 *
 * Como `path.join` de Node: no reinicia con un segmento absoluto.
 */
export function join(...segments: string[]): string {
  const parts: string[] = [];
  for (const segment of segments) {
    if (!segment) continue;
    for (const piece of segment.split("/")) {
      if (piece === "" || piece === ".") continue;
      if (piece === "..") {
        parts.pop();
        continue;
      }
      parts.push(piece);
    }
  }
  return `/${parts.join("/")}`;
}

/**
 * Resuelve segmentos contra la raíz virtual.
 *
 * Como `path.resolve` de Node: un segmento absoluto reinicia el resultado.
 */
export function resolve(...segments: string[]): string {
  let resolved = "";
  let absolute = false;
  for (let index = segments.length - 1; index >= 0 && !absolute; index -= 1) {
    const segment = segments[index] as string;
    if (!segment) continue;
    resolved = resolved === "" ? segment : `${segment}/${resolved}`;
    absolute = segment.startsWith("/");
  }
  if (!absolute) resolved = `/${resolved}`;
  return join(resolved);
}

/** directorio de una ruta. */
export function dirname(target: string): string {
  const normalized = target.replace(/\/+$/, "");
  const index = normalized.lastIndexOf("/");
  if (index <= 0) return "/";
  return normalized.slice(0, index);
}

/** último segmento de una ruta. */
export function basename(target: string): string {
  const normalized = target.replace(/\/+$/, "");
  const index = normalized.lastIndexOf("/");
  return index === -1 ? normalized : normalized.slice(index + 1);
}

/** extensión de una ruta, con el punto. */
export function extname(target: string): string {
  const name = basename(target);
  const index = name.lastIndexOf(".");
  if (index <= 0) return "";
  return name.slice(index);
}

/** Ruta de `target` relativa a `from`. */
export function relative(from: string, target: string): string {
  const fromParts = from.split("/").filter(Boolean);
  const targetParts = target.split("/").filter(Boolean);
  let common = 0;
  while (
    common < fromParts.length &&
    common < targetParts.length &&
    fromParts[common] === targetParts[common]
  ) {
    common += 1;
  }
  const up = fromParts.length - common;
  const down = targetParts.slice(common);
  const parts = [...Array.from({ length: up }, () => ".."), ...down];
  return parts.join("/");
}

/** ¿La ruta es absoluta? */
export function isAbsolute(target: string): boolean {
  return target.startsWith("/");
}

/** Normaliza separadores duplicados y quita la barra final. */
export function normalize(target: string): string {
  const parts = target.split("/").filter(Boolean);
  return parts.length === 0 ? "/" : `/${parts.join("/")}`;
}
