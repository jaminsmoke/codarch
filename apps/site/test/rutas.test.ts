import path from "node:path";
import { describe, expect, it } from "vitest";
import { clavesDocumentos } from "../vite-plugin-rutas";

/**
 * Las claves de `docs/` que puede enlazar la guía.
 *
 * La guía tiene su página y sus entradas no son documentos; tampoco las
 * inglesas, que viven en `docs/en/guideline/`. Si entraran aquí, un enlace del
 * markdown apuntaría a una página que no existe.
 */
describe("clavesDocumentos", () => {
  const claves = clavesDocumentos(
    path.resolve(import.meta.dirname, "..")
  );

  it("lista los documentos del producto y los ADR", () => {
    expect(claves).toContain("model");
    expect(claves).toContain("adr/roadmap");
    expect(claves).toContain("en/model");
  });

  it("deja fuera la guía en los dos idiomas", () => {
    expect(claves.some((clave) => /(^|\/)guideline\//.test(clave))).toBe(false);
  });
});
