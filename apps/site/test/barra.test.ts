import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { t, type Idioma } from "../src/lib/i18n";
import { ENLACES } from "../src/lib/navegacion";

/** La cabecera es una sola: la de la portada, la de la guía y la de los documentos. */

const root = path.resolve(import.meta.dirname, "..");
const idiomas: Idioma[] = ["es", "en"];

function fuente(file: string): string {
  return readFileSync(path.join(root, file), "utf8");
}

describe("la cabecera del sitio", () => {
  it("lleva los tres destinos, en su orden y sin repetir", () => {
    expect(ENLACES.map((enlace) => enlace.ruta)).toEqual([
      "/",
      "/docs/",
      "/desarrollo/"
    ]);
  });

  it("cada destino se llama algo en los dos idiomas", () => {
    for (const enlace of ENLACES) {
      for (const idioma of idiomas) {
        expect(t(idioma, enlace.clave).trim()).not.toBe("");
      }
    }
  });

  it("la montan las dos familias de páginas, y ninguna otra cabecera", () => {
    for (const file of ["src/layouts/Site.astro", "src/components/Header.astro"]) {
      expect(fuente(file).includes("<Barra")).toBe(true);
    }
    // El marco de las páginas propias ya no dibuja cabecera propia.
    expect(fuente("src/Marco.tsx")).not.toContain("<header");
  });

  it("lo propio de los documentos entra en la barra, no flotando encima", () => {
    const header = fuente("src/components/Header.astro");
    const dentro = header.slice(
      header.indexOf("<Barra"),
      header.lastIndexOf("</Barra>")
    );
    expect(dentro).toContain("<Search />");
    expect(dentro).toContain("<MobileMenuToggle slot=\"menu\" />");
    expect(fuente("src/components/Barra.astro")).toContain(
      "<slot name=\"menu\" />"
    );
  });

  it("el tema va pegado al idioma, en una sola pieza", () => {
    const barra = fuente("src/components/Barra.astro");
    const grupo = barra.slice(
      barra.indexOf("barra-preferencias\""),
      barra.indexOf("barra-github")
    );
    expect(grupo).toContain("barra-idioma");
    expect(grupo).toContain("<BotonTema");
  });

  it("no hay un segundo juego de tema e idioma en el menú", () => {
    expect(fuente("src/components/Sidebar.astro")).not.toContain(
      "MobileMenuFooter"
    );
  });
});
