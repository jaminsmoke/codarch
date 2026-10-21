/**
 * Puerto de sistema de ficheros.
 *
 * El análisis no toca el disco: habla con rutas virtuales (`/src/app.ts`) a
 * través de esta interfaz. El CLI implementa el puerto sobre `node:fs` y el
 * navegador sobre los ficheros que el usuario elige con File System Access
 * API. Por eso los dos dan el mismo grafo.
 */

export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

export interface FileSystem {
  /**
   * ¿El sistema de ficheros distingue mayúsculas?
   *
   * En Windows no, y el resolutor de imports lo tiene en cuenta para que
   * `./Foo` encuentre `foo.ts`. El navegador emula la misma regla.
   */
  readonly caseSensitive: boolean;
  /** Lee un fichero. Lanza si no existe o no se puede leer. */
  readFile(path: string): string;
  /** Lee un fichero o devuelve `null` si no existe. */
  tryReadFile(path: string): string | null;
  /** Lista el contenido de un directorio. Lanza si no existe. */
  readDirectory(path: string): DirectoryEntry[];
  /** ¿Existe esta ruta? */
  exists(path: string): boolean;
}

/** Ruta del directorio de un fichero virtual. */
export function directoryOf(path: string): string {
  const index = path.lastIndexOf("/");
  if (index <= 0) return "/";
  return path.slice(0, index);
}

/**
 * Sistema de ficheros en memoria.
 *
 * Guarda los ficheros por ruta virtual. Es lo que usa el navegador con los
 * ficheros que el usuario selecciona, y lo que permite probar el análisis sin
 * tocar el disco.
 */
export class MemoryFileSystem implements FileSystem {
  readonly caseSensitive: boolean;

  private readonly files: Map<string, string>;

  constructor(
    files: Iterable<readonly [string, string]> = [],
    caseSensitive = true
  ) {
    this.files = new Map();
    this.caseSensitive = caseSensitive;
    for (const [path, content] of files) this.files.set(path, content);
  }

  readFile(path: string): string {
    const content = this.tryReadFile(path);
    if (content === null) throw new Error(`no existe el fichero: ${path}`);
    return content;
  }

  tryReadFile(path: string): string | null {
    return this.files.get(path) ?? null;
  }

  readDirectory(path: string): DirectoryEntry[] {
    const prefix = path === "/" ? "/" : `${path}/`;
    const entries = new Map<string, DirectoryEntry>();
    for (const filePath of this.files.keys()) {
      if (!filePath.startsWith(prefix)) continue;
      const rest = filePath.slice(prefix.length);
      if (rest === "") continue;
      const slash = rest.indexOf("/");
      if (slash === -1) {
        entries.set(rest, { name: rest, isDirectory: false, isFile: true });
        continue;
      }
      const name = rest.slice(0, slash);
      entries.set(name, { name, isDirectory: true, isFile: false });
    }
    return [...entries.values()].sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    );
  }

  exists(path: string): boolean {
    if (this.files.has(path)) return true;
    const prefix = path === "/" ? "/" : `${path}/`;
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) return true;
    }
    return false;
  }

  /** Añade o sustituye un fichero. */
  set(path: string, content: string): void {
    this.files.set(path, content);
  }

  /** Rutas de todos los ficheros. */
  paths(): string[] {
    return [...this.files.keys()].sort();
  }

  /** Rutas y contenido de todos los ficheros. */
  entries(): Array<[string, string]> {
    return [...this.files.entries()].sort((left, right) =>
      left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0
    );
  }
}
