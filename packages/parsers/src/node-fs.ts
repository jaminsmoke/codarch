import fs from "node:fs";
import path from "node:path";
import type { DirectoryEntry, FileSystem } from "./fs";

/**
 * Puerto de sistema de ficheros sobre `node:fs`.
 *
 * Traduce las rutas virtuales (`/src/app.ts`) a rutas del disco. Solo el CLI
 * usa esta implementación; el navegador usa el fichero en memoria.
 */
export class NodeFileSystem implements FileSystem {
  readonly caseSensitive = process.platform !== "win32";

  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  readFile(target: string): string {
    return fs.readFileSync(this.native(target), "utf8");
  }

  tryReadFile(target: string): string | null {
    try {
      return fs.readFileSync(this.native(target), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
      return null;
    }
  }

  readDirectory(target: string): DirectoryEntry[] {
    const entries = fs.readdirSync(this.native(target), { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile()
    }));
  }

  exists(target: string): boolean {
    return fs.existsSync(this.native(target));
  }

  /** Ruta real en disco de una ruta virtual. */
  native(target: string): string {
    const relative = target.replace(/^\/+/, "");
    return relative === "" ? this.root : path.join(this.root, relative);
  }
}
