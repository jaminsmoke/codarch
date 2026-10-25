import { parseCcJson } from "@codarch/schema";
import { buildRenderModel, layoutMap } from "@codarch/render";

const FILE_COUNT = 5_000;
const FOLDERS = 50;
const RUNS = 5;

function fixture(files: number): unknown {
  const perFolder = Math.ceil(files / FOLDERS);
  const children = [];
  const attributes: Record<string, Record<string, number>> = {};
  const edges = [];

  for (let folder = 0; folder < FOLDERS; folder++) {
    const folderChildren = [];
    for (let index = 0; index < perFolder; index++) {
      const fileIndex = folder * perFolder + index;
      if (fileIndex >= files) break;
      const id = `f${folder}_${index}`;
      folderChildren.push({ id, name: `file${index}.ts`, type: "File" });
      attributes[id] = {
        rloc: ((folder * 17 + index * 13) % 400) + 1,
        complexity: ((folder + index * 7) % 30) + 1,
        number_of_commits: (index % 20) + 1
      };
      if (index > 0) {
        edges.push({ fromId: `f${folder}_${index - 1}`, toId: id });
      }
    }
    children.push({
      id: `d${folder}`,
      name: `module${folder}`,
      type: "Folder",
      children: folderChildren
    });
  }

  return {
    meta: { projectName: "bench-5k", apiVersion: "2.1" },
    files: [{ id: "root", name: "root", type: "Folder", children }],
    lenses: {
      metrics: { attributes },
      dependency: { leafEdges: edges }
    }
  };
}

const raw = fixture(FILE_COUNT);
const times: number[] = [];
let nodes = 0;

for (let run = 0; run < RUNS; run++) {
  const started = performance.now();
  const model = buildRenderModel(parseCcJson(raw));
  // Lo que la app pinta: el modelo y su treemap (ADR 0073).
  nodes = layoutMap(model.roots).length;
  times.push(performance.now() - started);
}

times.sort((a, b) => a - b);
const median = times[Math.floor(times.length / 2)] ?? 0;
const format = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

console.log(`  CodArch · benchmark de render

  ficheros     ${format.format(FILE_COUNT)}
  ejecuciones  ${RUNS}
  mediana      ${format.format(median)} ms
  mínimo       ${format.format(times[0] ?? 0)} ms
  nodos        ${format.format(nodes)}
`);
