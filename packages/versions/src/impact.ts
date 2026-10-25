/**
 * Qué componentes toca un cambio (ADR 0065).
 *
 * No basta con mirar la carpeta: el escritorio, la web, el CLI y el MCP
 * comparten el motor (`packages/*`). Un cambio en `packages/parsers` afecta a
 * todos los que lo empaquetan. Por eso el impacto se calcula sobre el grafo de
 * dependencias de los workspaces.
 *
 * Es una función pura: los tests le pasan el grafo y los ficheros, y el
 * coordinador le pasa lo que saca de git.
 */

export type ComponentName =
  | "engine"
  | "cli"
  | "desktop"
  | "web"
  | "mcp"
  | "docker";

export const COMPONENT_ORDER: readonly ComponentName[] = [
  "engine",
  "cli",
  "desktop",
  "web",
  "mcp",
  "docker"
];

export interface WorkspaceInfo {
  /** El nombre del paquete (`@codarch/parsers`). */
  name: string;
  /** La carpeta relativa (`packages/parsers`). */
  directory: string;
  /** Los nombres de los workspaces de los que depende. */
  dependencies: readonly string[];
}

export interface ImpactResult {
  components: ComponentName[];
  /** Los ficheros que de verdad cuentan, ya sin tests, docs ni workflows. */
  relevant: string[];
}

/** La carpeta de cada componente publicable. */
const COMPONENT_DIRECTORIES: Partial<Record<ComponentName, string>> = {
  cli: "apps/cli",
  desktop: "apps/desktop",
  web: "apps/web",
  mcp: "apps/mcp"
};

/** Ficheros de la raíz que afectan a todo. */
const ROOT_ALL = new Set([
  "package.json",
  "package-lock.json",
  "versions.json",
  "tsconfig.json"
]);

/** Ficheros que no cambian lo que se entrega. */
function isNoise(file: string): boolean {
  if (file === "") return true;
  if (file.startsWith(".github/")) return true;
  if (file.startsWith("scripts/")) return true;
  if (file.startsWith("apps/site/")) return true;
  if (file.startsWith("docs/")) return true;
  if (file.startsWith("samples/")) return true;
  if (file.startsWith("coverage/")) return true;
  if (file.startsWith(".codarch")) return true;
  if (/(^|\/)(test|tests|__tests__|fixtures)\//.test(file)) return true;
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(file)) return true;
  if (/\.md$/.test(file)) return true;
  if (file === "AGENTS.md" || file === "LICENSE") return true;
  return false;
}

function normalize(file: string): string {
  return file.replaceAll("\\", "/").replace(/^\.\//, "");
}

/** La carpeta de workspace que contiene un fichero, la más larga. */
function ownerOf(
  file: string,
  workspaces: readonly WorkspaceInfo[]
): WorkspaceInfo | null {
  let found: WorkspaceInfo | null = null;
  for (const workspace of workspaces) {
    if (file === workspace.directory) continue;
    if (!file.startsWith(`${workspace.directory}/`)) continue;
    if (!found || workspace.directory.length > found.directory.length) {
      found = workspace;
    }
  }
  return found;
}

/** El workspace y todo lo que depende de él. */
function closure(
  root: WorkspaceInfo,
  workspaces: readonly WorkspaceInfo[]
): Set<string> {
  const byName = new Map(workspaces.map((workspace) => [workspace.name, workspace]));
  const names = new Set<string>();
  const visit = (workspace: WorkspaceInfo): void => {
    if (names.has(workspace.name)) return;
    names.add(workspace.name);
    for (const dependency of workspace.dependencies) {
      const next = byName.get(dependency);
      if (next) visit(next);
    }
  };
  visit(root);
  return names;
}

/**
 * Los componentes afectados por una lista de ficheros cambiados.
 *
 * `changedFiles` son rutas relativas a la raíz del repo.
 */
export function impactedComponents(
  changedFiles: readonly string[],
  workspaces: readonly WorkspaceInfo[]
): ImpactResult {
  const relevant = changedFiles.map(normalize).filter((file) => !isNoise(file));
  if (relevant.length === 0) return { components: [], relevant };

  const all = new Set<ComponentName>(COMPONENT_ORDER);
  let everything = false;
  let dockerOnly = false;
  const changed = new Set<string>();
  const changedPlugins = relevant.some((file) => file.startsWith("plugins/"));

  for (const file of relevant) {
    if (ROOT_ALL.has(file)) {
      everything = true;
      continue;
    }
    if (file === "Dockerfile" || file === "docker-compose.yml" || file.startsWith(".dockerignore")) {
      dockerOnly = true;
      continue;
    }
    if (file.startsWith("plugins/")) continue;
    const workspace = ownerOf(file, workspaces);
    if (workspace) changed.add(workspace.name);
  }

  if (everything) return { components: [...all], relevant };

  const components = new Set<ComponentName>();
  for (const [component, directory] of Object.entries(COMPONENT_DIRECTORIES)) {
    const root = workspaces.find((workspace) => workspace.directory === directory);
    if (!root) continue;
    const dependencies = closure(root, workspaces);
    if ([...changed].some((name) => dependencies.has(name))) {
      components.add(component as ComponentName);
    }
    if (
      changedPlugins &&
      (component === "desktop" || component === "web") &&
      dependencies.has("@codarch/plugin-api")
    ) {
      components.add(component as ComponentName);
    }
  }

  const changedNames = [...changed];
  const engineChanged =
    changedPlugins ||
    changedNames.some((name) =>
      workspaces.some(
        (workspace) =>
          workspace.name === name && workspace.directory.startsWith("packages/")
      )
    );
  if (engineChanged) components.add("engine");
  // La app web viaja dentro del paquete del CLI: si cambia la web, el CLI
  // tiene que publicarse para entregarla (ADR 0065).
  if (components.has("web")) components.add("cli");
  if (components.has("cli") || components.has("web")) {
    components.add("docker");
  }
  if (dockerOnly) components.add("docker");

  return {
    components: COMPONENT_ORDER.filter((component) => components.has(component)),
    relevant
  };
}
