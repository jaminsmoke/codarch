import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createServer } from "../src/server";
import { McpDataError } from "../src/store";
import {
  checkChangeImpact,
  explainModule,
  findHotspots,
  getArchitectureMap,
  listViolations,
  type MapNode
} from "../src/tools";
import { makeStore } from "./fixtures";

function flatten(node: MapNode, output: MapNode[] = []): MapNode[] {
  output.push(node);
  for (const child of node.children ?? []) flatten(child, output);
  return output;
}

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

describe("findHotspots", () => {
  it("ordena por riesgo y por una métrica del snapshot", () => {
    const store = makeStore();
    const risk = findHotspots(store, { limit: 10 });
    expect(risk.scope).toBe("snapshot");
    expect(risk.metric).toBe("risk");
    expect(risk.total).toBe(5);
    expect(risk.hotspots[0]?.risk).toBe(1);
    expect(risk.hotspots.every((entry, index) => {
      const previous = risk.hotspots[index - 1];
      return !previous || previous.value >= entry.value;
    })).toBe(true);

    const complexity = findHotspots(store, { metric: "maxComplexity" });
    expect(complexity.hotspots[0]?.path).toBe("src/domain/c.ts");
    expect(complexity.hotspots[0]?.value).toBe(20);
  });

  it("filtra por carpeta y lee los hotspots del diff", () => {
    const store = makeStore();
    const folder = findHotspots(store, {
      metric: "maxComplexity",
      folder: "src/domain"
    });
    expect(folder.total).toBe(1);

    const diff = findHotspots(store, { scope: "diff" });
    expect(diff.metric).toBe("maxComplexity");
    expect(diff.hotspots[0]?.path).toBe("src/domain/c.ts");
    expect(diff.hotspots[0]?.delta).toBe(8);
  });

  it("declara cuando falta el reporte y valida la métrica", () => {
    const withoutReport = makeStore(null);
    const diff = findHotspots(withoutReport, { scope: "diff" });
    expect(diff.available).toBe(false);
    expect(diff.reason).toContain("report.json");

    expect(() => findHotspots(makeStore(), { metric: "nope" })).toThrow(
      McpDataError
    );
  });
});

describe("checkChangeImpact", () => {
  it("calcula dependientes transitivos y el ciclo", () => {
    const result = checkChangeImpact(makeStore(), {
      path: "src/domain/c.ts",
      depth: 2
    });
    expect(result.start.kind).toBe("file");
    expect(result.impacted.map((entry) => entry.path)).toEqual([
      "src/b.ts",
      "src/infra/d.ts",
      "src/a.ts"
    ]);
    expect(result.cycle).toEqual({ inCycle: true, size: 3 });
    expect(result.summary.transitive).toBe(3);
    expect(result.summary.truncated).toBe(0);
    expect(result.diff.available).toBe(true);
    expect(
      result.diff.changes?.some(
        (entry) => entry.path === "src/domain/c.ts" && entry.status === "changed"
      )
    ).toBe(true);
    expect(result.violations).toHaveLength(2);
  });

  it("calcula dependencias y ambas direcciones", () => {
    const dependencies = checkChangeImpact(makeStore(), {
      path: "src/domain/c.ts",
      direction: "dependencies",
      depth: 2
    });
    expect(dependencies.impacted.map((entry) => entry.path)).toEqual([
      "src/a.ts",
      "src/b.ts"
    ]);

    const both = checkChangeImpact(makeStore(), {
      path: "src/domain/c.ts",
      direction: "both",
      depth: 2
    });
    const a = both.impacted.find((entry) => entry.path === "src/a.ts");
    expect(a?.directions).toEqual(["dependencies", "dependents"]);
  });

  it("acepta carpetas y trunca con límite", () => {
    const folder = checkChangeImpact(makeStore(), {
      path: "src/domain",
      depth: 2
    });
    expect(folder.start.kind).toBe("folder");
    expect(folder.start.files).toBe(1);
    expect(folder.impacted).toHaveLength(3);

    const limited = checkChangeImpact(makeStore(), {
      path: "src/domain/c.ts",
      depth: 2,
      limit: 1
    });
    expect(limited.impacted).toHaveLength(1);
    expect(limited.summary.truncated).toBe(2);
  });
});

describe("listViolations", () => {
  it("separa estados y filtra severidad, tipo y regla", () => {
    const store = makeStore();
    expect(listViolations(store).total).toBe(2);
    expect(listViolations(store, { status: "introduced" }).total).toBe(1);
    expect(listViolations(store, { severity: "error" }).total).toBe(1);
    expect(listViolations(store, { type: "threshold" }).total).toBe(1);
    expect(listViolations(store, { rule: "domain-no-infra" }).total).toBe(1);
  });

  it("declara cuando no hay reporte", () => {
    const result = listViolations(makeStore(null));
    expect(result.available).toBe(false);
    expect(result.reason).toContain("report.json");
  });
});

describe("explainModule", () => {
  it("explica un fichero con aristas, ciclo y violaciones", () => {
    const result = explainModule(makeStore(), { path: "src/a.ts" });
    expect(result.kind).toBe("file");
    expect(result.metrics.rloc).toBe(100);
    expect(result.dependencies?.total).toBe(1);
    expect(result.dependencies?.edges[0]?.path).toBe("src/b.ts");
    expect(result.dependents?.total).toBe(2);
    expect(result.cycle).toEqual({ inCycle: true, size: 3 });
    expect(result.violations).toHaveLength(1);
    expect(result.diff.available).toBe(true);
    if (result.diff.available) expect(result.diff.state).toBeNull();
  });

  it("explica una carpeta y agrega el diff", () => {
    const result = explainModule(makeStore(), { path: "src" });
    expect(result.kind).toBe("folder");
    expect(result.files).toBe(4);
    expect(result.metrics.maxComplexity).toBe(20);
    expect(result.topFiles?.length).toBe(4);
    expect(result.violations).toHaveLength(2);
    if (result.diff.available) {
      expect(result.diff.counts?.files.changed).toBe(1);
      expect(result.diff.counts?.files.added).toBe(0);
    }
  });

  it("trata la raíz como carpeta y declara la ausencia de reporte", () => {
    const root = explainModule(makeStore(), { path: "." });
    expect(root.kind).toBe("folder");
    expect(root.files).toBe(5);
    if (root.diff.available) {
      expect(root.diff.counts?.files.added).toBe(1);
      expect(root.diff.counts?.files.removed).toBe(1);
    }

    const noReport = explainModule(makeStore(null), { path: "src/a.ts" });
    expect(noReport.diff.available).toBe(false);
  });
});

describe("rutas e ids", () => {
  it("normaliza separadores, prefijo de raíz e id", () => {
    const store = makeStore();
    expect(store.resolveTarget("acme/src/a.ts")).toMatchObject({
      path: "src/a.ts"
    });
    expect(store.resolveTarget("src\\domain\\c.ts")).toMatchObject({
      path: "src/domain/c.ts"
    });
    expect(store.resolveTarget("a")).toMatchObject({ path: "src/a.ts" });
  });

  it("rechaza absolutas y salidas del proyecto", () => {
    const store = makeStore();
    expect(() => store.resolveTarget("/src/a.ts")).toThrow(McpDataError);
    expect(() => store.resolveTarget("../src/a.ts")).toThrow(McpDataError);
  });

  it("sugiere una ruta cuando no existe", () => {
    expect(() => makeStore().resolveTarget("other/c.ts")).toThrow(
      /Quizá quisiste decir/
    );
  });
});

describe("servidor MCP", () => {
  it("registra las cinco herramientas y responde por transporte en memoria", async () => {
    const server = createServer(makeStore());
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "codarch-test", version: "0.0.0" });

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    try {
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
        "check_change_impact",
        "explain_module",
        "find_hotspots",
        "get_architecture_map",
        "list_violations"
      ]);

      const result = await client.callTool({
        name: "find_hotspots",
        arguments: { metric: "maxComplexity", limit: 1 }
      });
      expect(result.isError).toBeFalsy();
      const first = (
        result.content as Array<{ type: string; text?: string }>
      )[0];
      expect(first?.type).toBe("text");
      const text = first?.type === "text" ? (first.text ?? "{}") : "{}";
      const payload = JSON.parse(text) as {
        hotspots: Array<{ path: string }>;
      };
      expect(payload.hotspots[0]?.path).toBe("src/domain/c.ts");
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("devuelve isError con un mensaje claro para una ruta ausente", async () => {
    const server = createServer(makeStore());
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "codarch-test", version: "0.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    try {
      const result = await client.callTool({
        name: "explain_module",
        arguments: { path: "src/nope.ts" }
      });
      expect(result.isError).toBe(true);
      const first = (
        result.content as Array<{ type: string; text?: string }>
      )[0];
      const text = first?.type === "text" ? (first.text ?? "") : "";
      expect(text).toContain("no encuentro");
    } finally {
      await client.close();
      await server.close();
    }
  });
});
