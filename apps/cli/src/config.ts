import path from "node:path";
import { loadLintConfig, type LintTool } from "@codarch/lint";
import { findProjectConfig, loadIgnoreConfig } from "@codarch/metrics";

/** El `.codarch.yml` de una raíz de análisis, si existe. */
export function defaultConfigPath(root = "."): string | undefined {
  return findProjectConfig(root);
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

/**
 * Las herramientas del bloque `lint:` (ADR 0094).
 *
 * Sin configuración no hay herramientas: el repo no linta. Un bloque mal
 * formado sí es un error, y lo dice `loadLintConfig`.
 */
export function loadProjectLintTools(
  root: string,
  options: { config?: string; noConfig?: boolean } = {}
): LintTool[] {
  if (options.noConfig) return [];
  const file = options.config
    ? path.resolve(options.config)
    : defaultConfigPath(root);
  return file ? loadLintConfig(file) : [];
}
