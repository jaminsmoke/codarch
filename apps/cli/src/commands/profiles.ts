import { DOMAIN_PROFILES } from "@codarch/metrics";

/**
 * Lista el catálogo de perfiles de arquitectura.
 *
 * Un perfil es una configuración de reglas escrita de antemano: el equipo lo
 * elige en `.codarch.yml` con `profile: <id>` y sus reglas se añaden a las
 * suyas como aviso (no bloquean) (ADR 0023).
 */
export function runProfiles(json: boolean): number {
  if (json) {
    console.log(
      JSON.stringify(
        {
          profiles: DOMAIN_PROFILES.map((profile) => ({
            id: profile.id,
            title: profile.title,
            description: profile.description,
            layers: profile.layers.map((layer) => ({
              name: layer.name,
              patterns: layer.patterns
            })),
            rules: profile.rules.map((rule) => ({
              name: rule.name,
              from: rule.from,
              to: rule.to,
              severity: rule.severity,
              message: rule.message ?? null
            }))
          }))
        },
        null,
        2
      )
    );
    return 0;
  }

  console.log("");
  console.log("  CodArch · perfiles de arquitectura");
  console.log("");
  for (const profile of DOMAIN_PROFILES) {
    console.log(`  ${profile.id} · ${profile.title}`);
    console.log(`    ${profile.description}`);
    console.log(
      `    capas: ${profile.layers.map((layer) => layer.name).join(", ")}`
    );
    for (const rule of profile.rules) {
      console.log(
        `    · ${rule.name}: ${rule.from} no puede depender de ${rule.to} (${rule.severity})`
      );
    }
    console.log("");
  }
  console.log("  Para usarlo, en .codarch.yml:");
  console.log("");
  console.log("    version: 1");
  console.log("    profile: capas");
  console.log("");
  console.log("  Las reglas del perfil entran como aviso: suben a \"error\" cuando el código esté listo.");
  console.log("");
  return 0;
}
