// La configuración del repo y los perfiles de arquitectura: lo que la app
// lee de `.codarch.yml` y lo que se propone cuando no hay config.

import { basename } from "node:path";
import { findRepoConfig } from "@codarch/schema";
import {
  CONFIG_VERSION,
  ConfigError,
  DOMAIN_PROFILES,
  loadIgnoreConfig,
  loadRuleConfig,
  suggestLayers
} from "@codarch/metrics";
import { ruleConfigAddon } from "@codarch/addons";
import { loadAddons, repoAddons } from "@codarch/addons/node";
import { ArchitectureStore } from "../store";
import type {
  SuggestArchitectureResult,
  ListProfilesResult,
  ProjectConfigResult
} from "./types";

export function getProjectConfig(store: ArchitectureStore): ProjectConfigResult {
  const loaded = loadAddons(store.root);
  const summary = repoAddons(store.root);
  const errors = [...summary.errors];
  const file = configFile(store.root);

  if (!file) {
    return {
      available: false,
      file: null,
      profile: null,
      layers: [],
      rules: [],
      ignore: [],
      addons: [],
      errors,
      reason:
        "no hay .codarch.yml en el repo: no hay perfiles, reglas, alcance ni addons que enseñar"
    };
  }

  try {
    // Igual que `codarch diff`: el archivo dice qué addons usa y sus reglas
    // entran con `source: "addon:<nombre>"` (ADR 0029).
    const config = loadRuleConfig(file, loaded.addons.map(ruleConfigAddon));
    return {
      available: true,
      file: basename(file),
      profile: config.profile,
      layers: config.layers,
      rules: config.rules,
      ignore: config.ignore,
      addons: summary.addons,
      errors
    };
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    let ignore: string[] = [];
    try {
      ignore = loadIgnoreConfig(file);
    } catch {
      // El alcance tampoco se pudo leer; se devuelve vacío con el motivo.
    }
    return {
      available: true,
      file: basename(file),
      profile: null,
      layers: [],
      rules: [],
      ignore,
      addons: summary.addons,
      errors,
      reason: error.message
    };
  }
}

/** El `.codarch.yml` del repo, si lo hay. El nombre lo decide el registro. */
function configFile(root: string): string | null {
  return findRepoConfig(root);
}

/**
 * La vida de un símbolo: su cadena a lo largo del historial.
 *
 * Responde a "¿esta función es la misma que la de hace un año?" y a
 * "¿cuántas veces se ha reescrito esto?" ✓.
 */

export function suggestArchitecture(
  store: ArchitectureStore
): SuggestArchitectureResult {
  const suggestion = suggestLayers(store.snapshot);
  return {
    available: true,
    configVersion: CONFIG_VERSION,
    detected: suggestion.detected,
    layers: suggestion.layers,
    rules: suggestion.rules,
    proposal: suggestion.proposal,
    profile: suggestion.profile,
    ungrouped: suggestion.ungrouped,
    notes: suggestion.notes,
    fits: suggestion.fits
  };
}

export function listProfiles(): ListProfilesResult {
  return {
    configVersion: CONFIG_VERSION,
    profiles: DOMAIN_PROFILES.map((profile) => ({
      id: profile.id,
      title: profile.title,
      description: profile.description,
      when: profile.when,
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
  };
}
