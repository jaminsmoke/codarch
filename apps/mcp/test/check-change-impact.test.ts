import { describe, expect, it } from "vitest";
import { checkChangeImpact } from "../src/tools";
import { makeStore } from "./fixtures";

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
