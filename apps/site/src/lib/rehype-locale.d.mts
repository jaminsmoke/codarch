export interface RehypeLocaleOptions {
  docsRoot: string;
}

export function rehypeLocale(
  options: RehypeLocaleOptions
): (tree: any, file: { path?: string }) => void;
