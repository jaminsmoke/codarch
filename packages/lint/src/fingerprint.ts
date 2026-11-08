import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { LintTool } from "./config";
import type { LintSystem } from "./format";

/**
 * La huella de lo que configura la medida (ADR 0112).
 *
 * Incluye el contenido de los ficheros de config que detectó el proyecto y los
 * comandos de las herramientas. El árbol de código no entra: eso es `meta.tree`.
 * Sirve para saber si un informe corresponde a la config actual sin guardar
 * reglas ni preferencias en `.codarch/`.
 */
export function lintConfigFingerprint(
  root: string,
  systems: readonly LintSystem[],
  tools: readonly LintTool[]
): string {
  const parts: string[] = [];
  const configs = [
    ...new Set(
      systems
        .map((system) => system.config)
        .filter((config): config is string => Boolean(config))
    )
  ].sort(compare);

  for (const config of configs) {
    const file = path.join(root, config);
    let content = "?";
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      // Una config declarada que no se puede leer también es parte de la huella.
    }
    parts.push(`config:${config}\n${content}`);
  }

  for (const tool of [...tools].sort((left, right) =>
    compare(left.name, right.name)
  )) {
    parts.push(
      `tool:${tool.name}\n${tool.command}\n${tool.format}\n${
        tool.listCommand ?? ""
      }`
    );
  }

  return createHash("md5").update(parts.join("\n--\n")).digest("hex");
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
