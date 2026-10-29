import { describe, expect, it } from "vitest";
import { analyzeFiles } from "../src/analyze-core";
import {
  MemoryFileSystem,
  type DirectoryEntry,
  type FileSystem
} from "../src/fs";
import { TypeScriptParser } from "../src/ts/parser";

/**
 * El mapa es del código, no de cómo se lee el disco.
 *
 * Las rondas que parten la app y la pestaña de cambios mueven código entre
 * módulos: aparecen ficheros, cambian los imports y el directorio se enumera en
 * otro orden. Lo que el mapa dice de **ese mismo fuente** no puede moverse ni un
 * byte, o Cambios enseñará cambios que nadie ha hecho (ADR 0076). Este test fija
 * esa propiedad con el checksum: si un refactor mueve el mapa, se ve aquí antes
 * de llegar al PR.
 */

/** Una app partida en módulos, con la forma que dejaron las dos rondas. */
const SOURCES: Array<[string, string]> = [
  [
    "/package.json",
    JSON.stringify({ name: "demo-map", version: "0.0.0" }, null, 2)
  ],
  [
    "/src/app/App.tsx",
    [
      'import { useSession } from "./session";',
      'import WebTopbar from "./WebTopbar";',
      'import ChangesPanel from "../ui/ChangesPanel";',
      "",
      "export function App() {",
      "  useSession();",
      "  return [WebTopbar, ChangesPanel];",
      "}"
    ].join("\n")
  ],
  [
    "/src/app/session.ts",
    [
      'import { fetchJson } from "./http";',
      'import { readProject } from "./storage";',
      "",
      "export function useSession() {",
      "  return { fetchJson, readProject };",
      "}"
    ].join("\n")
  ],
  [
    "/src/app/WebTopbar.tsx",
    [
      'import { OpenMenu } from "../ui/OpenMenu";',
      "",
      "export default function WebTopbar() {",
      "  return OpenMenu;",
      "}"
    ].join("\n")
  ],
  [
    "/src/app/http.ts",
    ['export const fetchJson = async (url: string) => url;'].join("\n")
  ],
  [
    "/src/app/storage.ts",
    ['export const readProject = () => null;'].join("\n")
  ],
  [
    "/src/ui/OpenMenu.tsx",
    [
      "export function OpenMenu() {",
      "  return null;",
      "}"
    ].join("\n")
  ],
  [
    "/src/ui/ChangesPanel.tsx",
    [
      'import { FilesSection } from "./changes/sections";',
      'import { CollapsibleSection } from "./CollapsibleSection";',
      "",
      "export default function ChangesPanel() {",
      "  return [FilesSection, CollapsibleSection];",
      "}"
    ].join("\n")
  ],
  [
    "/src/ui/CollapsibleSection.tsx",
    [
      "export function CollapsibleSection() {",
      "  return null;",
      "}"
    ].join("\n")
  ],
  [
    "/src/ui/changes/sections.tsx",
    [
      'import { reportHasChanges } from "./summary";',
      'import { CollapsibleSection } from "../CollapsibleSection";',
      "",
      "export function FilesSection() {",
      "  return [reportHasChanges, CollapsibleSection];",
      "}"
    ].join("\n")
  ],
  [
    "/src/ui/changes/summary.ts",
    [
      "export function reportHasChanges(count: number): boolean {",
      "  if (count > 0) return true;",
      "  return false;",
      "}"
    ].join("\n")
  ]
];

/** Un puerto que enumera los directorios al revés, como un disco cualquiera. */
class ReverseFileSystem implements FileSystem {
  readonly caseSensitive = true;
  private readonly inner: MemoryFileSystem;

  constructor(files: Array<[string, string]>) {
    this.inner = new MemoryFileSystem(files);
  }

  readFile(path: string): string {
    return this.inner.readFile(path);
  }

  tryReadFile(path: string): string | null {
    return this.inner.tryReadFile(path);
  }

  exists(path: string): boolean {
    return this.inner.exists(path);
  }

  readDirectory(path: string): DirectoryEntry[] {
    return this.inner.readDirectory(path).reverse();
  }
}

function analyze(fileSystem: FileSystem) {
  return analyzeFiles({
    fileSystem,
    root: "/",
    parsers: [new TypeScriptParser()]
  }).snapshot;
}

describe("el mapa no depende del disco", () => {
  it("el mismo fuente da el mismo mapa, dos veces seguidas", () => {
    const first = analyze(new MemoryFileSystem(SOURCES));
    const second = analyze(new MemoryFileSystem(SOURCES));

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(second.meta.checksum).toBe(first.meta.checksum);
  });

  it("enumerar el directorio al revés no mueve el mapa", () => {
    const ordered = analyze(new MemoryFileSystem(SOURCES));
    const reversed = analyze(new ReverseFileSystem(SOURCES));

    // Byte a byte: el orden de lectura no puede colarse ni en los nodos ni en
    // las aristas, y el checksum es lo que la cabecera y Cambios comparan.
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(ordered));
    expect(reversed.meta.checksum).toBe(ordered.meta.checksum);
  });

  it("el checksum del mapa está fijado", () => {
    // Si un refactor cambia el mapa de este mismo código, salta aquí. Cuando el
    // cambio sea legítimo —otro fuente, no otra forma de leerlo—, se actualiza
    // este valor a mano y se dice en el commit.
    expect(analyze(new MemoryFileSystem(SOURCES)).meta.checksum).toBe(
      "4a8014762327181c50fdc566ab92d4a4"
    );
  });
});
