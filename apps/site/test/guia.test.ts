import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";
import {
  CATEGORIAS,
  fechaCorta,
  fechaPartida,
  nombreCategoria,
  nombreVeredicto,
  rutaDia,
  type Categoria,
  type Veredicto
} from "../src/lib/guia";
import {
  prepararGuia,
  type FuenteGuia
} from "../src/lib/guia-servidor";
import { conBase } from "../src/lib/rutas";

/** Unas entradas pequeñas, con la forma de la guía. */
const fuentes: FuenteGuia[] = [
  {
    id: "2026-10-22-01-una-feature",
    body: "El cuerpo de la feature.\n\n### Un apartado\n\nCon su texto.",
    data: {
      title: "Una feature",
      date: "2026-10-22",
      category: "feature",
      verdict: "fase"
    }
  },
  {
    id: "2026-10-22-02-un-fix",
    body: "**Decisión**: [ADR](../../adr/0031-0040/0034-la-web-del-proyecto.md).",
    data: {
      title: "Un fix",
      date: "2026-10-22",
      category: "fix",
      verdict: "arreglo"
    }
  },
  {
    id: "2026-10-21-01-otra-feature",
    body: "El cuerpo de la otra.",
    data: {
      title: "Otra feature, la primera del día anterior",
      date: "2026-10-21",
      category: "feature",
      verdict: "esperar"
    }
  }
];

const normas = "## La leyenda\n\nCómo se escribe.";

describe("prepararGuia", () => {
  it("renderiza las normas", () => {
    const guia = prepararGuia(fuentes, normas);
    expect(guia.normas).toContain("La leyenda");
    expect(guia.normas).not.toContain("Una feature");
  });

  it("agrupa cada día por categoría, en el orden del changelog", () => {
    const guia = prepararGuia(fuentes, normas);
    const dia = guia.dias.find((d) => d.fecha === "2026-10-22");
    expect(dia).toBeDefined();
    expect(dia?.grupos.map((grupo) => grupo.categoria)).toEqual([
      "feature",
      "fix"
    ]);
    expect(dia?.grupos[0]?.entradas.map((e) => e.titulo)).toEqual([
      "Una feature"
    ]);
    expect(dia?.grupos[1]?.entradas.map((e) => e.titulo)).toEqual(["Un fix"]);
  });

  it("baja los apartados de una entrada por debajo de su título", () => {
    const guia = prepararGuia(fuentes, normas);
    const entrada = guia.dias.find((d) => d.fecha === "2026-10-22")?.entradas[0];
    expect(entrada?.html).toContain("<h5");
    expect(entrada?.html).toContain('id="un-apartado"');
    expect(entrada?.html).not.toContain("<h3");
  });

  it("ordena los días y no pierde ninguna entrada", () => {
    const guia = prepararGuia(fuentes, normas);
    expect(guia.dias.map((d) => d.fecha)).toEqual(["2026-10-21", "2026-10-22"]);
    const total = guia.dias.reduce((n, d) => n + d.entradas.length, 0);
    expect(total).toBe(3);
  });

  it("deja en Futuro las que esperan", () => {
    const guia = prepararGuia(fuentes, normas);
    expect(guia.futuras.map((entrada) => entrada.titulo)).toEqual([
      "Otra feature, la primera del día anterior"
    ]);
  });

  it("reescribe los enlaces de una entrada a su documento", () => {
    const guia = prepararGuia(fuentes, normas);
    const entrada = guia.dias
      .find((d) => d.fecha === "2026-10-22")
      ?.entradas.find((e) => e.titulo === "Un fix");
    expect(entrada?.html).toContain(
      `href="${conBase("/docs/adr/0031-0040/0034-la-web-del-proyecto/")}"`
    );
  });

  it("da el mismo resultado dos veces", () => {
    expect(prepararGuia(fuentes, normas)).toEqual(
      prepararGuia(fuentes, normas)
    );
  });

  it("parte la fecha para la cabecera del día", () => {
    expect(fechaPartida("2026-10-21")).toEqual({
      dia: "21",
      mes: "octubre",
      anio: "2026"
    });
  });
});

describe("la guía en inglés", () => {
  it("lleva los días a `/en/guia/` y deja la última fecha en la portada", () => {
    expect(rutaDia("2026-10-21", "2026-10-22", "en")).toBe(
      "/en/guia/2026-10-21/"
    );
    expect(rutaDia("2026-10-22", "2026-10-22", "en")).toBe("/en/guia/");
    expect(rutaDia("2026-10-21", "2026-10-22")).toBe("/guia/2026-10-21/");
  });

  it("escribe la fecha en el orden del inglés", () => {
    expect(fechaPartida("2026-10-21", "en")).toEqual({
      dia: "21",
      mes: "October",
      anio: "2026"
    });
    expect(fechaCorta("2026-10-21", "en")).toBe("Oct 21");
  });

  it("nombra categorías y veredictos en inglés", () => {
    expect(nombreCategoria("feature", "en")).toBe("Features");
    expect(nombreVeredicto("fase", "en")).toBe("phase");
    expect(nombreCategoria("feature")).toBe("Novedades");
  });

  it("lleva los enlaces de una entrada a `/en/docs/`", () => {
    const guia = prepararGuia(fuentes, normas, "en");
    const entrada = guia.dias
      .find((d) => d.fecha === "2026-10-22")
      ?.entradas.find((e) => e.titulo === "Un fix");
    expect(entrada?.html).toContain(
      `href="${conBase("/en/docs/adr/0031-0040/0034-la-web-del-proyecto/")}"`
    );
  });
});

describe("la guía traducida", () => {
  const docs = path.resolve(import.meta.dirname, "../docs");
  const entradasEs = path.join(docs, "guideline/entradas");
  const entradasEn = path.join(docs, "en/guideline/entradas");

  it("tiene en inglés las mismas entradas que en español", () => {
    expect(fs.readdirSync(entradasEn).sort()).toEqual(
      fs.readdirSync(entradasEs).sort()
    );
  });

  it("traduce las normas de la guía", () => {
    const es = fs.readFileSync(path.join(docs, "guideline/normas.md"), "utf8");
    const en = fs.readFileSync(path.join(docs, "en/guideline/normas.md"), "utf8");
    expect(es).toContain("## Los iconos");
    expect(en).toContain("## The icons");
    expect(en).not.toContain("## Los iconos");
  });
});

describe("la guía del repo", () => {
  const guideline = path.resolve(
    import.meta.dirname,
    "../docs/guideline"
  );
  const entradas = fs
    .readdirSync(path.join(guideline, "entradas"))
    .filter((archivo) => archivo.endsWith(".md"))
    .sort()
    .map((archivo): FuenteGuia => {
      const texto = fs.readFileSync(
        path.join(guideline, "entradas", archivo),
        "utf8"
      );
      const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(texto);
      if (!match) throw new Error(`sin frontmatter: ${archivo}`);
      const data = parseYaml(match[1] ?? "") as {
        title: string;
        date: string;
        category: Categoria;
        verdict: Veredicto;
      };
      return {
        id: archivo.replace(/\.md$/, ""),
        body: match[2] ?? "",
        data
      };
    });

  const guia = prepararGuia(
    entradas,
    fs.readFileSync(path.join(guideline, "normas.md"), "utf8")
  );

  it("tiene días y ninguno se queda sin grupos", () => {
    expect(guia.dias.length).toBeGreaterThan(0);
    for (const dia of guia.dias) {
      expect(dia.grupos.length).toBeGreaterThan(0);
      const sumadas = dia.grupos.reduce((n, g) => n + g.entradas.length, 0);
      expect(sumadas).toBe(dia.entradas.length);
    }
  });

  it("declara una categoría y un veredicto conocidos", () => {
    for (const fuente of entradas) {
      expect(CATEGORIAS[fuente.data.category]).toBeDefined();
      expect(typeof fuente.data.date).toBe("string");
      expect(fuente.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("pinta los grupos en el orden del changelog", () => {
    for (const dia of guia.dias) {
      const orden = dia.grupos.map((grupo) => CATEGORIAS[grupo.categoria].orden);
      expect(orden).toEqual([...orden].sort((a, b) => a - b));
    }
  });

  it("no lleva marcas de estado en el cuerpo de las entradas", () => {
    for (const entrada of guia.dias.flatMap((dia) => dia.entradas)) {
      expect(entrada.html).not.toMatch(/[✓✗✅]/);
      expect(entrada.resumen).not.toMatch(/[✓✗✅]/);
    }
  });

  it("deja las normas fuera de las entradas", () => {
    expect(guia.normas).toContain("Las categorías");
    expect(guia.normas).not.toContain("**Qué es**");
  });
});
