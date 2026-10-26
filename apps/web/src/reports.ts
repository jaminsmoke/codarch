/**
 * Qué reporte pide la app al cargarse desde `data/` (ADR 0075).
 *
 * Con un servidor local delante (`data/meta.json` existe) hay un repositorio
 * que comparar, y la pestaña Cambios enseña lo que el árbol de trabajo tiene
 * distinto de su último commit: solo el reporte HEAD. Un artefacto estático
 * —el mapa de un PR— no tiene git: trae su `report.json`, que es el diff del
 * pull request, y es lo único que puede enseñar.
 */

export const HEAD_REPORT_URL = "data/head-report.json";
export const ARTIFACT_REPORT_URL = "data/report.json";

export function servedReportUrl(hasServer: boolean): string {
  return hasServer ? HEAD_REPORT_URL : ARTIFACT_REPORT_URL;
}
