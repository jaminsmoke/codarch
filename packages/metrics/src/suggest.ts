import { walkFiles, type CcJson, type CcNode } from "@codarch/schema";

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
  /** Patrón de los ficheros de la capa, relativo al root. */
  pattern: string;
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
  /** Las capas, de la más interior a la más exterior. */
  layers: SuggestedLayer[];
  rules: SuggestedRule[];
  /** Carpetas que no se han podido agrupar, para que se vean. */
  ungrouped: number;
  notes: string[];
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
  const paths = new Map<string, string>();
  for (const root of cc.files) {
    walkFiles([root], (entry) => {
      // Las rutas del snapshot llevan el nombre de la raíz; se quita igual que
      // en el diff, para que las capas sean relativas al proyecto.
      paths.set(entry.node.id, relativePath(root, entry.path));
    });
  }

  const edges = cc.lenses?.dependency?.edges ?? [];
  const groups = new Map<string, Group>();
  let ungrouped = 0;

  const groupOf = (path: string): Group | null => {
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    // El directorio del fichero: un fichero suelto en la raíz no tiene capa.
    const directory = parts.slice(0, -1);
    if (directory.length === 0) {
      ungrouped += 1;
      return null;
    }
    // Un fichero justo en la raíz del código (src/index.ts) es un punto de
    // entrada, no una capa.
    if (directory.length === 1 && ROOT_FOLDERS.has(directory[0] as string)) {
      ungrouped += 1;
      return null;
    }
    // La capa es el primer nivel y el segundo: "src/domain", "packages/parsers".
    const name = directory.slice(0, 2).join("/");
    let group = groups.get(name);
    if (!group) {
      group = {
        name,
        pattern: `${name}/**`,
        files: 0,
        dependsOn: new Set(),
        usedBy: new Set()
      };
      groups.set(name, group);
    }
    group.files += 1;
    return group;
  };

  for (const path of paths.values()) groupOf(path);

  for (const edge of edges) {
    const fromPath = paths.get(edge.fromId);
    const toPath = paths.get(edge.toId);
    if (!fromPath || !toPath) continue;
    const from = groupOf(fromPath);
    const to = groupOf(toPath);
    if (!from || !to || from.name === to.name) continue;
    from.dependsOn.add(to.name);
    to.usedBy.add(from.name);
  }

  const depthOf = (name: string, visiting = new Set<string>()): number => {
    const group = groups.get(name);
    if (!group) return 0;
    if (visiting.has(name)) return 0; // ciclo: no se puede ordenar
    visiting.add(name);
    let depth = 0;
    for (const dependency of group.dependsOn) {
      depth = Math.max(depth, depthOf(dependency, visiting) + 1);
    }
    visiting.delete(name);
    return depth;
  };

  const layers: SuggestedLayer[] = [...groups.values()]
    .map((group) => ({
      name: group.name,
      pattern: group.pattern,
      files: group.files,
      dependsOn: [...group.dependsOn].sort(),
      usedBy: [...group.usedBy].sort(),
      depth: depthOf(group.name)
    }))
    .sort((left, right) => left.depth - right.depth || left.name.localeCompare(right.name));

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
  rules.sort((left, right) => left.name.localeCompare(right.name));

  const notes: string[] = [];
  if (ungrouped > 0) {
    notes.push(
      `${ungrouped} ficheros en la raíz o sin carpeta: no forman capa (suelen ser puntos de entrada).`
    );
  }
  if (layers.length === 0) {
    notes.push("No se ha encontrado ninguna carpeta con código.");
  }
  if (layers.length === 1) {
    notes.push(
      "Solo hay una capa: no se puede deducir una estructura. Prueba con un perfil del catálogo."
    );
  }

  return { layers, rules, ungrouped, notes };
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
