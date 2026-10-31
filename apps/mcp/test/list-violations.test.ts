import { describe, expect, it } from "vitest";
import { listViolations } from "../src/tools";
import { makeStore } from "./fixtures";

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
