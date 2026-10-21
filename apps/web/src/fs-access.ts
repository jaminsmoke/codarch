/**
 * Tipos del File System Access API.
 *
 * La API todavía no está en las librerías de TypeScript, así que se declara la
 * parte que se usa. `repository.ts` ya usaba selectores de carpetas: esto
 * completa el conjunto para leer un repo entero.
 */

export interface FileHandleLike {
  getFile(): Promise<File>;
  readonly kind: "file";
  readonly name: string;
}

export interface DirectoryHandleLike {
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<DirectoryHandleLike>;
  getFileHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<FileHandleLike>;
  entries(): AsyncIterableIterator<[string, FileHandleLike | DirectoryHandleLike]>;
  readonly kind: "directory";
  readonly name: string;
}

export type DirectoryPicker = (options?: {
  mode?: "read" | "readwrite";
}) => Promise<DirectoryHandleLike>;

export type WindowWithDirectoryPicker = Window & {
  showDirectoryPicker?: DirectoryPicker;
};

/** Selector de carpetas del navegador, si existe. */
export function directoryPicker(): DirectoryPicker | null {
  const picker = (window as WindowWithDirectoryPicker).showDirectoryPicker;
  return picker ?? null;
}
