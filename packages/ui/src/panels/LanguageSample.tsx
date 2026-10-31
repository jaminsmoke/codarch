import { formatCompact, type RenderModel } from "@codarch/render/browser";
import type {
  CcMigrationLanguageStats,
  CcMigrationLens,
  CcMigrationStatus
} from "@codarch/schema/browser";
import { CollapsibleSection } from "../CollapsibleSection";
import { LANGUAGE_COLOR, STATUS_COLOR, STATUS_LABEL } from "../labels";

/**
 * El reparto por lenguaje: la barra de estratos, su leyenda y los estados.
 *
 * Es la lectura de lo que el repositorio tiene escrito, no de lo que le falta:
 * la deuda vive en la deuda de migración.
 */
export function LanguageSample({
  model,
  migration
}: {
  model: RenderModel | null;
  migration: CcMigrationLens | null;
}) {
  if (!migration) {
    return (
      <CollapsibleSection
        id="rail-strata"
        title="Estratos"
        className="panel-block"
        count={0}
        summary="sin lente de migración"
      >
        <p className="muted small">Este snapshot no trae lente de migración.</p>
      </CollapsibleSection>
    );
  }

  const languages = Object.entries(migration.summary.languages).filter(
    (entry): entry is [string, CcMigrationLanguageStats] => entry[1] !== undefined
  );
  const total = languages.reduce((sum, [, stats]) => sum + stats.rloc, 0);

  return (
    <CollapsibleSection
      id="rail-strata"
      title="Estratos"
      className="panel-block"
      count={languages.length}
      summary={`${formatCompact(total)} rloc`}
    >
      <div className="strata" aria-label="Reparto por lenguaje">
        {languages.map(([language, stats]) => {
          if (stats.rloc === 0) return null;
          return (
            <i
              key={language}
              title={`${language}: ${formatCompact(stats.rloc)} rloc`}
              style={{
                width: `${(stats.rloc / total) * 100}%`,
                background: LANGUAGE_COLOR[language] ?? "#7b8790"
              }}
            />
          );
        })}
      </div>
      <div className="strata-legend">
        {languages.map(([language, stats]) => (
          <div key={language} className="strata-row">
            <i style={{ background: LANGUAGE_COLOR[language] ?? "#7b8790" }} />
            <span>{language}</span>
            <span className="mono">{formatCompact(stats.rloc)}</span>
          </div>
        ))}
      </div>
      <div className="status-row">
        {(["js", "rust", "bridge", "native"] as CcMigrationStatus[]).map((status) => (
          <span key={status} className="status-chip">
            <i style={{ background: STATUS_COLOR[status] }} />
            {STATUS_LABEL[status]} <b>{migration.summary.status[status]}</b>
          </span>
        ))}
      </div>
      <div className="muted tiny">
        {migration.summary.ffiEdges} aristas FFI · {migration.summary.bridgeFiles} puentes ·{" "}
        {model ? `${formatCompact(model.fileCount)} ficheros` : ""}
      </div>
    </CollapsibleSection>
  );
}
