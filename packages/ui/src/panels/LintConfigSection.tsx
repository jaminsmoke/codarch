import type { LintArtifact } from "@codarch/lint/browser";
import type { RenderModel } from "@codarch/render/browser";
import { CollapsibleSection, GroupHead } from "../CollapsibleSection";
import {
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

/**
 * Separa `@scope/plugin/rule` o `plugin/rule` en sus dos piezas. Una regla sin
 * plugin es del núcleo; el id completo queda en el `title`.
 */
function ruleParts(id: string): { plugin: string; rule: string } {
  const slash = id.lastIndexOf("/");
  if (slash <= 0) return { plugin: "core", rule: id };
  return { plugin: id.slice(0, slash), rule: id.slice(slash + 1) };
}

type ActiveRule = LintConfigSystem["activeRules"][number];

/** Las reglas de un sistema, agrupadas por plugin, en el orden en que llegan. */
function groupRules(
  rules: readonly ActiveRule[]
): Array<{ plugin: string; rules: ActiveRule[] }> {
  const groups = new Map<string, { plugin: string; rules: ActiveRule[] }>();
  for (const rule of rules) {
    const { plugin } = ruleParts(rule.id);
    const group = groups.get(plugin);
    if (group) group.rules.push(rule);
    else groups.set(plugin, { plugin, rules: [rule] });
  }
  return [...groups.values()];
}

function ConfigBody({
  config,
  domain
}: {
  config: LintConfigView;
  domain: LintConfigDomain;
}) {
  const tools =
    config.tools.length > 0 ? config.tools.join(" · ") : "ninguna";

  return (
    <div className="lint-config-view">
      <p className="muted tiny lint-config-lead">
        Configuración. No son hallazgos.
      </p>
      <GroupHead label="Herramientas que midieron" summary={tools} />
      {config.systems.length === 0 ? (
        <p className="muted small">El artefacto no declara sistemas.</p>
      ) : (
        <ul className="lint-systems">
          {config.systems.map((system) => (
            <li
              key={system.name}
              className="lint-system"
              data-count-state={system.countState}
            >
              <CollapsibleSection
                id={`lint-config-${domain}-${system.name}`}
                title={system.name}
                count={
                  system.activeRules.length > 0
                    ? system.activeRules.length
                    : undefined
                }
                summary={`${systemCountCopy(system)}${
                  system.config ? ` · ${system.config}` : ""
                }`}
                defaultOpen={false}
                className="lint-system-collapsible"
              >
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
                {system.countState !== "known-complete" ||
                system.activeRules.length === 0 ? (
                  <p
                    className="muted tiny lint-rule-count"
                    data-count-state={system.countState}
                  >
                    {systemCountCopy(system)}
                  </p>
                ) : null}
                <div className="lint-config-groups">
                  {groupRules(system.activeRules).map((group) => (
                    <section key={group.plugin} className="lint-config-group">
                      <GroupHead
                        label={group.plugin}
                        summary={`${group.rules.length} ${
                          group.rules.length === 1 ? "regla" : "reglas"
                        }`}
                      />
                      <ul className="lint-config-rules">
                        {group.rules.map((rule) => (
                          <li
                            key={rule.id}
                            className="lint-config-rule"
                            data-severity={rule.severity}
                          >
                            <span
                              className="lint-config-mark"
                              aria-hidden="true"
                            />
                            <span className="lint-config-id" title={rule.id}>
                              {ruleParts(rule.id).rule}
                            </span>
                            <span className="lint-config-sev">
                              {rule.severity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </CollapsibleSection>
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
  artifact,
  title
}: {
  /** Identificador único: puede haber un catálogo por dominio. */
  id: string;
  domain: LintConfigDomain;
  artifact: LintArtifact | null;
  /** En la ficha derecha el título es Lint, el mismo hueco que los hallazgos. */
  title?: string;
}) {
  const config = readLintConfig(artifact);
  const badge = catalogBadge(config?.systems ?? []);
  const summary = !config ? "sin artefacto" : badge.summary;

  return (
    <CollapsibleSection
      id={id}
      title={title ?? DOMAIN_TITLE[domain]}
      className={`panel-block section-lint-config section-lint-config-${domain}`}
      count={badge.count}
      summary={summary}
    >
      {config ? (
        <ConfigBody config={config} domain={domain} />
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
 * La hoja Docs y config: solo los estratos del resto.
 *
 * El catálogo del lint de código vive en la ficha derecha de ese mapa. Aquí
 * no hay lista de hallazgos ni de reglas.
 */
export function DocsToolSheet({
  hasRest,
  restModel
}: {
  hasRest: boolean;
  restModel: RenderModel | null;
}) {
  if (!hasRest) return null;
  return <RestKinds model={restModel} />;
}
