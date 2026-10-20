import { performance } from "node:perf_hooks";
import { diffSnapshots } from "@codarch/metrics";
import {
  fileId,
  folderId,
  type CcEdge,
  type CcJson,
  type CcNode
} from "@codarch/schema";

const FILES = Number(process.env.FILES ?? 2_000);
const FOLDERS = Number(process.env.FOLDERS ?? 40);
const ITERATIONS = Number(process.env.ITERATIONS ?? 5);
const filesPerFolder = Math.ceil(FILES / FOLDERS);
const numberFormat = new Intl.NumberFormat("es-ES");

function num(value: number): string {
  return numberFormat.format(value);
}

function formatMs(value: number): string {
  return value < 1000 ? `${value.toFixed(1)} ms` : `${(value / 1000).toFixed(2)} s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function buildSnapshot(version: "base" | "head"): CcJson {
  const root: CcNode = {
    id: folderId(""),
    name: "bench",
    type: "Folder",
    children: []
  };
  const folders = new Map<string, CcNode>([["", root]]);
  const attributes: Record<string, Record<string, number>> = {};
  const edges: CcEdge[] = [];
  const pathsByFolder: string[][] = [];

  const addFile = (filePath: string, metrics: Record<string, number>): void => {
    const segments = filePath.split("/");
    const leaf = segments.pop();
    if (!leaf) return;

    let parent = root;
    let parentPath = "";
    for (const segment of segments) {
      const folderPath = parentPath ? `${parentPath}/${segment}` : segment;
      let folder = folders.get(folderPath);
      if (!folder) {
        folder = {
          id: folderId(folderPath),
          name: segment,
          type: "Folder",
          children: []
        };
        folders.set(folderPath, folder);
        parent.children?.push(folder);
      }
      parent = folder;
      parentPath = folderPath;
    }

    const node: CcNode = { id: fileId(filePath), name: leaf, type: "File" };
    parent.children?.push(node);
    attributes[node.id] = metrics;
  };

  for (let folder = 0; folder < FOLDERS; folder++) {
    const paths: string[] = [];
    for (let index = 0; index < filesPerFolder; index++) {
      if (folder * filesPerFolder + index >= FILES) break;
      const filePath = `src/module-${folder}/file-${index}.ts`;
      const metrics = {
        rloc: 10 + (index % 7),
        maxComplexity: 1 + (index % 5),
        number_of_commits: 1 + (index % 3)
      };
      if (version === "head" && index % 20 === 0) {
        metrics.rloc += 10;
        metrics.maxComplexity += 5;
      }
      addFile(filePath, metrics);
      paths.push(filePath);
    }
    pathsByFolder.push(paths);
  }

  const addEdge = (from: string, to: string, cyclic = false): void => {
    edges.push({
      fromId: fileId(from),
      toId: fileId(to),
      attributes: { weight: 1, typeOnly: 0 },
      isCyclic: cyclic
    });
  };

  for (let folder = 0; folder < pathsByFolder.length; folder++) {
    const paths = pathsByFolder[folder] as string[];
    for (let index = 1; index < paths.length; index++) {
      addEdge(paths[index - 1] as string, paths[index] as string);
    }
    if (folder > 0) {
      const previous = pathsByFolder[folder - 1] as string[];
      addEdge(previous[previous.length - 1] as string, paths[0] as string);
    }
  }

  if (version === "head") {
    const firstFolder = pathsByFolder[0] as string[];
    addEdge(
      firstFolder[firstFolder.length - 1] as string,
      firstFolder[0] as string,
      true
    );

    for (let index = 0; index < 10; index++) {
      const filePath = `src/new/file-${index}.ts`;
      addFile(filePath, {
        rloc: 8 + index,
        maxComplexity: 2 + index,
        number_of_commits: 0
      });
      addEdge(filePath, firstFolder[0] as string);
    }
  }

  return {
    meta: {
      projectName: "bench",
      apiVersion: "2.0",
      checksum: version
    },
    files: [root],
    lenses: {
      metrics: { attributes },
      dependency: {
        edges,
        attributeDescriptors: {},
        attributeTypes: { weight: "absolute", typeOnly: "absolute" }
      }
    }
  };
}

const base = buildSnapshot("base");
const head = buildSnapshot("head");

// Calentamiento: la primera llamada paga la compilación JIT.
diffSnapshots(base, head);
const times: number[] = [];
let report = diffSnapshots(base, head);

for (let iteration = 0; iteration < ITERATIONS; iteration++) {
  const started = performance.now();
  report = diffSnapshots(base, head);
  times.push(performance.now() - started);
}

const duration = median(times);
const reportBytes = Buffer.byteLength(JSON.stringify(report), "utf8");
const memory = process.memoryUsage();

console.log("");
console.log("  CodArch · benchmark diff");
console.log("");
console.log(
  `  snapshots     ${num(base.files.length)} raíz · ${num(
    Object.keys(base.lenses?.metrics?.attributes ?? {}).length
  )} ficheros · ${num(base.lenses?.dependency?.edges?.length ?? 0)} aristas`
);
console.log(
  `  head          ${num(
    Object.keys(head.lenses?.metrics?.attributes ?? {}).length
  )} ficheros · ${num(head.lenses?.dependency?.edges?.length ?? 0)} aristas`
);
console.log(
  `  cambios       +${num(report.summary.addedFiles)} ficheros · ~${num(
    report.summary.changedFiles
  )} módulos · +${num(report.summary.addedEdges)} aristas · +${num(
    report.summary.introducedCycles
  )} ciclos`
);
console.log(
  `  tiempo        ${formatMs(duration)} mediana · ${formatMs(
    Math.min(...times)
  )} min · ${formatMs(Math.max(...times))} max (${ITERATIONS} pasadas)`
);
console.log(`  reporte       ${formatBytes(reportBytes)} sin comprimir`);
console.log(
  `  memoria       ${formatBytes(memory.rss)} RSS · ${formatBytes(
    memory.heapUsed
  )} heap`
);
console.log("");
