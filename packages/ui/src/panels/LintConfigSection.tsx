import type { LintArtifact } from "@codarch/lint/browser";
import type { RenderModel } from "@codarch/render/browser";
import { CollapsibleSection } from "../CollapsibleSection";
import {
  docsConfigAccess,
  readLintConfig,
  type LintConfigSystem,
  type LintConfigView
} from "../lintConfig";
import { RestKinds } from "./RestKinds";

/** El dominio del catálogo: código y resto no se mezclan. */
export type LintConfigDomain = "code" | "docs";

const DOMAIN_TITLE: Record<LintConfigDomain, string> = {
  code: "Lint del código",
  docs: "Reglas del resto"
};

/**
 * La configuración del lint, en la hoja de docs y config.
 *
 * Solo lectura. No cuenta reglas como hallazgos y no usa la tinta de la
 * severidad: una regla activa está configurada, no ha fallado.
 */

function systemCountCopy(system: LintConfigSystem): string {
  switch (system.countState) {
    case "known-complete":
      return system.activeRules.length === 0
        ? "La configuración no activa ninguna regla."
        : `${system.activeRules.length} ${
            system.activeRules.length === 1 ? "regla activa" : "reglas activas"
          }`;
    case "partial":
      return "Recuento parcial.";
    case "unknown":
      return "No se sabe cuántas reglas hay activas.";
    default: {
      const unexpected: never = system.countState;
      return unexpected;
    }
  }
}

function catalogBadge(systems: readonly LintConfigSystem[]): {
  count: number | undefined;
  summary: string;
} {
  if (systems.length === 0) return { count: undefined, summary: "sin sistemas" };
  if (systems.every((system) => system.countState === "known-complete")) {
    const count = systems.reduce((total, system) => total + system.activeRules.length, 0);
    return {
      count,
      summary: count === 1 ? "1 regla activa" : `${count} reglas activas`
    };
  }
  if (systems.some((system) => system.countState === "unknown")) {
    return { count: undefined, summary: "Recuento desconocido." };
  }
  return { count: undefined, summary: "Recuento parcial." };
}

function ConfigBody({ config }: { config: LintConfigView }) {
  const tools =
    config.tools.length > 0 ? config.tools.join(" · ") : "ninguna";

  return (
    <div className="lint-config-view">
      <p className="muted tiny lint-config-lead">
        Configuración. No son hallazgos.
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
              <p className="muted tiny lint-rule-count" data-count-state={system.countState}>
                {systemCountCopy(system)}
              </p>
              {system.activeRules.length > 0 ? (
                <ul className="lint-config-rules">
                  {system.activeRules.map((rule) => (
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
  id,
  domain,
  artifact
}: {
  /** Identificador único: puede haber un catálogo por dominio. */
  id: string;
  domain: LintConfigDomain;
  artifact: LintArtifact | null;
}) {
  const config = readLintConfig(artifact);
  const badge = catalogBadge(config?.systems ?? []);
  const summary = !config ? "sin artefacto" : badge.summary;

  return (
    <CollapsibleSection
      id={id}
      title={DOMAIN_TITLE[domain]}
      className={`panel-block section-lint-config section-lint-config-${domain}`}
      count={badge.count}
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

/**
 * La hoja Docs y config: estratos del resto si hay snapshot, y los catálogos
 * que existan, cada uno en su dominio.
 *
 * Sin snapshot del resto no se pintan estratos ni se finge un mapa.
 */
export function DocsToolSheet({
  hasRest,
  restModel,
  codeLint,
  docsLint
}: {
  hasRest: boolean;
  restModel: RenderModel | null;
  codeLint: LintArtifact | null;
  docsLint: LintArtifact | null;
}) {
  const access = docsConfigAccess({ rest: hasRest, codeLint, docsLint });
  return (
    <>
      {hasRest ? <RestKinds model={restModel} /> : null}
      {access.code ? (
        <LintConfigSection
          id="rail-lint-config-code"
          domain="code"
          artifact={codeLint}
        />
      ) : null}
      {access.docs ? (
        <LintConfigSection
          id="rail-lint-config-docs"
          domain="docs"
          artifact={docsLint}
        />
      ) : null}
    </>
  );
}
