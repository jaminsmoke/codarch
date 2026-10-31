import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * La barra lateral se pinta con los tokens de Starlight, y aquí se miden:
 * el activo va sobre un tinte del acento —no sobre el acento entero— y los
 * enlaces sobre el fondo de la lateral, en los dos temas. Los valores viven en
 * `styles/starlight.css`; un cambio de tono que rompa el contraste falla aquí.
 */

const estilos = readFileSync(
  path.resolve(import.meta.dirname, "../src/styles/starlight.css"),
  "utf8"
);

const OSCURO = ':root[data-theme="dark"]';
const claro = estilos.slice(0, estilos.indexOf(OSCURO));
const oscuro = estilos.slice(estilos.indexOf(OSCURO));

function valor(bloque: string, nombre: string): string {
  const match = bloque.match(
    new RegExp(`\\s${nombre}\\s*:\\s*(#[0-9a-fA-F]{3,8})\\b`)
  );
  const hex = match?.[1];
  if (!hex) throw new Error(`el bloque no define ${nombre}`);
  return hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex.slice(0, 7);
}

function canales(hex: string): [number, number, number] {
  return [0, 1, 2].map((i) =>
    parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  ) as [number, number, number];
}

function canal(componente: number): number {
  const c = componente / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminancia([r, g, b]: [number, number, number]): number {
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(a: string, b: string): number {
  const [alto, bajo] = [luminancia(canales(a)), luminancia(canales(b))].sort(
    (x, y) => y - x
  ) as [number, number];
  return (alto + 0.05) / (bajo + 0.05);
}

/** `color-mix(in srgb, acento 12%, transparent)` sobre un fondo opaco. */
function tinte(acento: string, fondo: string, parte = 0.12): string {
  const a = canales(acento);
  const f = canales(fondo);
  const mezcla = a.map((valor, i) =>
    Math.round(parte * valor + (1 - parte) * (f[i] as number))
  );
  return `#${mezcla.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

describe("la barra lateral de los documentos", () => {
  const temas = [
    ["claro", claro],
    ["oscuro", oscuro]
  ] as const;

  it.each(temas)("el enlace activo se lee en %s", (_nombre, bloque) => {
    const fondo = valor(bloque, "--sl-color-bg-sidebar");
    const activo = tinte(valor(bloque, "--sl-color-accent"), fondo);
    expect(contraste(valor(bloque, "--sl-color-text-accent"), activo)).toBeGreaterThanOrEqual(
      4.5
    );
  });

  it.each(temas)("los enlaces se leen en %s", (_nombre, bloque) => {
    const fondo = valor(bloque, "--sl-color-bg-sidebar");
    // Los hijos van en `gray-2`; los de primer nivel y las etiquetas de grupo,
    // en `text` y `gray-2`. Ninguno puede quedarse corto sobre la lateral.
    expect(contraste(valor(bloque, "--sl-color-gray-2"), fondo)).toBeGreaterThanOrEqual(
      4.5
    );
    expect(contraste(valor(bloque, "--sl-color-text"), fondo)).toBeGreaterThanOrEqual(
      4.5
    );
  });

  it("la lateral y la cabecera comparten el filete", () => {
    // El borde de la cabecera es `--barra-linea`; la lateral usa `hairline`.
    for (const bloque of [claro, oscuro]) {
      expect(valor(bloque, "--sl-color-hairline")).toBe(
        valor(bloque, "--sl-color-hairline-shade")
      );
    }
  });
});
