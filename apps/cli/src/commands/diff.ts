import path from "node:path";
import { ConfigError, loadRuleConfig, type RuleConfig } from "@codarch/metrics";
import { ruleConfigAddon } from "@codarch/addons";
import { loadAddons } from "@codarch/addons/node";
import { CcJsonError, parseCcJson, type CcJson } from "@codarch/schema";
import { defaultConfigPath } from "../config";
import { readJsonFile } from "../io";
import { compareSnapshots } from "./compare";

export type FailOn =
  | "none"
  | "cycles"
  | "violations"
  | "hotspots"
  | "any";

export interface DiffCommandOptions {
  base?: string;
  head?: string;
  out?: string;
  top?: number;
  hotspotMetric?: string;
  failOn?: FailOn;
  /** Fichero YAML; si falta, se busca `.codarch.yml` en el cwd. */
  config?: string;
  noConfig?: boolean;
  help: boolean;
}

export function runDiff(options: DiffCommandOptions): number {
  if (!options.base || !options.head) {
    console.error(
      "faltan los dos snapshots\n\n  codarch diff <base.cc.json> <head.cc.json> [-o report.json]"
    );
    return 1;
  }

  const base = loadSnapshot(options.base);
  if (!base) return 1;
  const head = loadSnapshot(options.head);
  if (!head) return 1;

  let rules: RuleConfig | undefined;
  let configPath: string | undefined;
  try {
    if (!options.noConfig) {
      configPath = options.config ?? defaultConfigPath();
      if (configPath) {
        // Los addons viven al lado de la configuración (ADR 0029): el archivo
        // dice cuáles, y aquí se cargan para que sus reglas entren.
        const loaded = loadAddons(path.dirname(path.resolve(configPath)));
        for (const error of loaded.errors) {
          console.error(`aviso: ${error.message}`);
        }
        rules = loadRuleConfig(configPath, loaded.addons.map(ruleConfigAddon));
      }
    }
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`configuración inválida: ${error.message}`);
      return 1;
    }
    throw error;
  }

  return compareSnapshots(base, head, {
    out: options.out,
    top: options.top,
    hotspotMetric: options.hotspotMetric,
    failOn: options.failOn,
    rules,
    configPath,
    baseLabel: options.base,
    headLabel: options.head,
    title: "diff"
  });
}

function loadSnapshot(file: string): CcJson | null {
  let loaded;
  try {
    loaded = readJsonFile(file);
  } catch (error) {
    console.error(`no se pudo leer ${file}: ${(error as Error).message}`);
    return null;
  }

  try {
    return parseCcJson(loaded.json);
  } catch (error) {
    if (error instanceof CcJsonError) {
      console.error(`cc.json inválido en ${file}: ${error.message}`);
      return null;
    }
    throw error;
  }
}
