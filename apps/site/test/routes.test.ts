import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  zoneLabel,
  searchFilters,
  documentId,
  webPath,
  zoneOfPath
} from "../src/lib/zones.mjs";
import { documentKeys } from "../vite-plugin-routes";

/**
 * Las claves de `docs/` que puede enlazar la guía.
 *
 * La guía tiene su página y sus entradas no son documentos; tampoco las
 * inglesas, que viven en `docs/en/desarrollo/guideline/`. Si entraran aquí, un enlace del
 * markdown apuntaría a una página que no existe.
 */
describe("documentKeys", () => {
  const claves = documentKeys(
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
    expect(webPath("index")).toBe("/docs/");
    expect(webPath("usar/webapp")).toBe("/docs/usar/webapp/");
    expect(webPath("desarrollo/index")).toBe("/desarrollo/");
    expect(webPath("desarrollo/model")).toBe("/desarrollo/model/");
    expect(webPath("desarrollo/adr/0071-0080/0080-usar-y-construir")).toBe(
      "/desarrollo/adr/0071-0080/0080-usar-y-construir/"
    );
    expect(webPath("desarrollo/guideline/normas")).toBe("/desarrollo/guia/");
  });

  it("da a la colección el id que es la ruta", () => {
    expect(documentId("usar/webapp.md")).toBe("docs/usar/webapp");
    expect(documentId("en/usar/webapp.md")).toBe("en/docs/usar/webapp");
    expect(documentId("desarrollo/model.md")).toBe("desarrollo/model");
    expect(documentId("en/desarrollo/model.md")).toBe("en/desarrollo/model");
  });

  it("sabe en qué zona está cada página", () => {
    expect(zoneOfPath("/docs/usar/mcp/")).toBe("usar");
    expect(zoneOfPath("/en/docs/")).toBe("usar");
    expect(zoneOfPath("/desarrollo/guia/")).toBe("desarrollo");
    expect(zoneOfPath("/en/desarrollo/adr/")).toBe("desarrollo");
    expect(zoneOfPath("/")).toBe(null);
  });

  it("abre la búsqueda filtrada por la zona de la página, en su idioma", () => {
    expect(zoneLabel("/docs/usar/webapp/")).toBe("Documentación");
    expect(zoneLabel("/en/desarrollo/model/")).toBe("Development");
    expect(searchFilters("/docs/")).toEqual({ zona: ["Documentación"] });
    expect(searchFilters("/en/docs/usar/mcp/")).toEqual({ zona: ["Documentation"] });
    expect(searchFilters("/desarrollo/adr/")).toEqual({ zona: ["Desarrollo"] });
    expect(searchFilters("/")).toEqual({});
  });
});
