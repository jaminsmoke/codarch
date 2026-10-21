import { describe, expect, it } from "vitest";
import { fileId, folderId, parseCcJson, type CcJson, type CcNode } from "@codarch/schema";
import { suggestLayers } from "../src/index";

/**
 * El generador describe la arquitectura que el código ya tiene: agrupa por
 * carpeta y deduce qué va hacia dentro y qué hacia fuera.
 */

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

  for (const path of files) {
    const parts = path.split("/");
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
    parent.children?.push({ id: fileId(path), name: leaf, type: "File" });
  }

  return parseCcJson({
    meta: { projectName: "proyecto", apiVersion: "2.0", checksum: "x" },
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
  });
}

describe("suggestLayers", () => {
  it("agrupa por carpeta y ordena por dependencia", () => {
    const cc = snapshot(
      [
        "src/domain/user.ts",
        "src/application/use-case.ts",
        "src/infra/db.ts",
        "src/index.ts"
      ],
      [
        ["src/application/use-case.ts", "src/domain/user.ts"],
        ["src/infra/db.ts", "src/domain/user.ts"]
      ]
    );

    const suggestion = suggestLayers(cc);

    expect(suggestion.layers.map((layer) => layer.name)).toEqual([
      "src/domain",
      "src/application",
      "src/infra"
    ]);
    // El dominio es el más interior: nadie depende hacia fuera desde él.
    expect(suggestion.layers[0]?.depth).toBe(0);
    expect(suggestion.layers[0]?.usedBy).toEqual([
      "src/application",
      "src/infra"
    ]);
    expect(suggestion.layers[1]?.dependsOn).toEqual(["src/domain"]);
  });

  it("propone la regla que protege la capa interior", () => {
    const cc = snapshot(
      ["src/domain/user.ts", "src/infra/db.ts"],
      [["src/infra/db.ts", "src/domain/user.ts"]]
    );

    const suggestion = suggestLayers(cc);

    // La infra depende del dominio: la regla protege al dominio de la infra.
    expect(suggestion.rules).toHaveLength(1);
    expect(suggestion.rules[0]).toMatchObject({
      name: "src-domain-sin-src-infra",
      type: "forbidden",
      from: "src/domain",
      to: "src/infra",
      severity: "warn"
    });
  });

  it("no cuenta los ficheros sueltos de la raíz como capa", () => {
    const cc = snapshot(["src/domain/user.ts", "index.ts"], []);
    const suggestion = suggestLayers(cc);

    expect(suggestion.layers.map((layer) => layer.name)).toEqual(["src/domain"]);
    expect(suggestion.ungrouped).toBe(1);
    expect(suggestion.notes.join(" ")).toContain("raíz");
  });

  it("avisa cuando no hay estructura que deducir", () => {
    const cc = snapshot(["src/only/one.ts"], []);
    const suggestion = suggestLayers(cc);

    expect(suggestion.layers).toHaveLength(1);
    expect(suggestion.rules).toHaveLength(0);
    expect(suggestion.notes.join(" ")).toContain("perfil del catálogo");
  });

  it("aguanta un ciclo sin colgarse", () => {
    const cc = snapshot(
      ["src/a/x.ts", "src/b/y.ts"],
      [
        ["src/a/x.ts", "src/b/y.ts"],
        ["src/b/y.ts", "src/a/x.ts"]
      ]
    );

    const suggestion = suggestLayers(cc);
    expect(suggestion.layers).toHaveLength(2);
  });
});
