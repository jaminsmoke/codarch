import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  AddonError,
  parseAddon,
  parseAddonManifest,
  parseAddonView,
  ruleConfigAddon
} from "../src/index";
import { declaredAddons, loadAddons, repoAddons } from "../src/node";
import { ConfigError, parseRuleConfig } from "@codarch/metrics";

const MANIFEST = {
  name: "demo",
  version: "0.1.0",
  title: "Demo",
  contributes: {}
};

const PROFILE = {
  id: "demo-capas",
  title: "Las capas de demo",
  layers: [
    { name: "domain", patterns: ["src/domain/**"] },
    { name: "infra", patterns: ["src/infra/**"] }
  ],
  rules: [
    {
      type: "forbidden",
      name: "dominio-sin-infra",
      from: "domain",
      to: "infra",
      severity: "warn"
    }
  ]
};

describe("el manifiesto de un addon", () => {
  it("un manifiesto mínimo vale y las piezas son opcionales", () => {
    const manifest = parseAddonManifest(MANIFEST);
    expect(manifest.name).toBe("demo");
    expect(manifest.contributes).toEqual({
      profiles: [],
      rules: [],
      views: []
    });
  });

  it("una clave desconocida es un error, no se ignora", () => {
    expect(() => parseAddonManifest({ ...MANIFEST, profile: "x" })).toThrow(
      /clave desconocida "profile"/
    );
  });

  it("el nombre es el de una carpeta: minúsculas, números y guiones", () => {
    expect(() => parseAddonManifest({ ...MANIFEST, name: "Demo Uno" })).toThrow(
      AddonError
    );
  });

  it("las piezas no pueden salirse de la carpeta del addon", () => {
    expect(() =>
      parseAddonManifest({
        ...MANIFEST,
        contributes: { rules: ["../otro/rules.yml"] }
      })
    ).toThrow(/no puede salirse/);
  });
});

describe("una vista guardada", () => {
  it("usa las mismas claves cortas que la URL", () => {
    const view = parseAddonView(
      { id: "capas", title: "Las capas", state: { color: "layer", area: "rloc", labels: true } },
      "views[0]"
    );
    expect(view.state).toEqual({
      area: "rloc",
      color: "layer",
      focus: undefined,
      file: undefined,
      tab: undefined,
      symbol: undefined,
      labels: true
    });
  });

  it("una pestaña que no existe es un error", () => {
    expect(() =>
      parseAddonView({ id: "x", title: "X", state: { tab: "otra" } }, "views[0]")
    ).toThrow(/file o pr/);
  });

  it("una clave desconocida en el estado es un error", () => {
    expect(() =>
      parseAddonView({ id: "x", title: "X", state: { zoom: 2 } }, "views[0]")
    ).toThrow(/clave desconocida "zoom"/);
  });
});

describe("un addon entero", () => {
  it("aporta capas y reglas, y se puede pasar al análisis", () => {
    const addon = parseAddon({
      manifest: MANIFEST,
      profiles: [PROFILE],
      rules: [
        {
          type: "threshold",
          name: "complejidad",
          metric: "maxComplexity",
          max: 30,
          severity: "warn"
        }
      ],
      views: []
    });

    expect(addon.profiles).toHaveLength(1);
    expect(addon.rules.map((rule) => rule.name)).toEqual(["complejidad"]);

    const pieces = ruleConfigAddon(addon);
    expect(pieces.name).toBe("demo");
    expect(pieces.layers.map((layer) => layer.name)).toEqual(["domain", "infra"]);
    // Las reglas del perfil y las sueltas, juntas: eso es lo que aporta.
    expect(pieces.rules.map((rule) => rule.name)).toEqual([
      "dominio-sin-infra",
      "complejidad"
    ]);
  });

  it("una regla no puede hablar de una capa que el addon no trae", () => {
    expect(() =>
      parseAddon({
        manifest: MANIFEST,
        profiles: [PROFILE],
        rules: [
          {
            type: "forbidden",
            name: "x",
            from: "domain",
            to: "presentacion",
            severity: "warn"
          }
        ],
        views: []
      })
    ).toThrow(/capa inexistente/);
  });

  it("dos vistas con el mismo id son un error", () => {
    expect(() =>
      parseAddon({
        manifest: MANIFEST,
        profiles: [],
        rules: [],
        views: [
          { id: "v", title: "Una" },
          { id: "v", title: "Otra" }
        ]
      })
    ).toThrow(/vista duplicada/);
  });
});

describe("la fusión con la configuración del equipo", () => {
  const addon = ruleConfigAddon(
    parseAddon({ manifest: MANIFEST, profiles: [PROFILE], rules: [], views: [] })
  );

  it("las reglas del addon dicen de dónde vienen", () => {
    const config = parseRuleConfig({ version: 1, addons: ["demo"] }, [addon]);
    expect(config.addons).toEqual(["demo"]);
    const rule = config.rules.find((entry) => entry.name === "dominio-sin-infra");
    expect(rule?.source).toBe("addon:demo");
  });

  it("el equipo manda: su regla sustituye a la del addon", () => {
    const config = parseRuleConfig(
      {
        version: 1,
        addons: ["demo"],
        rules: [
          {
            type: "forbidden",
            name: "dominio-sin-infra",
            from: "domain",
            to: "infra",
            severity: "error"
          }
        ]
      },
      [addon]
    );
    const rule = config.rules.find((entry) => entry.name === "dominio-sin-infra");
    expect(rule?.source).toBe("config");
    expect(rule?.severity).toBe("error");
    expect(config.rules).toHaveLength(1);
  });

  it("un addon declarado que no está es un error", () => {
    expect(() => parseRuleConfig({ version: 1, addons: ["fantasma"] }, [addon])).toThrow(
      ConfigError
    );
    expect(() => parseRuleConfig({ version: 1, addons: ["fantasma"] }, [addon])).toThrow(
      /no se encontró "fantasma"/
    );
  });
});

describe("los addons en el disco", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });

  function repo(files: Record<string, string>): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-addons-"));
    dirs.push(root);
    for (const [name, text] of Object.entries(files)) {
      const full = path.join(root, name);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, text, "utf8");
    }
    return root;
  }

  it("sin carpeta addons/ no hay addons ni errores", () => {
    const root = repo({ "README.md": "hola" });
    expect(loadAddons(root)).toEqual({ addons: [], errors: [] });
  });

  it("lee un addon de su carpeta y guarda el que está roto sin esconder el bueno", () => {
    const root = repo({
      "addons/demo/addon.json": JSON.stringify({
        name: "demo",
        version: "0.1.0",
        title: "Demo",
        contributes: { profiles: ["profile.yml"] }
      }),
      "addons/demo/profile.yml": `id: demo-capas
title: Las capas
layers:
  - name: domain
    patterns: ["src/domain/**"]
  - name: infra
    patterns: ["src/infra/**"]
rules:
  - type: forbidden
    name: dominio-sin-infra
    from: domain
    to: infra
    severity: warn
`,
      "addons/roto/addon.json": "{ esto no es json"
    });

    const loaded = loadAddons(root);
    expect(loaded.addons.map((addon) => addon.manifest.name)).toEqual(["demo"]);
    expect(loaded.errors).toHaveLength(1);
    expect(loaded.errors[0]?.message).toMatch(/addons\/roto: JSON inválido/);
    expect(loaded.addons[0]?.profiles[0]?.rules[0]?.name).toBe("dominio-sin-infra");
  });

  it("la carpeta y el manifiesto tienen que llamarse igual", () => {
    const root = repo({
      "addons/demo/addon.json": JSON.stringify({
        name: "otro",
        version: "0.1.0",
        title: "Demo"
      })
    });
    const loaded = loadAddons(root);
    expect(loaded.errors[0]?.message).toMatch(/deben coincidir/);
  });

  it("el repo dice qué addons declara y solo esos se ofrecen a las apps", () => {
    const root = repo({
      ".codarch.yml": "version: 1\n\naddons:\n  - demo\n",
      "addons/demo/addon.json": JSON.stringify({
        name: "demo",
        version: "0.1.0",
        title: "Demo",
        contributes: { profiles: ["profile.yml"], views: ["views.yml"] }
      }),
      "addons/demo/profile.yml": `id: demo-capas
title: Las capas
layers:
  - name: domain
    patterns: ["src/domain/**"]
`,
      "addons/demo/views.yml": `- id: capas
  title: Las capas
  state:
    focus: src/domain
    labels: true
`,
      "addons/suelto/addon.json": JSON.stringify({
        name: "suelto",
        version: "0.1.0",
        title: "Suelto"
      })
    });

    expect(declaredAddons(root)).toEqual(["demo"]);

    const summary = repoAddons(root);
    expect(summary.errors).toEqual([]);
    expect(summary.addons.map((addon) => addon.name)).toEqual(["demo"]);
    expect(summary.addons[0]?.profiles).toEqual([
      { id: "demo-capas", title: "Las capas" }
    ]);
    expect(summary.addons[0]?.views[0]?.state).toEqual({
      area: undefined,
      color: undefined,
      focus: "src/domain",
      file: undefined,
      tab: undefined,
      symbol: undefined,
      labels: true
    });
  });

  it("sin .codarch.yml no se declara nada aunque haya addons", () => {
    const root = repo({
      "addons/demo/addon.json": JSON.stringify({
        name: "demo",
        version: "0.1.0",
        title: "Demo"
      })
    });
    expect(declaredAddons(root)).toEqual([]);
    expect(repoAddons(root).addons).toEqual([]);
  });
});
