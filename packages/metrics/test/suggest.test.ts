import { describe, expect, it } from "vitest";
import {
  CC_JSON_VERSION,
  fileId,
  folderId,
  parseCcJson,
  type CcJson,
  type CcNode
} from "@codarch/schema";
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
    meta: { projectName: "proyecto", apiVersion: CC_JSON_VERSION, checksum: "x" },
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

    expect(suggestion.detected.map((layer) => layer.name)).toEqual([
      "src/domain",
      "src/application",
      "src/infra"
    ]);
    // El dominio es el más interior: nadie depende hacia fuera desde él.
    expect(suggestion.detected[0]?.depth).toBe(0);
    expect(suggestion.detected[0]?.usedBy).toEqual([
      "src/application",
      "src/infra"
    ]);
    expect(suggestion.detected[1]?.dependsOn).toEqual(["src/domain"]);
  });

  it("propone la regla que protege la capa interior", () => {
    const cc = snapshot(
      ["src/domain/user.ts", "src/infra/db.ts"],
      [["src/infra/db.ts", "src/domain/user.ts"]]
    );

    const suggestion = suggestLayers(cc);

    // La infra depende del dominio: la regla protege al dominio de la infra.
    const regla = suggestion.rules.find(
      (rule) => rule.name === "dominio-sin-infraestructura"
    );
    expect(regla).toMatchObject({
      type: "forbidden",
      from: "domain",
      to: "infrastructure",
      severity: "warn"
    });
  });

  it("encaja con el perfil del catálogo y avisa de lo que ya se incumple", () => {
    // El dominio depende de la infra: rompe la convención de "capas".
    const cc = snapshot(
      ["src/domain/user.ts", "src/infra/db.ts"],
      [["src/domain/user.ts", "src/infra/db.ts"]]
    );

    const suggestion = suggestLayers(cc);

    const capas = suggestion.fits.find((fit) => fit.id === "capas");
    expect(capas?.matched).toBe(2);
    expect(capas?.coverage).toBe(100);
    expect(capas?.broken).toHaveLength(1);

    // La propuesta usa el perfil: su convención manda, no lo que hace el código.
    expect(suggestion.proposal).toBe("profile");
    expect(suggestion.profile).toBe("capas");
    expect(suggestion.layers.map((layer) => layer.name)).toEqual([
      "domain",
      "application",
      "infrastructure"
    ]);
    expect(
      suggestion.rules.find((rule) => rule.name === "dominio-sin-infraestructura")
    ).toMatchObject({ from: "domain", to: "infrastructure" });
  });

  it("deduce las reglas cuando ningún perfil encaja", () => {
    const cc = snapshot(
      ["libro/pedido.ts", "facturacion/cobro.ts"],
      [["facturacion/cobro.ts", "libro/pedido.ts"]]
    );

    const suggestion = suggestLayers(cc);

    expect(suggestion.proposal).toBe("deduced");
    expect(suggestion.profile).toBeNull();
    expect(suggestion.layers.map((layer) => layer.name)).toEqual([
      "libro",
      "facturacion"
    ]);
    expect(suggestion.rules[0]?.from).toBe("libro");
    expect(suggestion.rules[0]?.to).toBe("facturacion");
  });

  it("no cuenta los ficheros sueltos de la raíz como capa", () => {
    const cc = snapshot(["src/domain/user.ts", "index.ts"], []);
    const suggestion = suggestLayers(cc);

    expect(suggestion.detected.map((layer) => layer.name)).toEqual([
      "src/domain"
    ]);
    expect(suggestion.ungrouped).toBe(1);
    expect(suggestion.notes.join(" ")).toContain("raíz");
  });

  it("avisa cuando no hay estructura que deducir", () => {
    const cc = snapshot(["src/only/one.ts"], []);
    const suggestion = suggestLayers(cc);

    expect(suggestion.detected).toHaveLength(1);
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
    expect(suggestion.detected).toHaveLength(2);
  });
});
