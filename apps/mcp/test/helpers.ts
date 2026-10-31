import type { CcJson } from "@codarch/schema";
import type { MapNode } from "../src/tools";
import { SNAPSHOT } from "./fixtures";

export function flatten(node: MapNode, output: MapNode[] = []): MapNode[] {
  output.push(node);
  for (const child of node.children ?? []) flatten(child, output);
  return output;
}

/** Una foto del historial con un símbolo que cambia de nombre y otro estable. */
export function historySnapshot(checksum: string, renamed: string): CcJson {
  const snapshot = structuredClone(SNAPSHOT) as CcJson;
  snapshot.meta.checksum = checksum;
  const nodes = snapshot.lenses!.symbols!.nodes;
  nodes.a = [
    {
      name: renamed,
      kind: "function",
      line: 10,
      complexity: 12,
      lines: 40,
      hash: "h-renamed"
    },
    // Cambia con cada foto para que cuente como reescrito y salga en el calor.
    { name: "Guardar", kind: "interface", line: 3, hash: `h-guardar-${checksum}` }
  ];
  nodes.c = [
    {
      name: "resolver",
      kind: "function",
      line: 20,
      complexity: 20,
      lines: 60,
      hash: "h-resolver"
    }
  ];
  return snapshot;
}
