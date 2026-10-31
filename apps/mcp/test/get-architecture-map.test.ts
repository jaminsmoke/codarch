import { describe, expect, it } from "vitest";
import { McpDataError } from "../src/store";
import { getArchitectureMap } from "../src/tools";
import { makeStore } from "./fixtures";
import { flatten } from "./helpers";

describe("getArchitectureMap", () => {
  it("resume la raíz con tamaño, complejidad y riesgo", () => {
    const result = getArchitectureMap(makeStore());
    expect(result.projectName).toBe("Acme");
    expect(result.scope).toBe("");
    expect(result.root.files).toBe(5);
    expect(result.root.metrics.size).toBe(250);
    expect(result.root.metrics.maxComplexity).toBe(20);
    expect(result.root.metrics.risk).toBe(1);
    expect(result.root.children?.map((node) => node.path)).toEqual([
      "src",
      "index.ts"
    ]);
  });

  it("limita profundidad, hijos y ficheros", () => {
    const store = makeStore();
    const shallow = getArchitectureMap(store, { depth: 1 });
    const src = shallow.root.children?.find((node) => node.path === "src");
    expect(src?.children).toBeUndefined();
    expect(src?.truncated).toBe(4);

    const one = getArchitectureMap(store, { limit: 1 });
    expect(one.root.children).toHaveLength(1);
    expect(one.root.truncated).toBe(1);

    const folders = getArchitectureMap(store, { includeFiles: false });
    expect(flatten(folders.root).some((node) => node.kind === "file")).toBe(
      false
    );
  });

  it("acota a una carpeta y acepta el nombre de la raíz", () => {
    const store = makeStore();
    const result = getArchitectureMap(store, {
      folder: "acme/src/domain",
      depth: 1
    });
    expect(result.scope).toBe("src/domain");
    expect(result.root.files).toBe(1);
    expect(result.root.children?.map((node) => node.path)).toEqual([
      "src/domain/c.ts"
    ]);
  });

  it("rechaza un fichero como carpeta", () => {
    expect(() =>
      getArchitectureMap(makeStore(), { folder: "src/a.ts" })
    ).toThrow(McpDataError);
  });
});
