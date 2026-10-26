import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORIAS, VEREDICTOS } from "../src/lib/guia";

/**
 * La leyenda de la guía se escribe con versalitas de 9 px, así que cada tono
 * necesita 4,5:1 sobre el fondo. Los valores viven en `styles.css`; aquí se
 * resuelven y se miden, para que un tono nuevo no entre sin pasar.
 */

const estilos = readFileSync(
  path.resolve(import.meta.dirname, "../src/styles.css"),
  "utf8"
);

const OSCURO = ':root[data-theme="dark"]';
const claro = estilos.slice(0, estilos.indexOf(OSCURO));
const oscuro = estilos.slice(estilos.indexOf(OSCURO));

function valor(bloque: string, nombre: string): string {
  const match = bloque.match(
    new RegExp(`${nombre}\\s*:\\s*(#[0-9a-fA-F]{3,8})\\b`)
  );
  const hex = match?.[1];
  if (!hex) throw new Error(`el bloque no define ${nombre}`);
  return hex;
}

/** `var(--color-x)` → el valor de ese token en el bloque. */
function resolver(bloque: string, referencia: string): string {
  const nombre = referencia.match(/var\((--[\w-]+)\)/)?.[1];
  if (!nombre) throw new Error(`no es un token: ${referencia}`);
  return valor(bloque, nombre);
}

function canal(componente: number): number {
  const c = componente / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex: string): number {
  const [r, g, b] = [null, null, null].map((_, indice) =>
    parseInt(hex.slice(1 + indice * 2, 3 + indice * 2), 16)
  ) as [number, number, number];
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(a: string, b: string): number {
  const [alto, bajo] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [
    number,
    number
  ];
  return (alto + 0.05) / (bajo + 0.05);
}

const leyenda = [
  ...Object.entries(VEREDICTOS).map(
    ([clave, meta]) => [`el veredicto ${clave}`, meta] as const
  ),
  ...Object.entries(CATEGORIAS).map(
    ([clave, meta]) => [`la categoría ${clave}`, meta] as const
  )
];

describe("la leyenda de la guía", () => {
  it.each(leyenda)("%s se lee sobre el papel y el panel", (_nombre, meta) => {
    const tinta = resolver(claro, meta.ink);
    for (const fondo of [
      valor(claro, "--color-paper"),
      valor(claro, "--color-panel")
    ]) {
      expect(contraste(tinta, fondo)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(leyenda)("%s se lee en oscuro", (_nombre, meta) => {
    const tinta = resolver(oscuro, meta.ink);
    for (const fondo of [
      valor(oscuro, "--color-paper"),
      valor(oscuro, "--color-panel")
    ]) {
      expect(contraste(tinta, fondo)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
