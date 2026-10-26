import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { redirecciones } from "../src/lib/redirecciones.mjs";
import { rutaWeb } from "../src/lib/zonas.mjs";

const docs = path.resolve(import.meta.dirname, "../docs");
const mapa = redirecciones(docs);

/** Las direcciones de antes de las dos zonas siguen llevando a su página (ADR 0081). */
describe("las redirecciones", () => {
  it("lleva los ADR, el modelo, la migración y el diseño a Desarrollo", () => {
    expect(mapa["/docs/adr"]).toBe("/desarrollo/adr/");
    expect(mapa["/docs/adr/roadmap"]).toBe("/desarrollo/roadmap/");
    expect(mapa["/docs/adr/0041-0050/0046-los-documentos-con-starlight"]).toBe(
      "/desarrollo/adr/0041-0050/0046-los-documentos-con-starlight/"
    );
    expect(mapa["/docs/model"]).toBe("/desarrollo/model/");
    expect(mapa["/docs/migration"]).toBe("/desarrollo/migration/");
    expect(mapa["/docs/design/map"]).toBe("/desarrollo/design/map/");
  });

  it("lleva las reglas y las dos páginas de MCP a la Documentación", () => {
    expect(mapa["/docs/rules"]).toBe("/docs/usar/reglas/");
    expect(mapa["/docs/mcp"]).toBe("/docs/usar/mcp/");
    expect(mapa["/docs/usar/cli/mcp"]).toBe("/docs/usar/mcp/");
  });

  it("lleva la guía y cada uno de sus días a /desarrollo/guia/", () => {
    expect(mapa["/guia"]).toBe("/desarrollo/guia/");
    expect(mapa["/guia/normas"]).toBe("/desarrollo/guia/normas/");
    expect(mapa["/guia/futuro"]).toBe("/desarrollo/guia/futuro/");
    expect(mapa["/guia/2026-10-21"]).toBe("/desarrollo/guia/2026-10-21/");
  });

  it("hace lo mismo en inglés", () => {
    expect(mapa["/en/docs/model"]).toBe("/en/desarrollo/model/");
    expect(mapa["/en/guia"]).toBe("/en/desarrollo/guia/");
    expect(mapa["/en/docs/mcp"]).toBe("/en/docs/usar/mcp/");
  });

  it("antepone la base a los destinos, que Astro no la añade", () => {
    const conBase = redirecciones(docs, "/codarch");
    expect(conBase["/docs/model"]).toBe("/codarch/desarrollo/model/");
    expect(conBase["/en/guia"]).toBe("/codarch/en/desarrollo/guia/");
  });

  it("solo apunta a páginas que existen", () => {
    for (const destino of Object.values(mapa)) {
      const ruta = destino.replace(/^\/en(?=\/)/, "");
      if (ruta.startsWith("/desarrollo/guia/")) continue;
      const clave = ruta.replace(/^\/docs\//, "").replace(/^\//, "").replace(/\/$/, "");
      const fichero = [
        path.join(docs, `${clave}.md`),
        path.join(docs, clave, "index.md")
      ].find((candidato) => fs.existsSync(candidato));
      expect(fichero, destino).toBeDefined();
      expect(rutaWeb(clave)).toBe(ruta);
    }
  });
});
