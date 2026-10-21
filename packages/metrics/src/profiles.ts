import type { ForbiddenRuleConfig, LayerConfig } from "./config";

/**
 * Catálogo de perfiles de arquitectura.
 *
 * Un perfil es una configuración de reglas escrita de antemano: las capas que
 * espera encontrar y qué no puede depender de qué. El equipo lo elige en
 * `.codarch.yml` con `profile: <id>` y sus reglas se añaden a las del perfil.
 *
 * Las reglas de un perfil entran **como aviso**: consultan, no bloquean. Subir
 * una a `error` es una decisión del equipo cuando el código esté preparado
 * (ADR 0023).
 */

export interface DomainProfile {
  id: string;
  title: string;
  description: string;
  /** Las capas, de la más interna a la más externa. */
  layers: LayerConfig[];
  /** Las reglas que define el perfil. */
  rules: ForbiddenRuleConfig[];
}

/**
 * Perfiles del catálogo.
 *
 * Los patrones cubren las convenciones habituales en español y en inglés,
 * porque un repo no siempre nombra las carpetas como su autor quiere.
 */
export const DOMAIN_PROFILES: readonly DomainProfile[] = [
  {
    id: "capas",
    title: "Capas por convención",
    description:
      "Tres capas: el dominio no depende de nada, la aplicación no depende de la infraestructura y la infraestructura no depende de la aplicación.",
    layers: [
      {
        name: "domain",
        patterns: [
          "src/domain/**",
          "src/core/**",
          "src/dominio/**",
          "src/nucleo/**",
          "domain/**"
        ]
      },
      {
        name: "application",
        patterns: [
          "src/application/**",
          "src/app/**",
          "src/use-cases/**",
          "src/usecases/**",
          "src/aplicacion/**",
          "src/casos-de-uso/**",
          "application/**"
        ]
      },
      {
        name: "infrastructure",
        patterns: [
          "src/infrastructure/**",
          "src/infra/**",
          "src/adapters/**",
          "src/persistence/**",
          "src/infraestructura/**",
          "src/adaptadores/**",
          "infrastructure/**"
        ]
      }
    ],
    rules: [
      {
        type: "forbidden",
        name: "dominio-sin-capas-exteriores",
        from: "domain",
        to: "application",
        severity: "warn",
        message: "El dominio no debe depender de la aplicación"
      },
      {
        type: "forbidden",
        name: "dominio-sin-infraestructura",
        from: "domain",
        to: "infrastructure",
        severity: "warn",
        message: "El dominio no debe depender de la infraestructura"
      },
      {
        type: "forbidden",
        name: "aplicacion-sin-infraestructura",
        from: "application",
        to: "infrastructure",
        severity: "warn",
        message: "La aplicación no debe depender de la infraestructura"
      }
    ]
  },
  {
    id: "hexagonal",
    title: "Ports & adapters",
    description:
      "El dominio en el centro, la aplicación con los puertos y los adaptadores por fuera: la aplicación y el dominio no dependen de los adaptadores.",
    layers: [
      {
        name: "domain",
        patterns: [
          "src/domain/**",
          "src/core/**",
          "src/model/**",
          "src/dominio/**",
          "src/modelo/**",
          "domain/**"
        ]
      },
      {
        name: "application",
        patterns: [
          "src/application/**",
          "src/app/**",
          "src/use-cases/**",
          "src/usecases/**",
          "src/ports/**",
          "src/puertos/**",
          "application/**"
        ]
      },
      {
        name: "adapters",
        patterns: [
          "src/adapters/**",
          "src/infra/**",
          "src/infrastructure/**",
          "src/persistence/**",
          "src/adaptadores/**",
          "src/infraestructura/**",
          "adapters/**"
        ]
      }
    ],
    rules: [
      {
        type: "forbidden",
        name: "dominio-sin-adaptadores",
        from: "domain",
        to: "adapters",
        severity: "warn",
        message: "El dominio no debe depender de los adaptadores"
      },
      {
        type: "forbidden",
        name: "aplicacion-sin-adaptadores",
        from: "application",
        to: "adapters",
        severity: "warn",
        message:
          "La aplicación habla con los adaptadores por puertos, no directamente"
      }
    ]
  }
];

/** Un perfil por su id. */
export function findDomainProfile(id: string): DomainProfile | undefined {
  return DOMAIN_PROFILES.find((profile) => profile.id === id);
}

/** Los ids de todos los perfiles, en orden. */
export function domainProfileIds(): string[] {
  return DOMAIN_PROFILES.map((profile) => profile.id);
}
