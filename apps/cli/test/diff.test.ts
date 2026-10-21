import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fileId,
  folderId,
  parseCcJson,
  type CcJson,
  type CcNode
} from "@codarch/schema";
import { runDiff } from "../src/commands/diff";

const tempRoots: string[] = [];

function tempDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-diff-cli-"));
  tempRoots.push(root);
  return root;
}

function snapshot(
  projectName: string,
  files: Array<{ path: string; metrics: Record<string, number> }>,
  edges: Array<{ from: string; to: string; cyclic?: boolean }>
): CcJson {
  const root: CcNode = {
    id: folderId(""),
    name: projectName,
    type: "Folder",
    children: []
  };
  const folders = new Map<string, CcNode>([["", root]]);
  const attributes: Record<string, Record<string, number>> = {};

  for (const file of files) {
    const segments = file.path.split("/");
    const leaf = segments.pop();
    if (!leaf) continue;
    let parent = root;
    let parentPath = "";
    for (const segment of segments) {
      const folderPath = parentPath ? `${parentPath}/${segment}` : segment;
      let folder = folders.get(folderPath);
      if (!folder) {
        folder = {
          id: folderId(folderPath),
          name: segment,
          type: "Folder",
          children: []
        };
        folders.set(folderPath, folder);
        parent.children?.push(folder);
      }
      parent = folder;
      parentPath = folderPath;
    }
    const node: CcNode = { id: fileId(file.path), name: leaf, type: "File" };
    parent.children?.push(node);
    attributes[node.id] = file.metrics;
  }

  return parseCcJson({
    meta: { projectName, apiVersion: "2.0", checksum: `sum-${projectName}` },
    files: [root],
    lenses: {
      metrics: { attributes },
      dependency: {
        edges: edges.map((edge) => ({
          fromId: fileId(edge.from),
          toId: fileId(edge.to),
          attributes: { weight: 1, typeOnly: 0 },
          isCyclic: edge.cyclic === true
        }))
      }
    }
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("runDiff", () => {
  it("escribe el reporte y devuelve 2 cuando falla el gate de ciclos", () => {
    const root = tempDir();
    const basePath = path.join(root, "base.cc.json");
    const headPath = path.join(root, "head.cc.json");
    const outPath = path.join(root, "report.json");

    const base = snapshot(
      "proj",
      [
        { path: "a.ts", metrics: { maxComplexity: 1, rloc: 5 } },
        { path: "b.ts", metrics: { maxComplexity: 1, rloc: 5 } }
      ],
      [{ from: "a.ts", to: "b.ts" }]
    );
    const head = snapshot(
      "proj",
      [
        { path: "a.ts", metrics: { maxComplexity: 4, rloc: 5 } },
        { path: "b.ts", metrics: { maxComplexity: 1, rloc: 5 } }
      ],
      [
        { from: "a.ts", to: "b.ts" },
        { from: "b.ts", to: "a.ts", cyclic: true }
      ]
    );
    fs.writeFileSync(basePath, JSON.stringify(base), "utf8");
    fs.writeFileSync(headPath, JSON.stringify(head), "utf8");

    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(
      runDiff({
        base: basePath,
        head: headPath,
        out: outPath,
        top: 5,
        failOn: "cycles",
        help: false
      })
    ).toBe(2);

    const report = JSON.parse(fs.readFileSync(outPath, "utf8")) as {
      summary: { introducedCycles: number; hotspots: number };
    };
    expect(report.summary.introducedCycles).toBe(1);
    expect(report.summary.hotspots).toBe(1);
  });

  it("devuelve 0 sin gate y 1 si faltan argumentos", () => {
    const root = tempDir();
    const basePath = path.join(root, "base.cc.json");
    const headPath = path.join(root, "head.cc.json");
    const outPath = path.join(root, "report.json");
    const cc = snapshot("proj", [{ path: "a.ts", metrics: { rloc: 1 } }], []);
    fs.writeFileSync(basePath, JSON.stringify(cc), "utf8");
    fs.writeFileSync(headPath, JSON.stringify(cc), "utf8");

    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(
      runDiff({
        base: basePath,
        head: headPath,
        out: outPath,
        top: 5,
        failOn: "none",
        help: false
      })
    ).toBe(0);
    expect(runDiff({ help: false })).toBe(1);
  });

  it("carga .codarch.yml y aplica la política de violaciones", () => {
    const root = tempDir();
    const basePath = path.join(root, "base.cc.json");
    const headPath = path.join(root, "head.cc.json");
    const outPath = path.join(root, "report.json");
    const errorConfig = path.join(root, "error.yml");
    const warnConfig = path.join(root, "warn.yml");

    const base = snapshot(
      "proj",
      [
        { path: "src/domain/a.ts", metrics: { rloc: 1 } },
        { path: "src/infra/b.ts", metrics: { rloc: 1 } }
      ],
      []
    );
    const head = snapshot(
      "proj",
      [
        { path: "src/domain/a.ts", metrics: { rloc: 1 } },
        { path: "src/infra/b.ts", metrics: { rloc: 1 } }
      ],
      [{ from: "src/domain/a.ts", to: "src/infra/b.ts" }]
    );
    fs.writeFileSync(basePath, JSON.stringify(base), "utf8");
    fs.writeFileSync(headPath, JSON.stringify(head), "utf8");

    const yaml = (severity: "error" | "warn"): string =>
      [
        "version: 1",
        "layers:",
        "  - name: domain",
        "    paths: [src/domain/**]",
        "  - name: infra",
        "    paths: [src/infra/**]",
        "rules:",
        "  - name: domain-no-infra",
        "    type: forbidden",
        "    from: domain",
        "    to: infra",
        `    severity: ${severity}`
      ].join("\n");
    fs.writeFileSync(errorConfig, yaml("error"), "utf8");
    fs.writeFileSync(warnConfig, yaml("warn"), "utf8");

    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(
      runDiff({
        base: basePath,
        head: headPath,
        out: outPath,
        top: 5,
        failOn: "violations",
        config: errorConfig,
        help: false
      })
    ).toBe(2);
    const failed = JSON.parse(fs.readFileSync(outPath, "utf8")) as {
      rules: {
        summary: { introduced: number; introducedErrors: number };
      };
    };
    expect(failed.rules.summary.introduced).toBe(1);
    expect(failed.rules.summary.introducedErrors).toBe(1);

    expect(
      runDiff({
        base: basePath,
        head: headPath,
        out: outPath,
        top: 5,
        failOn: "violations",
        config: warnConfig,
        help: false
      })
    ).toBe(0);
    const warned = JSON.parse(fs.readFileSync(outPath, "utf8")) as {
      rules: { summary: { introducedWarnings: number } };
    };
    expect(warned.rules.summary.introducedWarnings).toBe(1);

    expect(
      runDiff({
        base: basePath,
        head: headPath,
        out: outPath,
        top: 5,
        failOn: "violations",
        noConfig: true,
        help: false
      })
    ).toBe(0);
    const disabled = JSON.parse(fs.readFileSync(outPath, "utf8")) as {
      rules: { configured: boolean };
    };
    expect(disabled.rules.configured).toBe(false);
  });

  it("las reglas de un addon del repo entran en el análisis y dicen de dónde vienen", () => {
    const root = tempDir();
    const basePath = path.join(root, "base.cc.json");
    const headPath = path.join(root, "head.cc.json");
    const outPath = path.join(root, "report.json");
    const configPath = path.join(root, ".codarch.yml");

    const files = [
      { path: "src/domain/a.ts", metrics: { rloc: 1 } },
      { path: "src/infra/b.ts", metrics: { rloc: 1 } }
    ];
    fs.writeFileSync(basePath, JSON.stringify(snapshot("proj", files, [])), "utf8");
    fs.writeFileSync(
      headPath,
      JSON.stringify(
        snapshot("proj", files, [{ from: "src/domain/a.ts", to: "src/infra/b.ts" }])
      ),
      "utf8"
    );

    fs.writeFileSync(configPath, "version: 1\n\naddons:\n  - demo\n", "utf8");
    fs.mkdirSync(path.join(root, "addons", "demo"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "addons", "demo", "addon.json"),
      JSON.stringify({
        name: "demo",
        version: "0.1.0",
        title: "Demo",
        contributes: { profiles: ["profile.yml"] }
      }),
      "utf8"
    );
    fs.writeFileSync(
      path.join(root, "addons", "demo", "profile.yml"),
      [
        "id: demo",
        "title: Las capas de demo",
        "layers:",
        "  - name: domain",
        "    patterns: [src/domain/**]",
        "  - name: infra",
        "    patterns: [src/infra/**]",
        "rules:",
        "  - type: forbidden",
        "    name: domain-no-infra",
        "    from: domain",
        "    to: infra",
        "    severity: warn"
      ].join("\n"),
      "utf8"
    );

    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(
      runDiff({
        base: basePath,
        head: headPath,
        out: outPath,
        top: 5,
        failOn: "violations",
        config: configPath,
        help: false
      })
    ).toBe(0);

    const report = JSON.parse(fs.readFileSync(outPath, "utf8")) as {
      rules: {
        summary: { rules: number; introducedWarnings: number };
        violations: { introduced: Array<{ rule: string; source: string }> };
      };
    };
    expect(report.rules.summary.rules).toBe(1);
    expect(report.rules.summary.introducedWarnings).toBe(1);
    expect(report.rules.violations.introduced[0]?.rule).toBe("domain-no-infra");
    expect(report.rules.violations.introduced[0]?.source).toBe("addon:demo");
  });
});
