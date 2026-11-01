import type { DiffReport } from "@codarch/metrics/browser";
import type { HistoryEntry } from "@codarch/schema/browser";
import type { RenderModel } from "@codarch/render/browser";
import type { FileDiffView } from "./platform";
import {
  ChangesEmpty,
  ChangesHead,
  ChangesSummary,
  CyclesSection,
  DebtSection,
  DuplicationChangesSection,
  FilesSection,
  HistorySection
} from "./changes/sections";
import { TotalsSection } from "./changes/TotalsSection";

// La pestaña exporta sus lecturas puras desde aquí: la app y los tests las
// piden a este módulo, y el que las implementa es `changes/summary`.
export { historyRows, reportHasChanges, touchedRows } from "./changes/summary";

interface ChangesPanelProps {
  report: DiffReport | null;
  /** El snapshot pintado: de ahí salen los commits por fichero. */
  model?: RenderModel | null;
  source: string | null;
  error: string | null;
  onLoad: () => void;
  onSelectPath: (path: string) => void;
  /** El diff de un fichero; sin esto, el desplegable solo enseña símbolos. */
  loadDiff?: (path: string) => Promise<FileDiffView | null>;
  /** El histórico del repo abierto; sin esto, la sección no se pinta. */
  loadHistory?: () => Promise<HistoryEntry[] | null>;
  /** Abrir una foto del histórico. */
  onOpenHistory?: (entry: HistoryEntry) => void;
  /**
   * La carpeta a la que está acotada la pestaña (ADR 0092).
   *
   * Se llega aquí desde la ficha de carpeta; `null` es el cambio entero.
   */
  scope?: string | null;
  /** Quita el filtro: el cambio entero pasa a ser el sujeto. */
  onClearScope?: () => void;
}

/**
 * La pestaña de cambios: lo que el árbol de trabajo tiene distinto de su
 * último commit (ADR 0075).
 *
 * Solo pinta el reporte HEAD. Un `report.json` de dos fotos viejas no entra
 * aquí: enseñaría cambios de hace semanas como si fueran de ahora.
 *
 * Empieza por una línea de cifras y por los ficheros tocados, que es lo que se
 * viene a ver, y deja el resto —símbolos, balance de deuda y ciclos— plegado:
 * su cuenta se lee en el encabezado sin abrir nada. Las reglas no están: no son
 * un cambio del código y viven en la ficha del fichero. El balance de deuda
 * reúne los diffs de deuda y los hotspots, que son dos lecturas del mismo peso
 * (ADR 0078), y el histórico —los más tocados y las fotos— va al final, aparte,
 * porque no es el cambio actual.
 *
 * Aquí solo se ordenan las secciones. Cada una vive en `changes/sections` y se
 * lleva lo suyo: sus cuentas, sus filas y el estado que le pertenece —qué fila
 * está desplegada, qué fotos ha leído—, así que el panel no guarda nada.
 */
export default function ChangesPanel({
  report,
  model,
  source,
  error,
  onLoad,
  onSelectPath,
  loadDiff,
  loadHistory,
  onOpenHistory,
  scope = null,
  onClearScope
}: ChangesPanelProps) {
  if (!report) {
    return (
      <ChangesEmpty
        model={model}
        error={error}
        onLoad={onLoad}
        onSelectPath={onSelectPath}
      />
    );
  }

  return (
    <section className="change-panel">
      <ChangesHead report={report} source={source} />
      <ChangesSummary report={report} />
      <TotalsSection report={report} model={model} />
      <FilesSection
        report={report}
        loadDiff={loadDiff}
        onSelectPath={onSelectPath}
        folder={scope}
        onClearScope={onClearScope}
      />
      <DebtSection report={report} onSelectPath={onSelectPath} />
      <DuplicationChangesSection
        report={report}
        onSelectPath={onSelectPath}
      />
      <CyclesSection report={report} />
      <HistorySection
        model={model}
        loadHistory={loadHistory}
        onOpenHistory={onOpenHistory}
        onSelectPath={onSelectPath}
      />
    </section>
  );
}
