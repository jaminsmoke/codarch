import type { DiffReport, MigrationFileChange } from "@codarch/metrics/browser";
import { formatCompact } from "@codarch/render/browser";

/**
 * El balance de deuda del cambio (ADR 0078).
 *
 * Reúne dos lecturas del mismo peso: los ficheros cuya deuda de migración se
 * movió y los que más crecieron en la métrica del reporte. Antes vivían en
 * sitios distintos —una sección **Migración** en la pestaña y una lista en el
 * raíl del mapa—, y se leen juntas: una dice cuánta deuda se mueve y la otra
 * dónde crece el peso que la alimenta.
 */

/** Cuántos ficheros de deuda se enseñan por sentido, como el resto de grupos. */
export const DEBT_ROWS = 6;

/** Un fichero cuya deuda cambió, con su antes, su después y cuánto se movió. */
export interface DebtFile {
  id: string;
  path: string;
  base: number | null;
  head: number | null;
  /** `head - base`: positivo si la deuda sube. */
  delta: number;
}

/** Lo que enseña la sección **Balance de deuda**. */
export interface DebtBalance {
  /** Las cifras del cambio; `null` si el reporte no trae lente de migración. */
  debt: { base: number; head: number; crossings: number; native: number } | null;
  /** Los ficheros cuya deuda sube, de más a menos. */
  increased: DebtFile[];
  /** Los que la bajan, de más a menos. */
  decreased: DebtFile[];
  /** Los ficheros de deuda que se quedan fuera del corte. */
  rest: number;
  /** El mayor movimiento del grupo, para escalar las barras. */
  peak: number;
  /** El crecimiento del hotspot mayor, para escalar sus barras. */
  hotspotPeak: number;
  /** Los que más crecieron en la métrica del reporte, tal y como vienen. */
  hotspots: DiffReport["hotspots"];
  /** Las filas que enseña la sección, para su cuenta. */
  count: number;
}

/** Un fichero de deuda, con el delta ya resuelto. */
function debtRows(
  files: ReadonlyArray<MigrationFileChange>,
  limit: number
): DebtFile[] {
  return files.slice(0, limit).map((file) => ({
    id: file.id,
    path: file.path,
    base: file.base,
    head: file.head,
    delta: file.delta ?? (file.head ?? 0) - (file.base ?? 0)
  }));
}

/**
 * El reparto del balance, con el corte ya aplicado.
 *
 * Un reporte sin lente de migración deja `debt` en `null` y el balance se queda
 * solo con los hotspots: es lo único que hay que enseñar, no un cero inventado.
 */
export function debtBalance(
  report: DiffReport,
  limit = DEBT_ROWS
): DebtBalance {
  const migration = report.migration;
  const increased = migration ? debtRows(migration.files.increased, limit) : [];
  const decreased = migration ? debtRows(migration.files.decreased, limit) : [];
  const shown = [...increased, ...decreased];
  const peak = shown.reduce((max, file) => Math.max(max, Math.abs(file.delta)), 0);
  const hotspotPeak = report.hotspots.reduce(
    (max, hotspot) => Math.max(max, Math.abs(hotspot.delta)),
    0
  );

  return {
    debt: migration
      ? {
          base: migration.debt.base,
          head: migration.debt.head,
          crossings: migration.crossings.head,
          native: migration.status.head.native ?? 0
        }
      : null,
    increased,
    decreased,
    rest:
      (migration?.files.increased.length ?? 0) +
      (migration?.files.decreased.length ?? 0) -
      shown.length,
    peak,
    hotspotPeak,
    hotspots: report.hotspots,
    count: shown.length + report.hotspots.length
  };
}

/**
 * Lo que se lee en la cabecera con la sección cerrada.
 *
 * `deuda 5.871 → 5.744 · 4 hotspots`, sin una mitad vacía a medias.
 */
export function balanceSummary(balance: DebtBalance): string {
  const parts: string[] = [];
  if (balance.debt) {
    parts.push(
      `deuda ${formatCompact(balance.debt.base)} → ${formatCompact(balance.debt.head)}`
    );
  }
  if (balance.hotspots.length > 0) {
    parts.push(`${balance.hotspots.length} hotspots`);
  }
  return parts.join(" · ");
}
