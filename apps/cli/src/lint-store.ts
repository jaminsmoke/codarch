import fs from "node:fs";
import path from "node:path";
import {
  readLintArtifact,
  runLint,
  type LintArtifact,
  type LintProcessRunner,
  type LintToolRun
} from "@codarch/lint";
import { ensureGitignoreEntry } from "@codarch/parsers";
import { loadProjectLintTools } from "./config";

/**
 * El lint en `.codarch/` (ADR 0094).
 *
 * `codarch lint` y `serve` escriben el mismo fichero y la app lo lee: aquí
 * vive dónde está y cómo se escribe, para que los tres no lo hagan distinto.
 */

export const LINT_FILE = "lint.json";

/** El `lint.json` de una carpeta de salida. */
export function lintPath(outDirectory: string): string {
  return path.join(outDirectory, LINT_FILE);
}

/**
 * El lint que vive al lado de un `cc.json`, si lo hay (ADR 0094).
 *
 * Un `.codarch/snapshot.cc.json` tiene su `.codarch/lint.json` al lado. Un
 * `cc.json` en la raíz del repo lo tiene en `.codarch/`, que es donde lo deja
 * `codarch lint`. Un artefacto que no se entiende se ignora: quien lo pide
 * sigue sin lint.
 */
export function readLintBeside(file: string): LintArtifact | null {
  const directory = path.dirname(path.resolve(file));
  for (const candidate of [
    path.join(directory, LINT_FILE),
    lintPath(path.join(directory, ".codarch"))
  ]) {
    try {
      const raw = fs.readFileSync(candidate, "utf8");
      return readLintArtifact(JSON.parse(raw) as unknown);
    } catch {
      // Se prueba la siguiente ruta; si no hay ninguna, no hay lint.
    }
  }
  return null;
}

/** Escribe el artefacto, o devuelve `null` y deja el error dicho. */
export function writeLintArtifact(
  root: string,
  artifact: LintArtifact,
  outDirectory = path.join(root, ".codarch")
): string | null {
  const file = lintPath(outDirectory);
  try {
    // El estado es local: si `.codarch/` nace aquí, se ignora en el repo
    // (ADR 0050).
    if (
      outDirectory === path.join(root, ".codarch") &&
      !fs.existsSync(outDirectory)
    ) {
      ensureGitignoreEntry(root, ".codarch/");
    }
    fs.mkdirSync(outDirectory, { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    return file;
  } catch (error) {
    console.error(`no se pudo escribir ${file}: ${(error as Error).message}`);
    return null;
  }
}

/** Lo que midió una pasada del lint del repo. */
export interface ProjectLint {
  /** `null` si ninguna herramienta midió: entonces no hay artefacto nuevo. */
  artifact: LintArtifact | null;
  runs: LintToolRun[];
  /** El `lint.json` escrito, o `null` si no se escribió. */
  path: string | null;
}

/**
 * Linta un repo con las herramientas que declara, y escribe el artefacto.
 *
 * Devuelve `null` cuando el repo no declara ninguna herramienta: no es un
 * fallo, es que no hay lint. Un fallo de las herramientas sí se cuenta en
 * `runs`; el artefacto sale con lo que se midió.
 */
export async function runProjectLint(
  root: string,
  options: { run?: LintProcessRunner; out?: string } = {}
): Promise<ProjectLint | null> {
  const tools = loadProjectLintTools(root);
  if (tools.length === 0) return null;

  const result = await runLint({
    root,
    tools,
    ...(options.run ? { run: options.run } : {})
  });
  const out = options.out ?? path.join(root, ".codarch");
  return {
    artifact: result.artifact,
    runs: result.runs,
    path: result.artifact ? writeLintArtifact(root, result.artifact, out) : null
  };
}
