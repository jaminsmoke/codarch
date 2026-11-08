import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { RuleCatalog, RuleCatalogGroup } from "./shared";
import { detectLintSystems } from "./project";

/**
 * El catálogo de reglas conocidas de una herramienta (ADR 0112).
 *
 * No se guarda en el artefacto: se enumera del proyecto cuando la ficha abre
 * el menú de añadir. Si una herramienta no puede enumerarlo, se devuelve vacío
 * con un motivo; la UI no inventa reglas.
 */
export async function listLintRules(
  root: string,
  system: string
): Promise<RuleCatalog> {
  if (system === "eslint") return listEslintRules(root);
  if (system === "oxlint") return listOxlintRules(root);
  if (system === "biome") return listBiomeRules(root);
  return {
    system,
    groups: [],
    source: "active",
    note: `No se puede enumerar el catálogo de ${system}.`
  };
}

async function listEslintRules(root: string): Promise<RuleCatalog> {
  const project = createRequire(path.join(root, "package.json"));
  const detected = detectLintSystems(root).find((item) => item.name === "eslint");
  const groups: RuleCatalogGroup[] = [];

  const core = coreRules(project);
  if (core.length > 0) {
    groups.push({ plugin: "core", rules: core.sort(compare) });
  }

  const plugins = await pluginRules(root, project, detected?.sample ?? null);
  for (const name of Object.keys(plugins).sort(compare)) {
    groups.push({ plugin: name, rules: plugins[name] ?? [] });
  }

  if (groups.length === 0) {
    return {
      system: "eslint",
      groups: [],
      source: "active",
      note: "No se pudo leer el catálogo de ESLint del proyecto."
    };
  }
  return { system: "eslint", groups, source: "project" };
}

function coreRules(project: NodeRequire): string[] {
  try {
    const risk = project("eslint/use-at-your-own-risk") as {
      builtinRules?: Map<string, unknown>;
    };
    return [...(risk.builtinRules?.keys() ?? [])];
  } catch {
    return [];
  }
}

interface EslintPlugin {
  rules?: Record<string, unknown>;
}

interface EslintApi {
  calculateConfigForFile: (file: string) => Promise<{
    plugins?: Record<string, EslintPlugin>;
  }>;
}

async function pluginRules(
  root: string,
  project: NodeRequire,
  sample: string | null
): Promise<Record<string, string[]>> {
  const rules: Record<string, string[]> = {};
  try {
    const api = project("eslint") as {
      ESLint: new (options: { cwd: string }) => EslintApi;
    };
    const eslint = new api.ESLint({ cwd: root });
    const config = await eslint.calculateConfigForFile(sample ?? "index.ts");
    for (const [name, plugin] of Object.entries(config.plugins ?? {})) {
      const ids = Object.keys(plugin.rules ?? {});
      if (ids.length === 0) continue;
      rules[name] = ids.map((id) => `${name}/${id}`).sort(compare);
    }
  } catch {
    // Sin config resoluble, el menú se queda con el núcleo y lo dice.
  }
  return rules;
}

function listOxlintRules(root: string): RuleCatalog {
  const schema = readOxlintSchema(root);
  const properties = schema?.definitions?.DummyRuleMap?.properties;
  if (!properties) {
    return {
      system: "oxlint",
      groups: [],
      source: "active",
      note: "No se pudo leer el esquema de oxlint del proyecto."
    };
  }

  const byPlugin = new Map<string, string[]>();
  for (const id of Object.keys(properties)) {
    const slash = id.indexOf("/");
    const plugin = slash === -1 ? "core" : id.slice(0, slash);
    const list = byPlugin.get(plugin) ?? [];
    list.push(id);
    byPlugin.set(plugin, list);
  }
  const groups = [...byPlugin.entries()]
    .sort(([left], [right]) => compare(left, right))
    .map(([plugin, rules]) => ({ plugin, rules: rules.sort(compare) }));
  return groups.length > 0
    ? { system: "oxlint", groups, source: "project" }
    : {
        system: "oxlint",
        groups: [],
        source: "active",
        note: "El esquema de oxlint no declara reglas."
      };
}

interface OxlintSchema {
  definitions?: {
    DummyRuleMap?: { properties?: Record<string, unknown> };
  };
}

interface BiomeSchema {
  definitions?: {
    Rules?: { properties?: Record<string, unknown> };
  };
}

function listBiomeRules(root: string): RuleCatalog {
  const schema = readBiomeSchema(root);
  const properties = schema?.definitions?.Rules?.properties;
  if (!properties) {
    return {
      system: "biome",
      groups: [],
      source: "active",
      note: "No se pudo leer el esquema de Biome del proyecto."
    };
  }
  const groups: RuleCatalogGroup[] = [];
  for (const [group, value] of Object.entries(properties)) {
    if (group === "recommended" || group === "all") continue;
    if (!isRecord(value) || !isRecord(value.properties)) continue;
    const rules = Object.keys(value.properties)
      .map((rule) => `${group}/${rule}`)
      .sort(compare);
    if (rules.length > 0) groups.push({ plugin: group, rules });
  }
  return groups.length > 0
    ? { system: "biome", groups, source: "project" }
    : {
        system: "biome",
        groups: [],
        source: "active",
        note: "El esquema de Biome no declara reglas."
      };
}

function readBiomeSchema(root: string): BiomeSchema | null {
  const candidates: string[] = [];
  try {
    const project = createRequire(path.join(root, "package.json"));
    candidates.push(
      path.join(
        path.dirname(project.resolve("@biomejs/biome/package.json")),
        "configuration_schema.json"
      )
    );
  } catch {
    // Sin paquete instalado, queda la ruta directa de node_modules.
  }
  candidates.push(
    path.join(root, "node_modules/@biomejs/biome/configuration_schema.json")
  );
  for (const file of candidates) {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8")) as BiomeSchema;
    } catch {
      // Se prueba la siguiente.
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOxlintSchema(root: string): OxlintSchema | null {
  const candidates = [
    path.join(root, "node_modules/oxlint/configuration_schema.json")
  ];
  try {
    const project = createRequire(path.join(root, "package.json"));
    candidates.push(
      path.join(path.dirname(project.resolve("oxlint/package.json")), "configuration_schema.json")
    );
  } catch {
    // Sin paquete instalado, queda la ruta directa de node_modules.
  }
  for (const file of candidates) {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8")) as OxlintSchema;
    } catch {
      // Se prueba la siguiente.
    }
  }
  return null;
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
