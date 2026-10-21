import { describe, expect, it } from "vitest";
import {
  DOMAIN_PROFILES,
  domainProfileIds,
  findDomainProfile
} from "../src/index";

/**
 * El catálogo es contenido, no código: lo que no se comprueba aquí se rompe
 * cuando alguien lo usa.
 */
describe("catálogo de perfiles", () => {
  it("cada regla apunta a capas que el perfil define", () => {
    for (const profile of DOMAIN_PROFILES) {
      const layers = new Set(profile.layers.map((layer) => layer.name));
      expect(layers.size, `${profile.id} repite capa`).toBe(profile.layers.length);
      for (const rule of profile.rules) {
        expect(
          layers.has(rule.from),
          `${profile.id}: ${rule.name} apunta a una capa que no existe: ${rule.from}`
        ).toBe(true);
        expect(
          layers.has(rule.to),
          `${profile.id}: ${rule.name} apunta a una capa que no existe: ${rule.to}`
        ).toBe(true);
      }
    }
  });

  it("las reglas del perfil son avisos y no bloquean", () => {
    for (const profile of DOMAIN_PROFILES) {
      for (const rule of profile.rules) {
        expect(rule.severity, `${profile.id}: ${rule.name}`).toBe("warn");
      }
    }
  });

  it("los ids son únicos y las capas tienen patrones", () => {
    const ids = domainProfileIds();
    expect(new Set(ids).size).toBe(ids.length);
    for (const profile of DOMAIN_PROFILES) {
      expect(profile.layers.length).toBeGreaterThan(1);
      for (const layer of profile.layers) {
        expect(layer.patterns.length).toBeGreaterThan(0);
        for (const pattern of layer.patterns) {
          expect(pattern.startsWith("/")).toBe(false);
          expect(pattern).not.toMatch(/^[A-Za-z]:\//);
        }
      }
    }
  });

  it("se encuentra un perfil por su id", () => {
    expect(findDomainProfile("capas")?.title).toBe("Capas por convención");
    expect(findDomainProfile("no-existe")).toBeUndefined();
  });
});
