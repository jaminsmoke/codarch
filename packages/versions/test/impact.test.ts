import { describe, expect, it } from "vitest";
import { impactedComponents, type WorkspaceInfo } from "../src/impact";

const WORKSPACES: WorkspaceInfo[] = [
  {
    name: "@codarch/versions",
    directory: "packages/versions",
    dependencies: []
  },
  {
    name: "@codarch/schema",
    directory: "packages/schema",
    dependencies: ["@codarch/versions"]
  },
  {
    name: "@codarch/parsers",
    directory: "packages/parsers",
    dependencies: ["@codarch/schema"]
  },
  {
    name: "@codarch/metrics",
    directory: "packages/metrics",
    dependencies: ["@codarch/schema", "@codarch/versions"]
  },
  {
    name: "@codarch/layouts",
    directory: "packages/layouts",
    dependencies: []
  },
  {
    name: "@codarch/render",
    directory: "packages/render",
    dependencies: [
      "@codarch/layouts",
      "@codarch/metrics",
      "@codarch/schema"
    ]
  },
  {
    name: "@codarch/plugin-api",
    directory: "packages/plugin-api",
    dependencies: ["@codarch/render"]
  },
  {
    name: "@codarch/addons",
    directory: "packages/addons",
    dependencies: ["@codarch/metrics"]
  },
  {
    name: "@codarch/ui",
    directory: "packages/ui",
    dependencies: [
      "@codarch/addons",
      "@codarch/metrics",
      "@codarch/plugin-api",
      "@codarch/render",
      "@codarch/schema"
    ]
  },
  {
    name: "@codarch/cli",
    directory: "apps/cli",
    dependencies: [
      "@codarch/metrics",
      "@codarch/parsers",
      "@codarch/render",
      "@codarch/schema",
      "@codarch/versions"
    ]
  },
  {
    name: "@codarch/desktop",
    directory: "apps/desktop",
    dependencies: [
      "@codarch/metrics",
      "@codarch/parsers",
      "@codarch/render",
      "@codarch/schema",
      "@codarch/ui",
      "@codarch/versions"
    ]
  },
  {
    name: "@codarch/web",
    directory: "apps/web",
    dependencies: [
      "@codarch/parsers",
      "@codarch/render",
      "@codarch/schema",
      "@codarch/ui",
      "@codarch/versions"
    ]
  },
  {
    name: "@codarch/mcp",
    directory: "apps/mcp",
    dependencies: [
      "@codarch/addons",
      "@codarch/metrics",
      "@codarch/schema",
      "@codarch/versions"
    ]
  },
  {
    name: "@codarch/site",
    directory: "apps/site",
    dependencies: []
  }
];

function impact(...files: string[]): string[] {
  return impactedComponents(files, WORKSPACES).components;
}

describe("el impacto de un cambio", () => {
  it("un cambio del CLI solo sube el CLI y Docker", () => {
    expect(impact("apps/cli/src/index.ts")).toEqual(["cli", "docker"]);
  });

  it("un cambio del escritorio no toca el CLI", () => {
    expect(impact("apps/desktop/src/main.ts")).toEqual(["desktop"]);
  });

  it("un cambio de la web sube la web y Docker", () => {
    expect(impact("apps/web/src/App.tsx")).toEqual(["cli", "web", "docker"]);
  });

  it("un cambio del MCP solo sube el MCP", () => {
    expect(impact("apps/mcp/src/tools.ts")).toEqual(["mcp"]);
  });

  it("un cambio del parser sube el motor y los que lo empaquetan", () => {
    expect(impact("packages/parsers/src/ts/tree.ts")).toEqual([
      "engine",
      "cli",
      "desktop",
      "web",
      "docker"
    ]);
  });

  it("un cambio de la UI no toca el CLI ni el MCP", () => {
    expect(impact("packages/ui/src/panels.tsx")).toEqual([
      "engine",
      "cli",
      "desktop",
      "web",
      "docker"
    ]);
  });

  it("un cambio del schema toca a todos", () => {
    expect(impact("packages/schema/src/types.ts")).toEqual([
      "engine",
      "cli",
      "desktop",
      "web",
      "mcp",
      "docker"
    ]);
  });

  it("un plugin afecta a las apps que lo compilan", () => {
    expect(impact("plugins/vista-3d/src/index.ts")).toEqual([
      "engine",
      "cli",
      "desktop",
      "web",
      "docker"
    ]);
  });

  it("los tests y la documentación no suben nada", () => {
    expect(impact("packages/ui/test/symbols.test.ts")).toEqual([]);
    expect(impact("packages/ui/src/panels.tsx", "docs/guia.md")).toEqual([
      "engine",
      "cli",
      "desktop",
      "web",
      "docker"
    ]);
    expect(impact("apps/site/docs/model.md")).toEqual([]);
  });

  it("un cambio de la raíz o del Dockerfile se trata aparte", () => {
    expect(impact("package.json")).toEqual([]);
    expect(impact("tsconfig.json")).toEqual([
      "engine",
      "cli",
      "desktop",
      "web",
      "mcp",
      "docker"
    ]);
    expect(impact("Dockerfile")).toEqual(["docker"]);
  });
});
