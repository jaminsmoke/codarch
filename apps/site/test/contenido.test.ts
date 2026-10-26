import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Los documentos se leen con la voz de la guía: la escala de `.prosa`
 * (`styles.css`) y la de `.sl-markdown-content` (`styles/starlight.css`) son los
 * mismos números. Aquí se comparan, para que un cambio en una no deje a la otra
 * contando el producto de otra manera.
 */

const root = path.resolve(import.meta.dirname, "..");

function fuente(file: string): string {
  return readFileSync(path.join(root, file), "utf8");
}

/** El cuerpo de la primera regla cuyo selector empieza por el marcador. */
function bloque(css: string, marcador: string): string {
  const inicio = css.indexOf(marcador);
  if (inicio === -1) throw new Error(`no hay regla para ${marcador}`);
  const abre = css.indexOf("{", inicio);
  const cierra = css.indexOf("}", abre);
  return css.slice(abre + 1, cierra);
}

function valor(css: string, marcador: string, propiedad: string): string {
  const match = bloque(css, marcador).match(
    new RegExp(`(?:^|\\n)\\s*${propiedad}\\s*:\\s*([^;]+);`)
  );
  const medida = match?.[1];
  if (!medida) throw new Error(`${marcador} no define ${propiedad}`);
  return medida.trim();
}

const guia = fuente("src/styles.css");
const documentos = fuente("src/styles/starlight.css");

const pares = [
  ["el h2", ".prosa-docs h2", ".sl-markdown-content h2", "font-size"],
  ["el h3", ".prosa-docs h3", ".sl-markdown-content h3", "font-size"],
  ["la tabla", ".prosa table", ".sl-markdown-content table", "font-size"],
  ["el código suelto", ".prosa code", ".sl-markdown-content :not(pre) > code", "font-size"],
  ["la línea de texto", ".prosa p", ".sl-markdown-content p", "max-width"]
] as const;

describe("el contenido de los documentos", () => {
  it.each(pares)("%s usa la medida de la guía", (_nombre, enGuia, enDocs, prop) => {
    expect(valor(documentos, enDocs, prop)).toBe(valor(guia, enGuia, prop));
  });

  it("la tabla del documento se dibuja como la de la guía", () => {
    // La guía pinta la celda entera; Starlight solo la línea de abajo.
    for (const marcador of [".sl-markdown-content :is(th, td)", ".sl-markdown-content th"]) {
      expect(documentos).toContain(marcador);
    }
    expect(valor(guia, ".prosa th,", "padding")).toBe("0.4rem 0.6rem");
    expect(valor(documentos, ".sl-markdown-content :is(th, td)", "padding")).toBe(
      "0.4rem 0.6rem"
    );
  });

  it("el texto respira con la misma interlínea", () => {
    expect(valor(guia, "\nbody {", "line-height")).toBe("1.65");
    expect(
      valor(documentos, "\n.sl-markdown-content {", "line-height")
    ).toBe("1.65");
  });
});

/**
 * El pipeline de Markdown. Los documentos viven en `docs/`, no en
 * `src/content/docs`, y Starlight solo transforma las carpetas que conoce: sin
 * `processedDirs` sus avisos se quedan en párrafo. Y sus avisos llegan como
 * nodos de hast metidos en mdast, que `remark-rehype` solo deja pasar con
 * `passThrough`. Las dos cosas fallan en silencio —la página se pinta, solo
 * pierde la caja—, así que se vigilan aquí.
 */
describe("el pipeline de markdown", () => {
  const config = fuente("astro.config.mjs");

  it("deja a Starlight transformar los documentos", () => {
    expect(config).toContain('processedDirs: ["./docs"]');
  });

  it("deja pasar los nodos de hast de los avisos", () => {
    expect(config).toContain('passThrough: ["element"]');
  });

  it("sigue reescribiendo los enlaces del markdown", () => {
    expect(config).toContain("rehypeDocLinks");
  });
});
