import { useEffect, useState } from "react";
import type { SymbolHeat } from "@codarch/schema/browser";
import { CollapsibleSection } from "../CollapsibleSection";

/**
 * Los símbolos más reescritos.
 *
 * A nivel de fichero no existe esta señal: un fichero con veinte funciones
 * quietas y otro con una que se reescribe cada semana pesan igual ✓. Aquí
 * no ✓.
 */
export function HeatList({
  load,
  onSelectSymbol
}: {
  load: () => Promise<SymbolHeat[] | null>;
  onSelectSymbol: (name: string, path: string) => void;
}) {
  const [heat, setHeat] = useState<SymbolHeat[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await load();
      if (cancelled) return;
      setHeat(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (!heat || heat.length === 0) return null;

  const max = Math.max(1, heat[0]?.churn ?? 1);

  return (
    <CollapsibleSection
      id="rail-heat"
      title="Más reescritos"
      className="panel-block"
      count={heat.length}
      summary={`${heat.length} símbolos`}
    >
      <div className="mini-list">
        {heat.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="mini-row"
            onClick={() => onSelectSymbol(entry.name, entry.path)}
            title={`${entry.path} · ${entry.changes} cambios · ${entry.moves} mudanzas`}
          >
            <span className="mini-name">{entry.name}</span>
            <span className="mini-track">
              <i
                style={{
                  width: `${Math.max(4, (entry.churn / max) * 100)}%`,
                  background: "var(--rust)"
                }}
              />
            </span>
            <span className="mono">{entry.churn}</span>
          </button>
        ))}
      </div>
    </CollapsibleSection>
  );
}
