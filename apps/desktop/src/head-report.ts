import { writeStoredReport } from "@codarch/parsers";
import type { DesktopTarget } from "./preload";

/**
 * Manda lo tocado desde el último commit a la pestaña Cambios (ADR 0072).
 *
 * Sin commits o con el export roto, `report` es `null` y no se manda nada: la
 * pestaña sigue mostrando lo que ya tuviera. Se guarda en su fichero de
 * `.codarch/` para que la web lea lo mismo que el escritorio; quién escribe
 * cada reporte y cuál manda lo declara `@codarch/parsers` (ADR 0101).
 */
export function sendHeadReport(
  root: string,
  report: unknown | null,
  send: (target: DesktopTarget) => void
): void {
  if (!report) return;
  writeStoredReport(root, "worktree", report);
  send({ kind: "head", report, label: root });
}
