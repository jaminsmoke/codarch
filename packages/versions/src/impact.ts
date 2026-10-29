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
  "package-lock.json",
  "versions.json",
  "tsconfig.json"
]);

/** Carpetas cuyo contenido no se entrega: docs, pruebas, CI y muestras. */
const NOISE_PREFIXES: readonly string[] = [
  ".github/",
  "scripts/",
  "apps/site/",
  "docs/",
  "samples/",
  "coverage/",
  ".codarch"
];

/** Ficheros sueltos que tampoco cambian lo que se entrega. */
const NOISE_FILES: ReadonlySet<string> = new Set(["", "AGENTS.md", "LICENSE"]);

/** Formas de nombre que no son código entregable. */
const NOISE_PATTERNS: readonly RegExp[] = [
  /(^|\/)(test|tests|__tests__|fixtures)\//,
  /\.(test|spec)\.[cm]?[jt]sx?$/,
  /\.md$/
];

/** Ficheros que no cambian lo que se entrega. */
function isNoise(file: string): boolean {
  if (NOISE_FILES.has(file)) return true;
  if (NOISE_PREFIXES.some((prefix) => file.startsWith(prefix))) return true;
  return NOISE_PATTERNS.some((pattern) => pattern.test(file));
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
/** Lo que dicen los ficheros, antes de mirar el grafo. */
interface ChangeSet {
  /** Los workspaces tocados, por nombre. */
  changed: Set<string>;
  /** Un fichero de la raíz que afecta a todo. */
  everything: boolean;
  /** Solo cambia el empaquetado. */
  dockerOnly: boolean;
  /** Se tocó algún plugin del repo. */
  plugins: boolean;
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

  const changes = classify(relevant, workspaces);
  if (changes.everything) return { components: [...COMPONENT_ORDER], relevant };

  const components = directComponents(changes, workspaces);
  if (engineTouched(changes, workspaces)) components.add("engine");

  const affected = propagate(components, changes.dockerOnly);
  return {
    components: COMPONENT_ORDER.filter((component) => affected.has(component)),
    relevant
  };
}

/** Reparte los ficheros en lo que tocan: workspaces, todo, Docker o plugins. */
function classify(
  relevant: readonly string[],
  workspaces: readonly WorkspaceInfo[]
): ChangeSet {
  const changes: ChangeSet = {
    changed: new Set(),
    everything: false,
    dockerOnly: false,
    plugins: false
  };

  for (const file of relevant) {
    if (ROOT_ALL.has(file)) {
      changes.everything = true;
      continue;
    }
    if (isPackaging(file)) {
      changes.dockerOnly = true;
      continue;
    }
    if (file.startsWith("plugins/")) {
      changes.plugins = true;
      continue;
    }
    const workspace = ownerOf(file, workspaces);
    if (workspace) changes.changed.add(workspace.name);
  }

  return changes;
}

/** Los ficheros del contenedor: cambian cómo se empaqueta, no qué. */
function isPackaging(file: string): boolean {
  return (
    file === "Dockerfile" ||
    file === "docker-compose.yml" ||
    file.startsWith(".dockerignore")
  );
}

/** Los componentes cuyo workspace, o alguna dependencia suya, cambió. */
function directComponents(
  changes: ChangeSet,
  workspaces: readonly WorkspaceInfo[]
): Set<ComponentName> {
  const components = new Set<ComponentName>();

  for (const [component, directory] of Object.entries(COMPONENT_DIRECTORIES)) {
    const root = workspaces.find((workspace) => workspace.directory === directory);
    if (!root) continue;

    const dependencies = closure(root, workspaces);
    const touched = [...changes.changed].some((name) => dependencies.has(name));
    if (touched || packagesPlugins(component, changes.plugins, dependencies)) {
      components.add(component as ComponentName);
    }
  }

  return components;
}

/**
 * Si el componente entrega plugins: la web y el escritorio, si llevan la API.
 *
 * Un cambio en `plugins/` no es de ningún workspace; llega por aquí.
 */
function packagesPlugins(
  component: string,
  pluginsChanged: boolean,
  dependencies: Set<string>
): boolean {
  if (!pluginsChanged) return false;
  if (component !== "desktop" && component !== "web") return false;
  return dependencies.has("@codarch/plugin-api");
}

/** Si el motor cambió: cualquier paquete del repo o un plugin. */
function engineTouched(
  changes: ChangeSet,
  workspaces: readonly WorkspaceInfo[]
): boolean {
  if (changes.plugins) return true;
  return workspaces.some(
    (workspace) =>
      workspace.directory.startsWith("packages/") &&
      changes.changed.has(workspace.name)
  );
}

/**
 * Lo que arrastra haber tocado la web o el CLI (ADR 0065).
 *
 * La app web viaja dentro del paquete del CLI: si cambia la web, el CLI tiene
 * que publicarse para entregarla. Los dos se sirven con la imagen de Docker.
 */
function propagate(
  components: Set<ComponentName>,
  dockerOnly: boolean
): Set<ComponentName> {
  if (components.has("web")) components.add("cli");
  if (components.has("cli") || components.has("web")) components.add("docker");
  if (dockerOnly) components.add("docker");
  return components;
}
