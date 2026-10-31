import { describe, expect, it } from "vitest";
import { readUiStyles } from "./readStyles";

/**
 * El marco de las secciones y la tinta de la tabla viven en la hoja de la UI
 * (`styles.css` y sus piezas por zona).
 *
 * Las tres hojas —fichero, carpeta y proyecto— enseñan la misma tabla de
 * métricas dentro del mismo contenedor: si el marco se excluye de una hoja, la
 * sección se lee como filas sueltas aunque el marcado sea el mismo. Como no hay
 * navegador en las pruebas, la regla se lee del fichero, igual que hace
 * `theme.test.ts` con los tokens.
 */
const css = readUiStyles();

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
