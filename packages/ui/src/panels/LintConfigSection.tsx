import type { LintArtifact } from "@codarch/lint/browser";
import { CollapsibleSection } from "../CollapsibleSection";
import { readLintConfig, type LintConfigView } from "../lintConfig";

/**
 * La configuración del lint, en la hoja de docs y config.
 *
 * Solo lectura. No cuenta reglas como hallazgos y no usa la tinta de la
 * severidad: una regla activa está configurada, no ha fallado.
 */

function ConfigBody({ config }: { config: LintConfigView }) {
  const tools =
    config.tools.length > 0 ? config.tools.join(" · ") : "ninguna";

  return (
    <div className="lint-config-view">
      <p className="muted tiny lint-config-lead">
        Configuración del proyecto. No son hallazgos.
      </p>
      <p className="muted tiny lint-config-tools">
        Herramientas que midieron: {tools}
      </p>
      {config.systems.length === 0 ? (
        <p className="muted small">El artefacto no declara sistemas.</p>
      ) : (
        <ul className="lint-systems">
          {config.systems.map((system) => (
            <li key={system.name} className="lint-system">
              <div className="lint-system-head">
                <span className="lint-system-name">{system.name}</span>
              </div>
              <span
                className={`lint-system-config${
                  system.config ? "" : " is-none"
                }`}
                title={system.config ?? undefined}
              >
                {system.config ?? "sin config"}
              </span>
              {system.note ? (
                <p className="muted tiny lint-system-note">{system.note}</p>
              ) : null}
              {system.rules.length > 0 ? (
                <ul className="lint-config-rules">
                  {system.rules.map((rule) => (
                    <li key={rule.id} className="lint-config-rule">
                      <span className="lint-config-id">{rule.id}</span>
                      <span className="lint-config-sev">{rule.severity}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LintConfigSection({
  artifact
}: {
  artifact: LintArtifact | null;
}) {
  const config = readLintConfig(artifact);
  const summary = !config
    ? "sin artefacto"
    : config.systems.length === 0
      ? "sin sistemas"
      : `${config.systems.length} ${
          config.systems.length === 1 ? "sistema" : "sistemas"
        }`;

  return (
    <CollapsibleSection
      id="rail-lint-config"
      title="Configuración del lint"
      className="panel-block section-lint-config"
      count={config?.systems.length ?? 0}
      summary={summary}
    >
      {config ? (
        <ConfigBody config={config} />
      ) : (
        <p className="muted small">
          No hay artefacto de lint: no hay sistemas ni herramientas que
          enseñar.
        </p>
      )}
    </CollapsibleSection>
  );
}
