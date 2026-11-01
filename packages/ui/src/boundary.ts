/**
 * La frontera de una carpeta: qué aristas la cruzan y qué ciclos la tocan
 * (ADR 0092).
 *
 * El mapa guarda el grafo ya resuelto: `edges` —quién importa a quién— y
 * `cycles` —la arista que cierra cada ciclo—. Una carpeta no tiene grafo
 * propio, así que se parte el del mapa por dentro y fuera. Aquí no se agrega
 * nada que el snapshot no traiga.
 *
 * Una arista va de `from` a `to` y `from` depende de `to`, como en la ficha del
 * fichero: **salir** es apuntar fuera y **entrar** es que apunten a dentro. Los
 * ciclos se cuentan por aristas de cierre, que es lo que el modelo guarda: el
 * ciclo entero no está en el mapa, y decir su tamaño sería inventarlo.
 */

import { withinLintFolder } from "@codarch/lint/browser";
import type { EdgePair } from "@codarch/render/browser";

/** Lo mínimo del mapa que hace falta: el modelo del mapa lo cumple tal cual. */
export interface FolderGraph {
  files: ReadonlyArray<{ path: string }>;
  edges: readonly EdgePair[];
  cycles: readonly EdgePair[];
}

/** Un fichero de fuera que sostiene aristas con la carpeta. */
export interface BoundaryFile {
  path: string;
  /** Cuántas aristas le tocan: dos imports del mismo fichero cuentan dos. */
  edges: number;
}

export interface FolderBoundary {
  /** Aristas con los dos extremos dentro: la vida interna de la carpeta. */
  internal: number;
  /** Ficheros de fuera que dependen de la carpeta. */
  incoming: BoundaryFile[];
  /** Ficheros de fuera de los que depende la carpeta. */
  outgoing: BoundaryFile[];
}

export interface FolderCycles {
  /** Aristas que cierran un ciclo enteramente dentro. */
  inside: number;
  /** Aristas de un ciclo que cruza la frontera, con el fichero de fuera. */
  crossing: BoundaryFile[];
}

/** Suma una arista al fichero de fuera que la sostiene. */
function bump(counts: Map<string, number>, path: string): void {
  counts.set(path, (counts.get(path) ?? 0) + 1);
}

/** Los ficheros de fuera, por ruta: la lista no depende del orden del grafo. */
function listed(counts: Map<string, number>): BoundaryFile[] {
  return [...counts.entries()]
    .map(([path, edges]) => ({ path, edges }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

/** Las aristas de fuera que tocan una carpeta, sin contar las internas. */
function splitEdges(
  graph: FolderGraph,
  folder: string
): {
  internal: number;
  incoming: Map<string, number>;
  outgoing: Map<string, number>;
} {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  let internal = 0;

  for (const edge of graph.edges) {
    const from = graph.files[edge.from];
    const to = graph.files[edge.to];
    // Una arista que apunta a un fichero que el mapa no tiene no se cuenta:
    // el snapshot ya avisa de ella y contarla daría una frontera falsa.
    if (!from || !to) continue;

    const fromInside = withinLintFolder(folder, from.path);
    const toInside = withinLintFolder(folder, to.path);
    if (fromInside && toInside) internal++;
    else if (fromInside) bump(outgoing, to.path);
    else if (toInside) bump(incoming, from.path);
  }

  return { internal, incoming, outgoing };
}

/** Dentro, entrantes desde fuera y salientes hacia fuera. */
export function folderBoundary(graph: FolderGraph, folder: string): FolderBoundary {
  const { internal, incoming, outgoing } = splitEdges(graph, folder);
  return { internal, incoming: listed(incoming), outgoing: listed(outgoing) };
}

/** Los ciclos que caen dentro y los que cruzan la frontera. */
export function folderCycles(graph: FolderGraph, folder: string): FolderCycles {
  const crossing = new Map<string, number>();
  let inside = 0;

  for (const edge of graph.cycles) {
    const from = graph.files[edge.from];
    const to = graph.files[edge.to];
    if (!from || !to) continue;

    const fromInside = withinLintFolder(folder, from.path);
    const toInside = withinLintFolder(folder, to.path);
    if (fromInside && toInside) inside++;
    else if (fromInside) bump(crossing, to.path);
    else if (toInside) bump(crossing, from.path);
  }

  return { inside, crossing: listed(crossing) };
}

/** El reparto de una frontera en una línea: `12 dentro · 3 entrantes`. */
export function boundarySummary(boundary: FolderBoundary): string {
  const parts: string[] = [];
  const entering = edgesOf(boundary.incoming);
  const leaving = edgesOf(boundary.outgoing);

  if (boundary.internal > 0) parts.push(`${boundary.internal} dentro`);
  if (entering > 0) parts.push(`${entering} ${entering === 1 ? "entrante" : "entrantes"}`);
  if (leaving > 0) parts.push(`${leaving} ${leaving === 1 ? "saliente" : "salientes"}`);

  return parts.length === 0 ? "sin aristas" : parts.join(" · ");
}

/** El reparto de los ciclos: `2 dentro · 1 que cruza`. */
export function cyclesSummary(cycles: FolderCycles): string {
  const parts: string[] = [];
  const crossing = edgesOf(cycles.crossing);

  if (cycles.inside > 0) parts.push(`${cycles.inside} dentro`);
  if (crossing > 0) parts.push(`${crossing} ${crossing === 1 ? "que cruza" : "que cruzan"}`);

  return parts.length === 0 ? "sin ciclos" : parts.join(" · ");
}

/** Las aristas que sostienen una lista de ficheros de fuera. */
export function edgesOf(files: readonly BoundaryFile[]): number {
  return files.reduce((sum, file) => sum + file.edges, 0);
}
