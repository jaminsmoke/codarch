import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ruleConfigAddon } from "@codarch/addons";
import { loadAddons } from "@codarch/addons/node";
import { loadRuleConfig } from "@codarch/metrics";
import { analyzeRepository } from "@codarch/parsers";
import type { CcJson } from "@codarch/schema";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

/** Un repo mínimo: un dominio que importa la infraestructura, para que la regla del addon tenga algo que mirar. */
function tempRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-addon-invariant-"));
  tempRoots.push(root);
  write(
    root,
    "src/domain/a.ts",
    'import { b } from "../infra/b";\n\nexport function a(): number {\n  return b();\n}\n'
  );
  write(root, "src/infra/b.ts", "export function b(): number {\n  return 1;\n}\n");
  return root;
}

function write(root: string, file: string, text: string): void {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text, "utf8");
}

/** El addon tal y como lo deja `codarch addons add`: carpeta y declaración. */
function installAddon(root: string): void {
  write(
    root,
    ".codarch.yml",
    ["version: 1", "", "addons:", "  - demo", ""].join("\n")
  );
  write(
    root,
    "addons/demo/addon.json",
    JSON.stringify(
      {
        name: "demo",
        version: "0.1.0",
        title: "Demo",
        description: "Las capas de demo.",
        contributes: { profiles: ["profile.yml"], views: ["views.yml"] }
      },
      null,
      2
    )
  );
  write(
    root,
    "addons/demo/profile.yml",
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
    ].join("\n")
  );
  write(
    root,
    "addons/demo/views.yml",
    ["- id: capas", "  title: Las capas", "  state:", "    color: layer", "    labels: true"].join(
      "\n"
    )
  );
}

function analyze(root: string): CcJson {
  return analyzeRepository(root, { git: false, projectName: "demo" }).snapshot;
}

describe("un addon instalado", () => {
  it("no cambia el snapshot ni el checksum: el addon es datos, no código", () => {
    const root = tempRepo();
    const before = analyze(root);

    installAddon(root);
    const after = analyze(root);

    // La regla del producto (ADR 0029): el checksum depende del código.
    expect(after.meta.checksum).toBe(before.meta.checksum);
    // No solo el resumen: el snapshot entero sale igual, sin nodos ni lentes nuevas.
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
    expect(after.files).toEqual(before.files);

    // Control: cuando cambia el código, el checksum cambia. La igualdad de
    // arriba no es un artefacto de comparar dos análisis vacíos.
    write(root, "src/domain/c.ts", "export const c = 1;\n");
    expect(analyze(root).meta.checksum).not.toBe(before.meta.checksum);
  });

  it("pero sus reglas y sus vistas sí se cargan para el diff y las apps", () => {
    const root = tempRepo();
    installAddon(root);

    const loaded = loadAddons(root);
    expect(loaded.errors).toEqual([]);
    expect(loaded.addons.map((addon) => addon.manifest.name)).toEqual(["demo"]);

    const config = loadRuleConfig(
      path.join(root, ".codarch.yml"),
      loaded.addons.map(ruleConfigAddon)
    );
    const rule = config.rules.find((entry) => entry.name === "domain-no-infra");
    expect(rule?.severity).toBe("warn");
    expect(rule?.source).toBe("addon:demo");

    expect(loaded.addons[0]?.views.map((view) => view.id)).toEqual(["capas"]);
  });
});
