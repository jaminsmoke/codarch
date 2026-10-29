import { walkFiles, type CcJson, type CcNode } from "@codarch/schema";
import { DOMAIN_PROFILES, findDomainProfile } from "./profiles";

/**
 * Generador de capas y reglas, versión 0.01.
 *
 * Describe la arquitectura que el código **ya tiene**: mira el grafo de
 * dependencias, agrupa los ficheros por carpeta y deduce qué carpetas están
 * hacia dentro y cuáles hacia fuera. Con eso propone unas capas y las reglas
 * que las protegerían.
 *
 * Propone, no decide: la salida es un fragmento para `.codarch.yml` y que el
 * equipo lo revise (ADR 0023).
 */

export interface SuggestedLayer {
  name: string;
  /** Patrones de los ficheros de la capa, relativos al root. */
  patterns: string[];
  /** Cuántos ficheros tiene. */
  files: number;
  /** Capas de las que depende (hacia dentro). */
  dependsOn: string[];
  /** Capas que dependen de esta (hacia fuera). */
  usedBy: string[];
  /** 0 = la más interior. */
  depth: number;
}

export interface SuggestedRule {
  name: string;
  type: "forbidden";
  from: string;
  to: string;
  severity: "warn";
  message: string;
}

export interface Suggestion {
  /**
   * Lo que el código ya tiene: las carpetas agrupadas y su orden por
   * dependencia.
   */
  detected: SuggestedLayer[];
  /** Las capas de la propuesta (las del perfil si encaja, si no las detectadas). */
  layers: SuggestedLayer[];
  rules: SuggestedRule[];
  /**
   * De dónde sale la propuesta: de un perfil del catálogo (su convención
   * manda) o de lo que el código ya hace.
   */
  proposal: "profile" | "deduced";
  /** El perfil que se propone, si lo hay. */
  profile: string | null;
  /** Carpetas que no se han podido agrupar, para que se vean. */
  ungrouped: number;
  notes: string[];
  /** Qué perfil del catálogo encaja con lo deducido. */
  fits: ProfileFit[];
}

/** Cómo encaja un perfil del catálogo con lo que ha deducido el análisis. */
export interface ProfileFit {
  id: string;
  title: string;
  /** Capas del perfil que el repo tiene. */
  matched: number;
  /** Capas del perfil en total. */
  total: number;
  /** Porcentaje del código que cae en las capas del perfil. */
  coverage: number;
  /** Reglas del perfil que el código incumple hoy. */
  broken: string[];
}

/** Carpetas raíz que no son capas: dentro de ellas está la capa de verdad. */
const ROOT_FOLDERS = new Set([
  "src",
  "lib",
  "libs",
  "source",
  "app",
  "apps",
  "packages",
  "pkg"
]);

interface Group {
  name: string;
  pattern: string;
  files: number;
  dependsOn: Set<string>;
  usedBy: Set<string>;
}

/**
 * Sugiere capas y reglas a partir de un snapshot.
 *
 * Los ficheros sueltos en la raíz (los puntos de entrada) no forman capa: se
 * cuentan aparte.
 */
export function suggestLayers(cc: CcJson): Suggestion {
  const paths = pathsOf(cc);
  const grouping = collectGroups(
    paths,
    cc.lenses?.dependency?.edges ?? []
  );

  const layers = buildLayers(grouping.groups);
  const fits = matchProfiles(grouping.groups, grouping.edges);

  return {
    detected: layers,
    ...proposal(layers, grouping.groups, fits),
    ungrouped: grouping.ungrouped,
    notes: notesFor(grouping.ungrouped, layers.length),
    fits
  };
}

/**
 * Lo que se propone: el perfil que encaja o lo deducido del código.
 *
 * Si un perfil del catálogo encaja, su convención manda: las reglas que se
 * proponen son las del perfil, no las que se deducen del código. Un repo que
 * incumple su propia arquitectura daría unas reglas invertidas si se confiaran
 * solo en lo que el código hace.
 */
function proposal(
  layers: readonly SuggestedLayer[],
  groups: Map<string, Group>,
  fits: readonly ProfileFit[]
): Pick<Suggestion, "layers" | "rules" | "proposal" | "profile"> {
  const best = fits.find((fit) => fit.matched >= 2);
  const profile = best ? findDomainProfile(best.id) : undefined;
  if (!profile) {
    return {
      layers: [...layers],
      rules: buildRules(layers),
      proposal: "deduced",
      profile: null
    };
  }

  return {
    layers: profileLayers(profile, groups),
    rules: profileRules(profile),
    proposal: "profile",
    profile: profile.id
  };
}

/** La ruta de cada fichero, sin el nombre de la raíz del snapshot. */
function pathsOf(cc: CcJson): Map<string, string> {
  const paths = new Map<string, string>();

  for (const root of cc.files) {
    walkFiles([root], (entry) => {
      // Las rutas del snapshot llevan el nombre de la raíz; se quita igual que
      // en el diff, para que las capas sean relativas al proyecto.
      paths.set(entry.node.id, relativePath(root, entry.path));
    });
  }

  return paths;
}

/** Las carpetas agrupadas, sus dependencias y lo que no es capa. */
interface Grouping {
  groups: Map<string, Group>;
  edges: GroupEdge[];
  ungrouped: number;
}

/** Una dependencia entre dos grupos, con su dirección. */
interface GroupEdge {
  from: Group;
  to: Group;
}

/**
 * Agrupa los ficheros por carpeta y cruza el grafo de dependencias.
 *
 * Los ficheros sueltos en la raíz (los puntos de entrada) no forman capa: se
 * cuentan aparte.
 */
function collectGroups(
  paths: ReadonlyMap<string, string>,
  edges: readonly { fromId: string; toId: string }[]
): Grouping {
  const groups = new Map<string, Group>();
  let ungrouped = 0;

  for (const path of paths.values()) {
    const name = layerNameOf(path);
    if (!name) {
      ungrouped += 1;
      continue;
    }
    groupOf(groups, name).files += 1;
  }

  const groupEdges: GroupEdge[] = [];
  for (const edge of edges) {
    const from = groupForPath(paths.get(edge.fromId), groups);
    const to = groupForPath(paths.get(edge.toId), groups);
    if (!from || !to || from.name === to.name) continue;

    from.dependsOn.add(to.name);
    to.usedBy.add(from.name);
    groupEdges.push({ from, to });
  }

  return { groups, edges: groupEdges, ungrouped };
}

/**
 * La capa de una ruta: primer y segundo nivel de su carpeta.
 *
 * Devuelve `null` cuando el fichero es un punto de entrada: en la raíz del
 * proyecto o justo en la raíz del código (`src/index.ts`).
 */
function layerNameOf(path: string): string | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  // El directorio del fichero: un fichero suelto en la raíz no tiene capa.
  const directory = parts.slice(0, -1);
  if (directory.length === 0) return null;
  if (directory.length === 1 && ROOT_FOLDERS.has(directory[0] as string)) {
    return null;
  }

  return directory.slice(0, 2).join("/");
}

/** El grupo de una capa, creado si es la primera vez que aparece. */
function groupOf(groups: Map<string, Group>, name: string): Group {
  const found = groups.get(name);
  if (found) return found;

  const group: Group = {
    name,
    pattern: `${name}/**`,
    files: 0,
    dependsOn: new Set(),
    usedBy: new Set()
  };
  groups.set(name, group);
  return group;
}

/** El grupo al que pertenece un fichero, si su capa existe. */
function groupForPath(
  path: string | undefined,
  groups: Map<string, Group>
): Group | null {
  if (path === undefined) return null;
  const name = layerNameOf(path);
  return name === null ? null : groups.get(name) ?? null;
}

/** Las capas, de la más interior a la más exterior. */
function buildLayers(groups: Map<string, Group>): SuggestedLayer[] {
  return [...groups.values()]
    .map((group) => ({
      name: group.name,
      patterns: [group.pattern],
      files: group.files,
      dependsOn: [...group.dependsOn].sort(),
      usedBy: [...group.usedBy].sort(),
      depth: depthOf(group.name, groups)
    }))
    .sort(
      (left, right) =>
        left.depth - right.depth || left.name.localeCompare(right.name)
    );
}

/** Cuántos saltos separan una capa de la más interior (0 = la más interior). */
function depthOf(
  name: string,
  groups: Map<string, Group>,
  visiting = new Set<string>()
): number {
  const group = groups.get(name);
  if (!group) return 0;
  if (visiting.has(name)) return 0; // ciclo: no se puede ordenar

  visiting.add(name);
  let depth = 0;
  for (const dependency of group.dependsOn) {
    depth = Math.max(depth, depthOf(dependency, groups, visiting) + 1);
  }
  visiting.delete(name);
  return depth;
}

/** Una regla por cada dependencia que viene de fuera hacia dentro. */
function buildRules(layers: readonly SuggestedLayer[]): SuggestedRule[] {
  const rules: SuggestedRule[] = [];

  for (const layer of layers) {
    for (const outer of layer.usedBy) {
      // `outer` depende de `layer`: la dependencia va hacia dentro, así que la
      // regla protege a la interior de la exterior.
      rules.push({
        name: `${slug(layer.name)}-sin-${slug(outer)}`,
        type: "forbidden",
        from: layer.name,
        to: outer,
        severity: "warn",
        message: `${layer.name} no debe depender de ${outer}`
      });
    }
  }

  return rules.sort((left, right) => left.name.localeCompare(right.name));
}

/** Lo que hay que contar al equipo junto con la propuesta. */
function notesFor(ungrouped: number, layerCount: number): string[] {
  const notes: string[] = [];

  if (ungrouped > 0) {
    // La cuenta es de ficheros: uno solo se dice en singular.
    notes.push(
      `${ungrouped} ${ungrouped === 1 ? "fichero" : "ficheros"} en la raíz o sin carpeta: no forman capa (suelen ser puntos de entrada).`
    );
  }
  if (layerCount === 0) {
    notes.push("No se ha encontrado ninguna carpeta con código.");
  }
  if (layerCount === 1) {
    notes.push(
      "Solo hay una capa: no se puede deducir una estructura. Prueba con un perfil del catálogo."
    );
  }

  return notes;
}

/** Las capas del perfil, con los ficheros que el repo tiene en cada una. */
function profileLayers(
  profile: NonNullable<ReturnType<typeof findDomainProfile>>,
  groups: Map<string, Group>
): SuggestedLayer[] {
  return profile.layers.map((layer) => ({
    name: layer.name,
    patterns: [...layer.patterns],
    files: groupForLayer(layer, groups)?.files ?? 0,
    dependsOn: [],
    usedBy: [],
    depth: 0
  }));
}

/** Las reglas del perfil, con su mensaje ya resuelto. */
function profileRules(
  profile: NonNullable<ReturnType<typeof findDomainProfile>>
): SuggestedRule[] {
  return profile.rules.map((rule) => ({
    name: rule.name,
    type: "forbidden",
    from: rule.from,
    to: rule.to,
    severity: "warn",
    message: rule.message ?? `${rule.from} no debe depender de ${rule.to}`
  }));
}

/** El grupo del repo que corresponde a una capa del perfil. */
function groupForLayer(
  layer: { patterns: readonly string[] },
  groups: Map<string, Group>
): Group | undefined {
  for (const candidate of groups.values()) {
    if (layer.patterns.some((pattern) => covers(pattern, candidate.name))) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Qué perfil del catálogo encaja con lo deducido.
 *
 * Se comparan las capas del perfil con los grupos del repo: si el repo tiene
 * `src/domain` y el perfil espera una capa `domain`, encaja ✓. Y se mira si el
 * código ya incumple las reglas del perfil: eso es la consulta que interesa.
 */
function matchProfiles(
  groups: Map<string, Group>,
  groupEdges: ReadonlyArray<{ from: Group; to: Group }>
): ProfileFit[] {
  const totalFiles = [...groups.values()].reduce(
    (sum, group) => sum + group.files,
    0
  );

  return DOMAIN_PROFILES.map((profile) => {
    // A qué grupo del repo pertenece cada capa del perfil.
    const layerOf = new Map<string, string>();
    for (const layer of profile.layers) {
      const group = [...groups.values()].find((candidate) =>
        layer.patterns.some((pattern) => covers(pattern, candidate.name))
      );
      if (group) layerOf.set(layer.name, group.name);
    }

    const covered = [...layerOf.values()].reduce(
      (sum, name) => sum + (groups.get(name)?.files ?? 0),
      0
    );

    const broken: string[] = [];
    for (const rule of profile.rules) {
      const fromGroup = layerOf.get(rule.from);
      const toGroup = layerOf.get(rule.to);
      if (!fromGroup || !toGroup) continue;
      const violates = groupEdges.some(
        (edge) => edge.from.name === fromGroup && edge.to.name === toGroup
      );
      if (violates) broken.push(rule.message ?? `${rule.from} no puede depender de ${rule.to}`);
    }

    return {
      id: profile.id,
      title: profile.title,
      matched: layerOf.size,
      total: profile.layers.length,
      coverage: totalFiles === 0 ? 0 : Math.round((covered / totalFiles) * 100),
      broken
    };
  }).sort(
    (left, right) =>
      right.matched - left.matched ||
      right.coverage - left.coverage ||
      left.id.localeCompare(right.id)
  );
}

/** ¿El patrón del perfil cubre esa carpeta? `src/domain/**` cubre `src/domain`. */
function covers(pattern: string, name: string): boolean {
  const prefix = pattern.endsWith("/**") ? pattern.slice(0, -3) : pattern;
  return name === prefix || name.startsWith(`${prefix}/`);
}

/** Un nombre de capa puede tener `/`; en el nombre de la regla, no. */
function slug(name: string): string {
  return name.replaceAll("/", "-");
}

function relativePath(root: CcNode, fullPath: string): string {  if (fullPath === root.name) return "";
  const prefix = `${root.name}/`;
  const stripped = fullPath.startsWith(prefix)
    ? fullPath.slice(prefix.length)
    : fullPath;
  return stripped.replace(/^\/+/, "");
}
