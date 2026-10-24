import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Qué carpetas no se analizan (ADR 0052).
 *
 * CodArch mira siempre hacia abajo desde la carpeta elegida y nunca hacia
 * arriba. Además se niega a analizar el sistema de ficheros: la raíz de un
 * volumen, las carpetas del sistema operativo y la carpeta personal entera.
 * La comprobación resuelve la ruta real solo para decidir; no cambia la raíz
 * que se analiza ni la que se vigila.
 */

export interface RootGuardOptions {
  /** Para probar Windows, Linux y macOS desde cualquier máquina. */
  platform?: NodeJS.Platform;
  /** La carpeta personal del usuario, que tampoco se analiza entera. */
  home?: string;
  /** Rutas protegidas extra (pruebas o instalaciones raras). */
  protectedPaths?: string[];
  /** El entorno del que salen las rutas del sistema en Windows. */
  env?: NodeJS.ProcessEnv;
}

const UNIX_PROTECTED = [
  "/bin",
  "/boot",
  "/dev",
  "/etc",
  "/lib",
  "/lib64",
  "/proc",
  "/root",
  "/run",
  "/sbin",
  "/sys",
  "/usr",
  "/var"
];

const MAC_PROTECTED = [
  ...UNIX_PROTECTED,
  "/Library",
  "/System",
  "/private",
  "/Applications"
];

const WINDOWS_PROTECTED = [
  "C:\\Windows",
  "C:\\Program Files",
  "C:\\Program Files (x86)",
  "C:\\ProgramData",
  "C:\\PerfLogs",
  "C:\\Recovery",
  "C:\\System Volume Information",
  "C:\\$Recycle.Bin"
];

function protegidas(platform: NodeJS.Platform, env: NodeJS.ProcessEnv): string[] {
  if (platform === "win32") {
    const extra = [
      env.SystemRoot,
      env.windir,
      env.ProgramFiles,
      env["ProgramFiles(x86)"],
      env.ProgramData
    ].filter((value): value is string => typeof value === "string" && value !== "");
    return [...WINDOWS_PROTECTED, ...extra];
  }
  return platform === "darwin" ? MAC_PROTECTED : UNIX_PROTECTED;
}

/** La forma de la plataforma, aunque estemos ejecutando en otra. */
function plataforma(platform: NodeJS.Platform): typeof path.win32 | typeof path.posix {
  return platform === "win32" ? path.win32 : path.posix;
}

function comparable(value: string, platform: NodeJS.Platform): string {
  const resolved = plataforma(platform).resolve(value);
  return platform === "win32" ? resolved.toLowerCase() : resolved;
}

function dentro(root: string, base: string, platform: NodeJS.Platform): boolean {
  const separator = plataforma(platform).sep;
  const prefix = base.endsWith(separator) ? base : `${base}${separator}`;
  return root === base || root.startsWith(prefix);
}

/** La ruta real si se puede leer; si no, la que nos dieron. */
function real(value: string): string {
  try {
    return fs.realpathSync.native(value);
  } catch {
    return value;
  }
}

/**
 * El motivo por el que una carpeta no se analiza, o `null` si se puede.
 *
 * El texto es para enseñarlo tal cual al usuario.
 */
export function protectedRootReason(
  root: string,
  options: RootGuardOptions = {}
): string | null {
  const platform = options.platform ?? process.platform;
  const candidate = comparable(
    platform === process.platform ? real(root) : root,
    platform
  );
  const p = plataforma(platform);

  if (candidate === comparable(p.parse(candidate).root, platform)) {
    return "la raíz del sistema de ficheros";
  }

  const home = comparable(
    platform === process.platform ? real(options.home ?? os.homedir()) : (options.home ?? os.homedir()),
    platform
  );
  if (candidate === home) {
    return "tu carpeta personal entera";
  }

  const bases = [
    ...protegidas(platform, options.env ?? process.env),
    ...(options.protectedPaths ?? [])
  ];
  for (const base of bases) {
    const normalized = comparable(base, platform);
    if (dentro(candidate, normalized, platform)) return base;
  }

  return null;
}
