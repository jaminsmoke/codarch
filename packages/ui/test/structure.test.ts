import { describe, expect, it } from "vitest";
import type { CcMember, CcStructureNode } from "@codarch/schema/browser";
import {
  groupMembers,
  memberSummary,
  surfaceCount,
  surfaceSummary
} from "../src/structure";

function structure(overrides: Partial<CcStructureNode> = {}): CcStructureNode {
  return {
    members: [],
    imports: [],
    exports: [],
    ...overrides
  };
}

function member(owner: string, name: string, line: number): CcMember {
  return { owner, name, line, from: "field" };
}

describe("la superficie del fichero", () => {
  it("cuenta imports y exports por separado", () => {
    const node = structure({
      imports: [
        { source: "./a", names: ["a"], kind: "static", typeOnly: false, line: 1 }
      ],
      exports: [
        { name: "a", kind: "declaration", line: 2 },
        { name: "b", kind: "declaration", line: 3 }
      ]
    });

    expect(surfaceCount(node)).toBe(3);
    expect(surfaceSummary(node)).toBe("1 import · 2 exports");
  });

  it("no inventa una sección vacía", () => {
    expect(surfaceSummary(structure())).toBeUndefined();
  });
});

describe("los miembros de clase", () => {
  it("agrupa por clase y conserva el orden por línea", () => {
    const groups = groupMembers([
      member("Store", "b", 4),
      member("Forma", "lado", 10),
      member("Store", "a", 2)
    ]);

    expect(groups.map((group) => group.owner)).toEqual(["Store", "Forma"]);
    expect(groups[0]?.members.map((entry) => entry.name)).toEqual(["a", "b"]);
  });

  it("resume las tres primeras clases y cuenta el resto", () => {
    const members = [
      member("A", "a", 1),
      member("B", "b", 2),
      member("C", "c", 3),
      member("D", "d", 4)
    ];

    expect(memberSummary(members)).toBe("A 1 · B 1 · C 1 · +1");
  });

  it("sin miembros no hay resumen", () => {
    expect(memberSummary([])).toBeUndefined();
  });
});
