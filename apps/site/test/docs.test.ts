import { describe, expect, it } from "vitest";
import { adrDe, changelogDe, documentos, documento } from "../src/lib/docs";
import { esEnlaceInterno } from "../src/lib/enlaces";
import { resolver, rutaDe } from "../src/lib/rutas";

/** Los documentos que se publican ✓ ✅. */
const todos = documentos();

/** Los `href` internos de un HTML. */
function enlaces(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map(
    (coincidencia) => coincidencia[1] ?? ""
  );
}

describe("rutaDe", () => {
  it("lleva cada documento a su carpeta", () => {
    expect(rutaDe("model")).toBe("/docs/model/");
    expect(rutaDe("adr/index")).toBe("/docs/adr/");
    expect(rutaDe("adr/roadmap")).toBe("/docs/adr/roadmap/");
    expect(rutaDe("adr/0021-0030/0029-los-addons")).toBe(
      "/docs/adr/0021-0030/0029-los-addons/"
    );
  });
});

describe("esEnlaceInterno", () => {
  it("reconoce los documentos y la guía", () => {
    expect(esEnlaceInterno("/docs/model/")).toBe(true);
    expect(esEnlaceInterno("/guia/#futuro")).toBe(true);
    expect(esEnlaceInterno("https://example.com/docs/x")).toBe(false);
    expect(esEnlaceInterno("#un-ancla")).toBe(false);
  });
});

describe("resolver", () => {
  it("se queda en el sitio cuando el documento existe", () => {
    expect(
      resolver(
        "guideline/contenido",
        "../adr/0031-0040/0034-la-web-del-proyecto.md"
      )
    ).toBe("/docs/adr/0031-0040/0034-la-web-del-proyecto/");
  });

  it("conserva el ancla", () => {
    expect(
      resolver(
        "adr/0031-0040/0035-la-guia-como-changelog",
        "../../guideline/contenido.md#las-categorias"
      )
    ).toBe("/guia/#las-categorias");
  });

  it("deja los enlaces de fuera y los anclas como están", () => {
    expect(resolver("model", "https://example.com/x")).toBe(
      "https://example.com/x"
    );
    expect(resolver("model", "#el-modelo")).toBe("#el-modelo");
  });

  it("manda al repo lo que no es un documento", () => {
    expect(resolver("model", "images/atlas.png")).toBe(
      "https://github.com/jaminsmoke/codarch/blob/main/docs/images/atlas.png"
    );
    expect(resolver("model", "inventado.md")).toBe(
      "https://github.com/jaminsmoke/codarch/blob/main/docs/inventado.md"
    );
  });

  it("sube y baja carpetas con ..", () => {
    expect(resolver("adr/0021-0030/0029-los-addons", "../index.md")).toBe(
      "/docs/adr/"
    );
    expect(
      resolver("adr/index", "0001-0010/0001-clean-room-con-ccjson.md")
    ).toBe("/docs/adr/0001-0010/0001-clean-room-con-ccjson/");
  });
});

describe("los documentos del repo", () => {
  it("están todos los que son y ninguno se repite", () => {
    const rutas = todos.map((documento) => documento.ruta);
    expect(new Set(rutas).size).toBe(rutas.length);
    expect(todos.length).toBeGreaterThan(10);
  });

  it("cada uno tiene título, descripción y HTML", () => {
    for (const documento of todos) {
      expect(documento.titulo.length).toBeGreaterThan(0);
      expect(documento.descripcion.length).toBeGreaterThan(0);
      expect(documento.html.length).toBeGreaterThan(0);
    }
  });

  it("la descripción es prosa, no la ficha del documento", () => {
    for (const documento of todos) {
      expect(documento.descripcion).not.toMatch(
        /^(?:Estado|Fecha|Prototipo|Render|Versión|Autor|Capturas|Índice)\b/i
      );
      expect(documento.descripcion).not.toMatch(/\*\*|\]\(/);
    }
    expect(documento("model")?.descripcion).toMatch(/^Si el modelo está bien/);
    expect(documento("design/map")?.descripcion).toMatch(/^Implementado:/);
  });

  it("el producto va primero y en su orden", () => {
    const producto = todos
      .filter((documento) => documento.grupo === "producto")
      .map((documento) => documento.clave);
    expect(producto[0]).toBe("adr/roadmap");
    expect(documento("adr/roadmap")?.grupo).toBe("producto");
  });

  it("cada changelog sabe qué ADR acompaña, y al revés", () => {
    for (const documento of todos) {
      if (documento.esChangelog) {
        const adr = adrDe(documento);
        expect(adr).toBeDefined();
        expect(changelogDe(adr!)).toBe(documento);
      } else if (documento.grupo === "adr") {
        const changelog = changelogDe(documento);
        if (changelog) expect(adrDe(changelog)).toBe(documento);
      }
    }
  });

  it("cada ADR tiene su changelog", () => {
    for (const documento of todos) {
      if (
        documento.grupo !== "adr" ||
        documento.esChangelog ||
        documento.clave === "adr/index"
      ) {
        continue;
      }
      expect(changelogDe(documento), documento.clave).toBeDefined();
    }
  });

  it("no deja un enlace interno roto", () => {
    const rotos: string[] = [];
    for (const doc of todos) {
      for (const enlace of enlaces(doc.html)) {
        if (!enlace.startsWith("/docs/") && !enlace.startsWith("/guia/")) continue;
        const clave = enlace
          .replace(/^\/docs\//, "")
          .replace(/^\/guia\//, "")
          .replace(/#.*$/, "");
        const destino = clave.replace(/\/$/, "");
        if (destino !== "" && !documento(destino)) {
          rotos.push(`${doc.clave} → ${enlace}`);
        }
      }
    }
    expect(rotos).toEqual([]);
  });

  it("da el mismo resultado dos veces", () => {
    expect(documentos()).toEqual(documentos());
  });
});
