import fs from "node:fs";
import path from "node:path";
import { LintError } from "./format";
import { detectLintSystems } from "./project";

/**
 * La escritura de una regla en la config del proyecto (ADR 0111).
 *
 * Solo formatos que se pueden leer y validar. La primera herramienta es oxlint
 * en JSON: no se toca un `eslint.config.js` que es código.
 */
export interface LintRuleChange {
  system: string;
  rule: string;
  /** `null` desactiva la regla; `error` o `warn` la activan. */
  severity: "error" | "warn" | null;
}

export interface LintRuleWrite {
  /** Ruta relativa de la config, con `/`. */
  path: string;
  before: string;
  after: string;
}

const RULE = /^[A-Za-z0-9@/._-]+$/;

/**
 * Activa o desactiva una regla de oxlint en el JSON del proyecto.
 *
 * Desactivar una regla explícita la quita; si puede venir de una categoría,
 * se escribe `off` para no depender de lo que la categoría encienda.
 */
export function writeLintRule(
  root: string,
  change: LintRuleChange
): LintRuleWrite {
  if (change.system !== "oxlint") {
    throw new LintError(
      `la escritura de reglas todavía no soporta "${change.system}"; solo oxlint en JSON`
    );
  }
  if (!RULE.test(change.rule)) {
    throw new LintError(`regla inválida: "${change.rule}"`);
  }

  const system = detectLintSystems(root).find((item) => item.name === "oxlint");
  if (!system?.config) {
    throw new LintError("oxlint no declara archivo de configuración");
  }
  if (!/\.json$/i.test(system.config)) {
    throw new LintError(
      `la config de oxlint (${system.config}) no es JSON editable`
    );
  }

  const file = path.join(root, system.config);
  let before: string;
  try {
    before = fs.readFileSync(file, "utf8");
  } catch (error) {
    throw new LintError(
      `no se pudo leer ${system.config}: ${(error as Error).message}`
    );
  }

  let document: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(before);
    if (!isRecord(parsed)) throw new Error("no es un objeto");
    document = parsed;
  } catch (error) {
    throw new LintError(
      `${system.config} no es un JSON válido: ${(error as Error).message}`
    );
  }

  const rules = isRecord(document.rules) ? { ...document.rules } : {};
  if (change.severity === null) {
    const explicit = Object.prototype.hasOwnProperty.call(rules, change.rule);
    if (explicit && !categoriesOn(document.categories)) {
      delete rules[change.rule];
    } else {
      rules[change.rule] = "off";
    }
  } else {
    rules[change.rule] = change.severity;
  }

  const after = `${JSON.stringify({ ...document, rules }, null, 2)}\n`;
  writeAtomic(file, after);
  return { path: system.config, before, after };
}

/** Restaura el contenido anterior de una escritura, si se conserva. */
export function restoreLintRule(
  root: string,
  relative: string,
  before: string
): void {
  const file = path.join(root, relative);
  writeAtomic(file, before);
}

function writeAtomic(file: string, content: string): void {
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, content, "utf8");
    fs.renameSync(temporary, file);
  } catch (error) {
    try {
      fs.rmSync(temporary, { force: true });
    } catch {
      // El temporal es lo de menos; el error que importa es el de la escritura.
    }
    throw new LintError(
      `no se pudo escribir ${path.basename(file)}: ${(error as Error).message}`
    );
  }
}

/** Alguna categoría de oxlint enciende reglas además de `rules`. */
function categoriesOn(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Object.values(value).some((entry) => {
    const first = Array.isArray(entry) ? entry[0] : entry;
    return first !== "off" && first !== "allow";
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
