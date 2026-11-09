import type { RenderModel, TreeNode } from "@codarch/render/browser";

/** Una cifra que se cuelga en la pared de la sala. */
export interface RoomMetric {
  label: string;
  value: string;
}

function countFoldersUnder(
  nodes: readonly TreeNode[],
  path: string | null
): number {
  if (path === null) {
    return nodes.reduce(
      (total, node) =>
        total +
        (node.kind === "folder"
          ? 1 + countFoldersUnder(node.children ?? [], null)
          : 0),
      0
    );
  }
  for (const node of nodes) {
    if (node.kind !== "folder") continue;
    if (node.path === path) {
      return (node.children ?? []).reduce(
        (total, child) =>
          total +
          (child.kind === "folder"
            ? 1 + countFoldersUnder(child.children ?? [], null)
            : 0),
        0
      );
    }
    const found = countFoldersUnder(node.children ?? [], path);
    if (found > 0) return found;
  }
  return 0;
}

function format(value: number): string {
  return Math.round(value).toLocaleString("es-ES");
}

/** Métricas reales del ámbito abierto: proyecto en la raíz, carpeta en una sala. */
export function roomMetrics(
  model: RenderModel,
  focusPath: string | null
): RoomMetric[] {
  const prefix = focusPath ? `${focusPath}/` : "";
  const files = focusPath
    ? model.files.filter((file) => file.path.startsWith(prefix))
    : model.files;
  const maxRisk = files.reduce((max, file) => Math.max(max, file.risk), 0);
  const area = files.reduce((total, file) => total + file.actualArea, 0);
  const folders = countFoldersUnder(model.roots, focusPath);

  return [
    { label: "Ficheros", value: format(files.length) },
    { label: "Carpetas", value: format(folders) },
    {
      label: "Riesgo",
      value: files.length ? `${format(maxRisk * 100)} / 100` : "—"
    },
    {
      label: model.areaTitle || "Área",
      value: format(area)
    }
  ];
}
