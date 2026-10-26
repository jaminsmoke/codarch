export interface RehypeIdiomaOptions {
  docsRoot: string;
}

export function rehypeIdioma(
  options: RehypeIdiomaOptions
): (tree: any, file: { path?: string }) => void;
