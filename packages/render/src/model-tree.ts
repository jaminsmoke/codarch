import type { CcJson, CcNode } from "@codarch/schema/browser";
import type { RenderFile, TreeNode } from "./model-types";

/**
 * El árbol de carpetas del mapa.
 *
 * Sale del snapshot, no de las rutas de los ficheros: la única carpeta que se
 * colapsa es la que tiene un solo hijo carpeta, y el resto se respeta tal cual
 * vino. El árbol es lo que se navega, y ya lleva el área y la sección de cada
 * fichero para no volver a mirarlos.
 */

export function buildRoots(
  cc: CcJson,
  singleRoot: CcNode | null,
  fileIndexById: Map<string, number>,
  files: RenderFile[]
): TreeNode[] {
  const build = (node: CcNode, path: string): TreeNode => {
    if (node.type === "File") {
      const index = fileIndexById.get(node.id);
      const file = index === undefined ? undefined : files[index];
      return {
        kind: "file",
        key: `f:${index ?? -1}`,
        name: node.name,
        path,
        value: file?.area ?? 1,
        fileCount: 1,
        section: file?.section ?? 0,
        fileIndex: index
      };
    }

    const children = (node.children ?? []).map((child) =>
      build(child, path ? `${path}/${child.name}` : child.name)
    );

    const folder: TreeNode = {
      kind: "folder",
      key: `d:${path}`,
      name: node.name,
      path,
      value: children.reduce((sum, child) => sum + child.value, 0) || 1,
      fileCount: children.reduce((sum, child) => sum + child.fileCount, 0),
      section: -1,
      children
    };

    // Colapsa cadenas de carpetas contenedoras: app/codeCharta, no dos cabeceras vacías.
    while (
      folder.children?.length === 1 &&
      folder.children[0]?.kind === "folder"
    ) {
      const only = folder.children[0] as TreeNode;
      folder.name = `${folder.name}/${only.name}`;
      folder.path = only.path;
      folder.key = `d:${only.path}`;
      folder.value = only.value;
      folder.fileCount = only.fileCount;
      folder.children = only.children;
    }

    return folder;
  };

  if (singleRoot) {
    return (singleRoot.children ?? []).map((child) => build(child, child.name));
  }
  return cc.files.map((root) => build(root, root.name));
}

export function countFolders(nodes: readonly TreeNode[]): number {
  let count = 0;
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop() as TreeNode;
    if (node.kind === "folder") count++;
    if (node.children) stack.push(...node.children);
  }
  return count;
}
