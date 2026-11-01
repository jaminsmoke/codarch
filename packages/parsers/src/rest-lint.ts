import {
  createLintArtifact,
  docsFindings,
  type DocsRulesConfig,
  type LintArtifact
} from "@codarch/lint/browser";
import type { RestFile } from "./rest";

/**
 * El artefacto de las reglas del resto (ADR 0105).
 *
 * Se escribe con el formato del lint del código —regla, severidad, mensaje y
 * línea— y con su propio `meta.tree`: el checksum del **resto**, no el del
 * código. Mezclar dos árboles en un artefacto obligaría a que uno de los dos
 * mintiera, y el del código dejaría de significar «este código».
 *
 * Solo se juzgan los documentos: una configuración o un asset no tiene enlaces
 * que comprobar ni frontmatter que exigir, y contarlos como medidos diría que se
 * miraron cuando nadie los miró.
 */
export function buildRestLint(input: {
  files: readonly RestFile[];
  /** El checksum del resto medido; sin él, el artefacto no dice su árbol. */
  tree?: string;
  config?: DocsRulesConfig;
}): LintArtifact {
  const docs = input.files.filter((file) => file.kind === "doc");

  const findings = docsFindings({
    files: docs.map((file) => ({
      path: file.relativePath,
      kind: file.kind,
      ...(file.linkTargets ? { links: file.linkTargets } : {}),
      ...(file.frontmatter ? { frontmatter: file.frontmatter } : {})
    })),
    ...(input.config ? { config: input.config } : {})
  });

  return createLintArtifact({
    // Estas reglas las pone el producto, no un linter instalado: el artefacto lo
    // dice, para que nadie busque su configuración en el repo.
    tools: ["codarch"],
    ...(input.tree ? { tree: input.tree } : {}),
    files: findings
  });
}
