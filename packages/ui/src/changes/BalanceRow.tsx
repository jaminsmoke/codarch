import { formatCompact } from "@codarch/render/browser";

/**
 * Una fila del **Balance de deuda**: la ruta, lo que se movió y una barra con
 * cuánto, en la escala del mayor movimiento de su grupo (ADR 0078).
 *
 * La barra viene de la lista que la deuda tenía en el raíl del mapa; los
 * valores son los del diff: `648 → 696 (+48)`, que una cifra suelta no dice.
 * La barra es el vistazo, el número es el dato. La usan los ficheros de deuda
 * y los hotspots: son dos lecturas del mismo peso y se leen igual.
 */
export function BalanceRow({
  path,
  base,
  head,
  delta,
  peak,
  onSelect
}: {
  path: string;
  base: number | null;
  head: number | null;
  delta: number;
  peak: number;
  onSelect: () => void;
}) {
  const tone = delta > 0 ? " is-worse" : " is-better";
  // Un cuatro por ciento mínimo para que un movimiento pequeño se vea que existe.
  const share =
    peak > 0 ? Math.max(4, Math.round((Math.abs(delta) / peak) * 100)) : 100;
  const before = formatCompact(base ?? 0);
  const after = formatCompact(head ?? 0);

  return (
    <button
      type="button"
      className="change-row balance-row"
      title={`${path} · ${before} → ${after}`}
      onClick={onSelect}
    >
      <span className="change-path">{path}</span>
      <span className={`mono change-delta${tone}`}>
        {before} → {after} ({delta > 0 ? `+${delta}` : delta})
      </span>
      <span className="balance-bar" aria-hidden="true">
        <i className={tone.trim()} style={{ width: `${share}%` }} />
      </span>
    </button>
  );
}
