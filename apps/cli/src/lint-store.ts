import fs from "node:fs";
import path from "node:path";
import {
  LINT_ARTIFACT_FILE,
  LINT_ARTIFACT_FILE_LEGACY,
  readLintArtifact,
  runLint,
  type LintArtifact,
  type LintProcessRunner,
  type LintToolRun
} from "@codarch/lint";
import { ensureGitignoreEntry } from "@codarch/parsers";
import { planProjectLint, planSystems } from "./lint-plan";

/**
 * El lint en `.codarch/` (ADR 0094).
 *
 * `codarch analyze`, `codarch lint` y `serve` escriben el mismo fichero y la
 * app lo lee: aquí vive dónde está y cómo se escribe, para que los tres no lo
 * hagan distinto.
 */

export const LINT_FILE = LINT_ARTIFACT_FILE;

/** El `lint.cc.json` de una carpeta de salida. */
export function lintPath(outDirectory: string): string {
  return path.join(outDirectory, LINT_FILE);
}

/**
 * Lee un artefacto de una ruta, o `null` si no está o no se entiende.
 *
 * Un fichero viejo, de otra versión o escrito a mano deja al que lo pide sin
 * lint: nunca se completa con una lista plausible.
 */
function readArtifactAt(file: string): LintArtifact | null {
  try {
    const raw = fs.readFileSync(file, "utf8");
    return readLintArtifact(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

/**
 * El lint guardado en el `.codarch/` de un repo, si lo hay (ADR 0094).
 *
 * Se lee el `lint.cc.json` primero y el nombre anterior después; un artefacto
 * que no se entiende es como no tenerlo.
 */
export function readProjectLint(
  root: string,
  outDirectory = path.join(root, ".codarch")
): LintArtifact | null {
  for (const name of [LINT_FILE, LINT_ARTIFACT_FILE_LEGACY]) {
    const artifact = readArtifactAt(path.join(outDirectory, name));
    if (artifact) return artifact;
  }
  return null;
}

/**
 * El lint que vive al lado de un `cc.json`, si lo hay (ADR 0094).
 *
 * Un `.codarch/snapshot.cc.json` tiene su `.codarch/lint.cc.json` al lado. Un
 * `cc.json` en la raíz del repo lo tiene en `.codarch/`, que es donde lo deja
 * `codarch lint`. Se sigue leyendo `lint.json`, el nombre anterior, para los
 * repos que ya lo tienen. Un artefacto que no se entiende se ignora.
 */
export function readLintBeside(file: string): LintArtifact | null {
  const directory = path.dirname(path.resolve(file));
  for (const base of [directory, path.join(directory, ".codarch")]) {
    for (const name of [LINT_FILE, LINT_ARTIFACT_FILE_LEGACY]) {
      const artifact = readArtifactAt(path.join(base, name));
      if (artifact) return artifact;
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
  /** El `lint.cc.json` escrito, o `null` si no se escribió. */
  path: string | null;
}

/**
 * Linta un repo con las herramientas que declara, y escribe el artefacto.
 *
 * Devuelve `null` cuando el repo no declara ninguna herramienta: no es un
 * fallo, es que no hay lint. Un fallo de las herramientas sí se cuenta en
 * `runs`; el artefacto sale con lo que se midió.
 *
 * `tree` es el checksum del snapshot que se está sirviendo (ADR 0098): el
 * artefacto dice de qué árbol es, y la app puede avisar cuando no cuadra con el
 * mapa que tiene delante.
 */
export async function runProjectLint(
  root: string,
  options: { run?: LintProcessRunner; out?: string; tree?: string } = {}
): Promise<ProjectLint | null> {
  const plan = planProjectLint(root);
  if (plan.tools.length === 0) return null;

  const systems = await planSystems(
    root,
    plan,
    options.run ? { run: options.run } : {}
  );
  const result = await runLint({
    root,
    tools: plan.tools,
    systems,
    ...(options.run ? { run: options.run } : {}),
    ...(options.tree ? { tree: options.tree } : {})
  });
  const out = options.out ?? path.join(root, ".codarch");
  return {
    artifact: result.artifact,
    runs: result.runs,
    path: result.artifact ? writeLintArtifact(root, result.artifact, out) : null
  };
}
