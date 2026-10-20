import { describe, expect, it } from "vitest";
import { buildGraph } from "../src/index";

describe("buildGraph", () => {
  it("calcula fan-in, fan-out y niveles en una cadena", () => {
    const graph = buildGraph(["a.ts", "b.ts", "c.ts"], [
      { from: "a.ts", to: "b.ts" },
      { from: "b.ts", to: "c.ts" }
    ]);

    expect(graph.edges).toEqual([
      { from: "a.ts", to: "b.ts", weight: 1, typeOnly: 0, isCyclic: false },
      { from: "b.ts", to: "c.ts", weight: 1, typeOnly: 0, isCyclic: false }
    ]);
    expect(graph.cycles).toEqual([]);
    expect(graph.metrics.get("a.ts")).toMatchObject({
      fanIn: 0,
      fanOut: 1,
      inCycle: 0,
      cycleSize: 0,
      dependencyLevel: 0
    });
    expect(graph.metrics.get("b.ts")).toMatchObject({
      fanIn: 1,
      fanOut: 1,
      dependencyLevel: 1
    });
    expect(graph.metrics.get("c.ts")).toMatchObject({
      fanIn: 1,
      fanOut: 0,
      dependencyLevel: 2
    });
  });

  it("detecta un ciclo y lo condensa en un solo nivel", () => {
    const graph = buildGraph(["a.ts", "b.ts", "c.ts"], [
      { from: "a.ts", to: "b.ts" },
      { from: "b.ts", to: "a.ts" },
      { from: "c.ts", to: "a.ts" }
    ]);

    expect(graph.cycles).toEqual([["a.ts", "b.ts"]]);
    expect(graph.edges.filter((edge) => edge.isCyclic)).toHaveLength(2);
    expect(graph.metrics.get("a.ts")).toMatchObject({
      fanIn: 2,
      fanOut: 1,
      inCycle: 1,
      cycleSize: 2,
      dependencyLevel: 1
    });
    expect(graph.metrics.get("b.ts")).toMatchObject({
      fanIn: 1,
      fanOut: 1,
      inCycle: 1,
      cycleSize: 2,
      dependencyLevel: 1
    });
    expect(graph.metrics.get("c.ts")).toMatchObject({
      fanIn: 0,
      fanOut: 1,
      inCycle: 0,
      cycleSize: 0,
      dependencyLevel: 0
    });
  });

  it("detecta self-loops como ciclos", () => {
    const graph = buildGraph(["a.ts"], [{ from: "a.ts", to: "a.ts" }]);

    expect(graph.cycles).toEqual([["a.ts"]]);
    expect(graph.edges[0]).toMatchObject({ isCyclic: true });
    expect(graph.metrics.get("a.ts")).toMatchObject({
      fanIn: 1,
      fanOut: 1,
      inCycle: 1,
      cycleSize: 1,
      dependencyLevel: 0
    });
  });

  it("deduplica aristas y conserva el peso y los type-only", () => {
    const graph = buildGraph(["a.ts", "b.ts"], [
      { from: "a.ts", to: "b.ts" },
      { from: "a.ts", to: "b.ts", typeOnly: true }
    ]);

    expect(graph.edges).toEqual([
      { from: "a.ts", to: "b.ts", weight: 2, typeOnly: 1, isCyclic: false }
    ]);
    expect(graph.metrics.get("a.ts")?.fanOut).toBe(1);
    expect(graph.metrics.get("b.ts")?.fanIn).toBe(1);
  });

  it("ignora aristas hacia nodos que no se analizan", () => {
    const graph = buildGraph(["a.ts"], [{ from: "a.ts", to: "external.ts" }]);
    expect(graph.edges).toEqual([]);
    expect(graph.metrics.get("a.ts")).toMatchObject({ fanOut: 0 });
  });

  it("deja los nodos aislados en nivel 0", () => {
    const graph = buildGraph(["a.ts"], []);
    expect(graph.metrics.get("a.ts")).toEqual({
      fanIn: 0,
      fanOut: 0,
      inCycle: 0,
      cycleSize: 0,
      dependencyLevel: 0
    });
  });
});
