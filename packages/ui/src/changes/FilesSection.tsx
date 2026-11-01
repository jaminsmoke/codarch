import { useState } from "react";
import type { DiffReport } from "@codarch/metrics/browser";
import type { FileDiffView } from "../platform";
import {
  changeFileGroups,
  filesSummary,
  scopeChangeFiles
} from "../changeFiles";
import { CollapsibleSection, GroupHead } from "../CollapsibleSection";
import { FileChangeRow } from "./FileEntry";

/**
 * Los ficheros tocados, agrupados por estado.
 *
 * Qué filas están desplegadas es estado suyo y de nadie más: no es selección ni
 * foco, solo qué está abierto mientras se mira la lista.
 */
export function FilesSection({
  report,
  loadDiff,
  onSelectPath,
  folder = null,
  onClearScope
}: {
  report: DiffReport;
  loadDiff?: (path: string) => Promise<FileDiffView | null>;
  onSelectPath: (path: string) => void;
  /** La carpeta a la que se acota la lista, si se abrió desde su ficha (ADR 0092). */
  folder?: string | null;
  /** Quita el filtro y vuelve al cambio entero. */
  onClearScope?: () => void;
}) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (path: string): void => {
    setExpanded((open) => {
      const next = new Set(open);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const groups = changeFileGroups(
    scopeChangeFiles(report.files, folder),
    undefined,
    report.symbols
  );
  const total = groups.reduce((sum, group) => sum + group.count, 0);

  return (
    <CollapsibleSection
      id="change-files"
      title="Ficheros"
      className="section-files"
      count={total || undefined}
      summary={filesSummary(groups)}
    >
      {folder ? (
        <div className="change-scope">
          <span className="muted tiny">
            Solo <code>{folder}</code>
          </span>
          <button
            type="button"
            className="change-scope-clear"
            title="Quitar el filtro y ver todos los ficheros del cambio"
            onClick={onClearScope}
          >
            Ver todo
          </button>
        </div>
      ) : null}
      {total === 0 ? (
        <p className="muted small">Sin ficheros tocados.</p>
      ) : (
        groups
          .filter((group) => group.count > 0)
          .map((group) => (
            <div key={group.status} className={`change-group is-${group.status}`}>
              <GroupHead label={group.title} summary={String(group.count)} />
              <div className="change-rows">
                {group.files.map((file) => (
                  <FileChangeRow
                    key={file.id}
                    file={file}
                    letter={group.letter}
                    open={expanded.has(file.path)}
                    loadDiff={loadDiff}
                    onToggle={() => toggle(file.path)}
                    onSelectPath={onSelectPath}
                  />
                ))}
              </div>
              {group.rest > 0 ? (
                <p className="muted tiny">+{group.rest} más</p>
              ) : null}
            </div>
          ))
      )}
    </CollapsibleSection>
  );
}
