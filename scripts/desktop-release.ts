import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  compareVersions,
  parseVersion,
  versionInTag
} from "../packages/versions/src/index.ts";

/**
 * Decide si el push actual tiene que construir y publicar el escritorio.
 *
 * La fuente de la versión es `versions.json` (ADR 0041). La referencia es el
 * último release del escritorio en GitHub. Si la versión del escritorio no es
 * mayor, no se construye: un push de código que no sube versión no debe gastar
 * dos builds de Electron.
 */
export interface DesktopReleasePlan {
  /** La versión del escritorio en `versions.json`. */
  version: string;
  /** La última versión publicada, o `null` si no hay ningún release. */
  latest: string | null;
  /** Hay que construir y publicar. */
  shouldRelease: boolean;
  /** Hay que construir aunque no haya que publicar (PR o prueba manual). */
  shouldBuild: boolean;
}

/**
 * Las versiones de las etiquetas del escritorio, ordenadas de menor a mayor.
 *
 * Las nuevas usan `v<versión>` porque electron-updater exige una etiqueta
 * semver. `desktop-v*` se conserva para las releases anteriores ✓.
 */
export function desktopVersions(tags: string[]): string[] {
  return tags
    .filter((tag) => /^(?:desktop-)?v\d/.test(tag))
    .map((tag) => versionInTag(tag))
    .filter((version) => parseVersion(version) !== null)
    .sort(compareVersions);
}

/**
 * El plan de una ejecución.
 *
 * `eventName` es el de GitHub Actions. Un PR y un `workflow_dispatch` siempre
 * construyen: el primero para validar, el segundo para poder probar los
 * instaladores sin publicar. Un push solo construye cuando hay versión nueva.
 */
export function planDesktopRelease(
  version: string,
  tags: string[],
  eventName: string
): DesktopReleasePlan {
  const versions = desktopVersions(tags);
  const latest = versions.at(-1) ?? null;
  const shouldRelease =
    latest === null || compareVersions(version, latest) > 0;
  const shouldBuild =
    shouldRelease ||
    eventName === "pull_request" ||
    eventName === "workflow_dispatch";

  return { version, latest, shouldRelease, shouldBuild };
}

function readTags(): string[] {
  const raw = process.env.DESKTOP_TAGS ?? "[]";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`DESKTOP_TAGS no es JSON: ${raw}`);
  }
  if (!Array.isArray(parsed) || parsed.some((tag) => typeof tag !== "string")) {
    throw new Error("DESKTOP_TAGS debe ser una lista de etiquetas");
  }
  return parsed;
}

function main(): void {
  const root = path.resolve(import.meta.dirname, "..");
  const versions = JSON.parse(
    fs.readFileSync(path.join(root, "versions.json"), "utf8")
  ) as { desktop: string };
  const plan = planDesktopRelease(
    versions.desktop,
    readTags(),
    process.env.GITHUB_EVENT_NAME ?? ""
  );

  const lines = [
    `version=${plan.version}`,
    `latest=${plan.latest ?? ""}`,
    `should_release=${plan.shouldRelease}`,
    `should_build=${plan.shouldBuild}`
  ];
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
  }
  console.log(lines.join("\n"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
