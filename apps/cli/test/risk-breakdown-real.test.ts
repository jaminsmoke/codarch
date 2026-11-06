import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { explainModule, loadArchitectureStore } from "@codarch/mcp";
import { aggregateFolder } from "@codarch/metrics";
import { buildRenderModel } from "@codarch/render";
import { captureMap } from "@codarch/render/node";
import { parseCcJson } from "@codarch/schema";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runAnalyze } from "../src/commands/analyze";

const roots: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("un snapshot real de solo código", () => {
  it("lleva el desglose del motor al fichero, a la carpeta y a la salida", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-real-"));
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-real-out-"));
    roots.push(root, out);
    write(root, "src/app.ts", [
      "export function run(n: number): number {",
      "  let total = 0;",
      "  for (let i = 0; i < n; i++) {",
      "    if (i % 2 === 0) total += i;",
      "    else total -= 1;",
      "  }",
      "  return total;",
      "}",
      ""
    ].join("\n"));
    write(root, "src/domain/order.ts", "export const id = \"order\";\n");
    write(root, "src/domain/price.ts", [
      "export function price(qty: number): number {",
      "  if (qty < 0) return 0;",
      "  return qty * 3;",
      "}",
      ""
    ].join("\n"));

    vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(await runAnalyze({ root, out, git: false, help: false })).toBe(0);

    const raw = fs.readFileSync(path.join(out, "snapshot.cc.json"), "utf8");
    expect(raw).not.toContain("riskBreakdown");
    const cc = parseCcJson(JSON.parse(raw));
    expect(cc.lenses?.rest).toBeUndefined();

    const model = buildRenderModel(cc);
    expect(model.files.length).toBeGreaterThanOrEqual(3);
    for (const file of model.files) {
      expect(file.kind).toBeNull();
      expect(file.riskBreakdown).not.toBeNull();
      expect(file.risk).toBe(file.riskBreakdown!.risk);
      expect(file.riskBreakdown!.risk).toBeGreaterThanOrEqual(0);
      expect(file.riskBreakdown!.risk).toBeLessThanOrEqual(1);
      expect(file.riskBreakdown!.score).toBeGreaterThanOrEqual(0);
      expect(file.riskBreakdown!.score).toBeLessThanOrEqual(100);
      expect(file.riskBreakdown!.score).toBeCloseTo(100 * file.riskBreakdown!.risk);
    }

    const domain = model.files.filter((file) => file.path.startsWith("src/domain/"));
    expect(domain.length).toBeGreaterThanOrEqual(2);
    const domainMax = Math.max(...domain.map((file) => file.risk));
    expect(
      aggregateFolder(
        domain.map((file) => ({
          path: file.path,
          size: file.actualArea,
          complexity: file.complexity,
          risk: file.risk
        }))
      ).risk
    ).toBe(domainMax);
    const projectMax = Math.max(...model.files.map((file) => file.risk));
    expect(Math.max(...model.files.map((file) => file.riskBreakdown!.risk))).toBe(projectMax);

    const shot = captureMap(cc, root, { color: "risk", out: path.join(out, "mapa.png") });
    expect(shot.summary.cells.length).toBeGreaterThan(0);
    for (const cell of shot.summary.cells) {
      const file = model.files.find((entry) => entry.path === cell.path);
      expect(file).toBeDefined();
      expect(cell.riskBreakdown).toEqual(file!.riskBreakdown);
      expect(cell.riskBreakdown).not.toBeNull();
    }

    fs.mkdirSync(path.join(root, ".codarch"), { recursive: true });
    fs.copyFileSync(
      path.join(out, "snapshot.cc.json"),
      path.join(root, ".codarch", "snapshot.cc.json")
    );
    const store = loadArchitectureStore({ root });
    const file = explainModule(store, { path: "src/app.ts" });
    const folder = explainModule(store, { path: "src/domain" });
    const project = explainModule(store, { path: "." });
    expect(file.kind).toBe("file");
    expect(file.riskBreakdown).not.toBeNull();
    expect(file.risk).toBe(file.riskBreakdown!.risk);
    expect(folder.kind).toBe("folder");
    expect(folder.riskBreakdown).not.toBeNull();
    expect(folder.topFiles?.every((entry) => entry.riskBreakdown !== null)).toBe(true);
    expect(project.kind).toBe("folder");
    expect(project.riskBreakdown).not.toBeNull();
    expect(project.risk).toBe(project.riskBreakdown!.risk);
    expect(fs.readFileSync(path.join(root, ".codarch", "snapshot.cc.json"), "utf8")).not.toContain(
      "riskBreakdown"
    );
  });
});

function write(root: string, name: string, content: string): void {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}
