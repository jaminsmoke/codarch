import { describe, expect, it } from "vitest";
import { labelFor } from "../src/labels";

describe("el label de un bloque", () => {
  it("en un bloque normal, va horizontal y con un tamaño legible", () => {
    const label = labelFor(120, 40);
    expect(label?.vertical).toBe(false);
    expect(label?.size).toBeGreaterThan(8);
  });

  it("en un bloque alto y estrecho, va en vertical", () => {
    const label = labelFor(18, 120);
    expect(label?.vertical).toBe(true);
  });

  it("en un bloque bajo, el tamaño se adapta al alto", () => {
    const label = labelFor(200, 10);
    expect(label?.size).toBeLessThan(6);
  });

  it("el tamaño nunca pasa del máximo", () => {
    const label = labelFor(400, 400);
    expect(label?.size).toBeLessThanOrEqual(11);
  });

  it("en un bloque diminuto no hay label", () => {
    expect(labelFor(1, 1)).toBeNull();
  });

  it("el tamaño depende del lado corto, no del largo", () => {
    const bajo = labelFor(300, 12);
    const alto = labelFor(12, 300);
    expect(bajo?.size).toBe(alto?.size);
  });
});
