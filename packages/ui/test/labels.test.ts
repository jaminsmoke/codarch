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
    const label = labelFor(200, 16);
    expect(label?.size).toBeLessThan(8);
  });

  it("el tamaño nunca pasa del máximo", () => {
    const label = labelFor(400, 400);
    expect(label?.size).toBeLessThanOrEqual(11);
  });

  it("el tamaño depende del lado corto, no del largo", () => {
    const bajo = labelFor(300, 16);
    const alto = labelFor(16, 300);
    expect(bajo?.size).toBe(alto?.size);
  });

  it("en un bloque diminuto no hay label", () => {
    expect(labelFor(1, 1)).toBeNull();
  });

  it("si el bloque no da para el tamaño mínimo, no hay nombre", () => {
    // Diez píxeles de lado corto no caben una letra de seis.
    expect(labelFor(10, 60)).toBeNull();
    expect(labelFor(60, 10)).toBeNull();
  });

  it("si la línea solo lleva dos letras, no hay nombre", () => {
    // Un cuadrado de veinte: ocho de letra y dos de ancho no son un nombre.
    expect(labelFor(20, 20)).toBeNull();
    // Ni una columna muy estrecha, por alto que sea.
    expect(labelFor(14, 300)).toBeNull();
  });

  it("un bloque que cabe cinco letras sí lleva nombre", () => {
    expect(labelFor(44, 15)).not.toBeNull();
  });
});
