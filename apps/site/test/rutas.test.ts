import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  etiquetaZona,
  filtrosBusqueda,
  idDocumento,
  rutaWeb,
  zonaDeRuta
} from "../src/lib/zonas.mjs";
import { clavesDocumentos } from "../vite-plugin-rutas";

/**
 * Las claves de `docs/` que puede enlazar la guía.
 *
 * La guía tiene su página y sus entradas no son documentos; tampoco las
 * inglesas, que viven en `docs/en/desarrollo/guideline/`. Si entraran aquí, un enlace del
 * markdown apuntaría a una página que no existe.
 */
describe("clavesDocumentos", () => {
  const claves = clavesDocumentos(
    path.resolve(import.meta.dirname, "..")
  );

  it("lista los documentos del producto y los ADR", () => {
    expect(claves).toContain("usar/webapp");
    expect(claves).toContain("desarrollo/model");
    expect(claves).toContain("desarrollo/roadmap");
    expect(claves).toContain("desarrollo/adr/0071-0080/0080-usar-y-construir");
    expect(claves).toContain("en/desarrollo/model");
  });

  it("deja fuera la guía en los dos idiomas", () => {
    expect(claves.some((clave) => /(^|\/)guideline\//.test(clave))).toBe(false);
  });
});

describe("las rutas de cada zona (ADR 0081)", () => {
  it("lleva el uso a /docs/ y la construcción a /desarrollo/", () => {
    expect(rutaWeb("index")).toBe("/docs/");
    expect(rutaWeb("usar/webapp")).toBe("/docs/usar/webapp/");
    expect(rutaWeb("desarrollo/index")).toBe("/desarrollo/");
    expect(rutaWeb("desarrollo/model")).toBe("/desarrollo/model/");
    expect(rutaWeb("desarrollo/adr/0071-0080/0080-usar-y-construir")).toBe(
      "/desarrollo/adr/0071-0080/0080-usar-y-construir/"
    );
    expect(rutaWeb("desarrollo/guideline/normas")).toBe("/desarrollo/guia/");
  });

  it("da a la colección el id que es la ruta", () => {
    expect(idDocumento("usar/webapp.md")).toBe("docs/usar/webapp");
    expect(idDocumento("en/usar/webapp.md")).toBe("en/docs/usar/webapp");
    expect(idDocumento("desarrollo/model.md")).toBe("desarrollo/model");
    expect(idDocumento("en/desarrollo/model.md")).toBe("en/desarrollo/model");
  });

  it("sabe en qué zona está cada página", () => {
    expect(zonaDeRuta("/docs/usar/mcp/")).toBe("usar");
    expect(zonaDeRuta("/en/docs/")).toBe("usar");
    expect(zonaDeRuta("/desarrollo/guia/")).toBe("desarrollo");
    expect(zonaDeRuta("/en/desarrollo/adr/")).toBe("desarrollo");
    expect(zonaDeRuta("/")).toBe(null);
  });

  it("abre la búsqueda filtrada por la zona de la página, en su idioma", () => {
    expect(etiquetaZona("/docs/usar/webapp/")).toBe("Documentación");
    expect(etiquetaZona("/en/desarrollo/model/")).toBe("Development");
    expect(filtrosBusqueda("/docs/")).toEqual({ zona: ["Documentación"] });
    expect(filtrosBusqueda("/en/docs/usar/mcp/")).toEqual({ zona: ["Documentation"] });
    expect(filtrosBusqueda("/desarrollo/adr/")).toEqual({ zona: ["Desarrollo"] });
    expect(filtrosBusqueda("/")).toEqual({});
  });
});
