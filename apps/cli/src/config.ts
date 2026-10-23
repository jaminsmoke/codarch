import { existsSync } from "node:fs";
import path from "node:path";
import { loadIgnoreConfig } from "@codarch/metrics";

/** El `.codarch.yml` de una raíz de análisis, si existe. */
export function defaultConfigPath(root = "."): string | undefined {
  for (const file of [".codarch.yml", ".codarch.yaml"]) {
    const candidate = path.resolve(root, file);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Los patrones de alcance de un proyecto (ADR 0038).
 *
 * El `--config` explícito se resuelve desde el cwd, como en `diff`; el
 * defecto se busca en la raíz que se va a analizar.
 */
export function loadProjectIgnore(
  root: string,
  options: { config?: string; noConfig?: boolean } = {}
): string[] {
  if (options.noConfig) return [];
  const file = options.config
    ? path.resolve(options.config)
    : defaultConfigPath(root);
  return file ? loadIgnoreConfig(file) : [];
}
