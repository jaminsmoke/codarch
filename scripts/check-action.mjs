import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "yaml";
import { compareVersions, PRODUCT_VERSION } from "@codarch/versions";

const root = path.resolve(import.meta.dirname, "..");
const actionPath = path.join(root, "apps", "github-action", "action.yml");
const workflowPath = path.join(root, ".github", "workflows", "codarch.yml");

// Una versión con prerelease (alpha) también es semver.
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

const action = parse(fs.readFileSync(actionPath, "utf8"));
const cliVersion = PRODUCT_VERSION;
assert.match(cliVersion, SEMVER, "la versión del producto no es semver");
assert.equal(action.runs?.using, "composite");
assert.equal(action.inputs?.["fail-on"]?.default, "none");

const actionVersion = action.inputs?.version?.default;
assert.match(
  actionVersion ?? "",
  SEMVER,
  "la versión por defecto de la acción no es semver"
);
// La acción no puede instalar una versión que todavía no está en npm.
assert.ok(
  compareVersions(actionVersion, cliVersion) <= 0,
  `la acción instala ${actionVersion}, pero el CLI del repo está en ${cliVersion}: publica primero o baja la versión`
);
// Y tampoco puede quedarse atrás de lo ya publicado: esa desincronización
// silenciosa fue la que dejó la acción en 0.1.1 mientras npm iba por la 0.1.3.
const published = publishedLatest();
if (published) {
  assert.ok(
    compareVersions(actionVersion, published) >= 0,
    `la acción instala ${actionVersion} pero npm ya publica ${published}: actualiza la acción, sincroniza y mueve el tag v1`
  );
} else {
  console.log("aviso · no se pudo leer la versión publicada en npm; se omite esa comprobación");
}
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
  schemaVersion: "1.2",
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
          source: "addon:ejemplo",
          message: "src/domain/a.ts no puede depender de src/infra/b.ts"
        }
      ]
    }
  },
  migration: {
    languages: { base: {}, head: {} },
    status: {
      base: { js: 2, rust: 0, bridge: 0, native: 0 },
      head: { js: 1, rust: 1, bridge: 0, native: 0 }
    },
    debt: { base: 40, head: 30, delta: -10 },
    crossings: { base: 2, head: 1, delta: -1 },
    bridgeFiles: { base: 1, head: 1, delta: 0 },
    files: {
      increased: [
        {
          id: "b",
          path: "src/b.ts",
          language: "ts",
          status: "js",
          base: 10,
          head: 14,
          delta: 4
        }
      ],
      decreased: []
    },
    topDebt: []
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
    "addon `ejemplo`",
    "Migración",
    "deuda 10 → 14",
    "base-checksum",
    "head-checksum"
  ]) {
    assert.ok(output.includes(needle), `el comentario no contiene: ${needle}`);
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("ok · acción, workflow y comentario validados");

/** Compara dos versiones semver `x.y.z`. */
/** Última versión publicada en npm, o `null` si no se puede consultar. */
function publishedLatest() {
  try {
    // En Windows `npm` es `npm.cmd`: se usa el CLI de node directamente.
    const npmCli = process.env.npm_execpath;
    const command = npmCli ? process.execPath : "npm";
    const args = npmCli
      ? [npmCli, "view", "codarch", "dist-tags.latest", "--json"]
      : ["view", "codarch", "dist-tags.latest", "--json"];
    const output = execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    const value = JSON.parse(output);
    // npm devuelve un array cuando la clave existe en varias etiquetas.
    const candidate = Array.isArray(value) ? value[0] : value;
    return typeof candidate === "string" && /^\d+\.\d+\.\d+$/.test(candidate)
      ? candidate
      : null;
  } catch {
    return null;
  }
}
