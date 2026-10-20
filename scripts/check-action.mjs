import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "yaml";

const root = path.resolve(import.meta.dirname, "..");
const actionPath = path.join(root, "apps", "github-action", "action.yml");
const workflowPath = path.join(root, ".github", "workflows", "codarch.yml");

const action = parse(fs.readFileSync(actionPath, "utf8"));
const cliVersion = JSON.parse(
  fs.readFileSync(path.join(root, "apps", "cli", "package.json"), "utf8")
).version;
assert.match(cliVersion, /^\d+\.\d+\.\d+$/, "la versión del CLI no es semver");
assert.equal(action.runs?.using, "composite");
assert.equal(action.inputs?.["fail-on"]?.default, "none");
assert.equal(
  action.inputs?.version?.default,
  cliVersion,
  `la acción debe instalar la versión publicada del CLI (${cliVersion})`
);
assert.ok(
  action.runs.steps.some((step) =>
    String(step.run ?? "").includes("codarch@${CODARCH_VERSION}")
  ),
  "la acción no instala el paquete codarch"
);
assert.ok(
  !action.runs.steps.some((step) => String(step.run ?? "").includes("npx tsx")),
  "la acción sigue dependiendo del checkout local"
);
assert.ok(
  action.runs.steps.some((step) => step.id === "paths"),
  "falta el paso paths"
);
assert.ok(
  action.runs.steps.some((step) =>
    String(step.run ?? "").includes("render-comment.mjs")
  ),
  "falta el render del comentario"
);
assert.ok(
  action.runs.steps.some((step) =>
    String(step.uses ?? "").startsWith("actions/upload-artifact")
  ),
  "falta el artefacto"
);
assert.equal(
  action.outputs?.report?.value,
  "${{ steps.paths.outputs.report }}"
);

const workflow = parse(fs.readFileSync(workflowPath, "utf8"));
assert.equal(workflow.permissions?.["pull-requests"], "write");
assert.ok(
  workflow.jobs?.codarch?.steps?.some(
    (step) => step.uses === "./apps/github-action"
  ),
  "el workflow no usa la acción local"
);

for (const relative of [
  "apps/github-action/render-comment.mjs",
  "apps/cli/src/index.ts"
]) {
  assert.ok(fs.existsSync(path.join(root, relative)), `falta ${relative}`);
}

const report = {
  schemaVersion: "1.0",
  base: { checksum: "base-checksum" },
  head: { checksum: "head-checksum" },
  summary: {
    addedFiles: 2,
    removedFiles: 1,
    changedFiles: 3,
    addedEdges: 4,
    removedEdges: 1,
    introducedCycles: 1,
    hotspots: 1
  },
  hotspotMetric: "maxComplexity",
  cycles: {
    introduced: [
      {
        size: 2,
        nodes: [
          { id: "src/a.ts", path: "src/a.ts" },
          { id: "src/b.ts", path: "src/b.ts" }
        ]
      }
    ]
  },
  hotspots: [
    {
      path: "src/a.ts",
      metric: "maxComplexity",
      base: 4,
      head: 20,
      delta: 16
    }
  ],
  rules: {
    configured: true,
    summary: { introduced: 1, existing: 0 },
    violations: {
      introduced: [
        {
          rule: "domain-no-infra",
          severity: "error",
          message: "src/domain/a.ts no puede depender de src/infra/b.ts"
        }
      ]
    }
  }
};

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-action-check-"));
try {
  const reportPath = path.join(temp, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report), "utf8");

  const output = execFileSync(
    process.execPath,
    [path.join(root, "apps", "github-action", "render-comment.mjs"), reportPath],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        CODARCH_STATUS: "2",
        CODARCH_RUN_URL: "https://example.test/run/1",
        CODARCH_ARTIFACT: "codarch"
      }
    }
  );

  for (const needle of [
    "<!-- codarch-report -->",
    "La política de arquitectura ha fallado",
    "Ciclos nuevos",
    "Hotspots",
    "Violaciones nuevas",
    "base-checksum",
    "head-checksum"
  ]) {
    assert.ok(output.includes(needle), `el comentario no contiene: ${needle}`);
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("ok · acción, workflow y comentario validados");
