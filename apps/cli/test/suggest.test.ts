import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CC_JSON_VERSION,
  fileId,
  folderId,
  type CcJson,
  type CcNode
} from "@codarch/schema";
import { runSuggest } from "../src/commands/suggest";

const tempRoots: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function snapshot(
  files: readonly string[],
  edges: readonly (readonly [string, string])[]
): CcJson {
  const root: CcNode = {
    id: folderId(""),
    name: "proyecto",
    type: "Folder",
    children: []
  };
  const folders = new Map<string, CcNode>([["", root]]);

  for (const filePath of files) {
    const parts = filePath.split("/");
    const leaf = parts.pop() as string;
    let parent = root;
    let parentPath = "";
    for (const part of parts) {
      const folderPath = parentPath ? `${parentPath}/${part}` : part;
      let folder = folders.get(folderPath);
      if (!folder) {
        folder = {
          id: folderId(folderPath),
          name: part,
          type: "Folder",
          children: []
        };
        folders.set(folderPath, folder);
        parent.children?.push(folder);
      }
      parent = folder;
      parentPath = folderPath;
    }
    parent.children?.push({ id: fileId(filePath), name: leaf, type: "File" });
  }

  return {
    meta: {
      projectName: "proyecto",
      apiVersion: CC_JSON_VERSION,
      checksum: "x"
    },
    files: [root],
    lenses: {
      metrics: { attributes: {} },
      dependency: {
        edges: edges.map(([from, to]) => ({
          fromId: fileId(from),
          toId: fileId(to)
        }))
      }
    }
  };
}

/** Escribe el snapshot en un temporal y devuelve su ruta. */
function writeSnapshot(cc: CcJson): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-suggest-cli-"));
  tempRoots.push(root);
  const file = path.join(root, "mapa.cc.json");
  fs.writeFileSync(file, JSON.stringify(cc));
  return file;
}

/** Lo que imprime el comando, con `console.log` capturado. */
function printed(run: () => number): string {
  const lines: string[] = [];
  vi.spyOn(console, "log").mockImplementation((line: unknown) => {
    lines.push(String(line));
  });
  expect(run()).toBe(0);
  return lines.join("\n");
}

describe("suggest", () => {
  // Cada capa tiene un fichero y las aristas cruzan de una a otra: el tamaño
  // que se enseña es el de los ficheros, no el de las dependencias.
  const cc = snapshot(
    ["src/domain/user.ts", "src/infra/db.ts", "index.ts"],
    [
      ["src/infra/db.ts", "src/domain/user.ts"],
      ["index.ts", "src/domain/user.ts"]
    ]
  );

  it("dice los ficheros de cada capa en singular cuando hay uno", () => {
    const text = printed(() =>
      runSuggest({ file: writeSnapshot(cc), json: false })
    );

    expect(text).toContain("src/domain · 1 fichero · nivel 0");
    expect(text).toContain("src/infra · 1 fichero · nivel 1");
    expect(text).not.toContain("1 ficheros");
    // El punto de entrada tampoco se cuenta dos veces por la arista.
    expect(text).toContain("1 fichero en la raíz");
  });

  it("lleva los mismos recuentos al JSON", () => {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: unknown) => {
      lines.push(String(line));
    });

    expect(runSuggest({ file: writeSnapshot(cc), json: true })).toBe(0);

    const parsed = JSON.parse(lines.join("\n")) as {
      detected: Array<{ name: string; files: number }>;
      ungrouped: number;
    };
    expect(
      parsed.detected.map((layer) => [layer.name, layer.files])
    ).toEqual([
      ["src/domain", 1],
      ["src/infra", 1]
    ]);
    expect(parsed.ungrouped).toBe(1);
  });
});
