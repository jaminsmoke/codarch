export interface RehypeDocLinksOptions {
  docsRoot: string;
  base: string;
}

export function rehypeDocLinks(
  options: RehypeDocLinksOptions
): (tree: any, file: { path?: string }) => void;
