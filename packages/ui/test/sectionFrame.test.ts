import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * El marco de las secciones y la tinta de la tabla viven en `styles.css`.
 *
 * Las tres hojas —fichero, carpeta y proyecto— enseñan la misma tabla de
 * métricas dentro del mismo contenedor: si el marco se excluye de una hoja, la
 * sección se lee como filas sueltas aunque el marcado sea el mismo. Como no hay
 * navegador en las pruebas, la regla se lee del fichero, igual que hace
 * `tema.test.ts` con los tokens.
 */
const css = fs.readFileSync(
  path.resolve(import.meta.dirname, "../src/styles.css"),
  "utf8"
);

describe("el marco de una sección", () => {
  it("vale para la ficha, la carpeta y el proyecto, no solo para el fichero", () => {
    expect(css).toContain(".inspector-file > .collapsible > .collapsible-body");
    // La carpeta llegó después: nada de excluirla del contenedor.
    expect(css).not.toContain(":not(.inspector-folder)");
  });

  it("Contenido no lleva dos marcos alrededor de lo mismo", () => {
    expect(css).toContain(
      ".inspector-file > .collapsible.section-content > .collapsible-body"
    );
  });
});

describe("la tinta de la tabla de métricas", () => {
  it("tiene el aviso y la deuda para la barra y el valor", () => {
    expect(css).toContain(".metrics-watch .metrics-bar i");
    expect(css).toContain(".metrics-watch .metrics-value");
    expect(css).toContain(".metrics-debt .metrics-bar i");
    expect(css).toContain(".metrics-debt .metrics-value");
  });
});
