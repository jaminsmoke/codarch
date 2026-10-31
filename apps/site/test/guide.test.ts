import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  shortDate,
  splitDate,
  categoryName,
  verdictName,
  parseGuidePath,
  dayPath,
  guideRoute,
  type Category,
  type Verdict
} from "../src/lib/guide";
import {
  prepareGuide,
  type GuideSource
} from "../src/lib/guide-server";
import { withBase } from "../src/lib/routes";

/** Unas entradas pequeñas, con la forma de la guía. */
const fuentes: GuideSource[] = [
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

describe("prepareGuide", () => {
  it("renderiza las normas", () => {
    const guia = prepareGuide(fuentes, normas);
    expect(guia.rules).toContain("La leyenda");
    expect(guia.rules).not.toContain("Una feature");
  });

  it("agrupa cada día por categoría, en el orden del changelog", () => {
    const guia = prepareGuide(fuentes, normas);
    const day = guia.days.find((d) => d.date === "2026-10-22");
    expect(day).toBeDefined();
    expect(day?.groups.map((grupo) => grupo.category)).toEqual([
      "feature",
      "fix"
    ]);
    expect(day?.groups[0]?.entries.map((e) => e.title)).toEqual([
      "Una feature"
    ]);
    expect(day?.groups[1]?.entries.map((e) => e.title)).toEqual(["Un fix"]);
  });

  it("baja los apartados de una entrada por debajo de su título", () => {
    const guia = prepareGuide(fuentes, normas);
    const entrada = guia.days.find((d) => d.date === "2026-10-22")?.entries[0];
    expect(entrada?.html).toContain("<h5");
    expect(entrada?.html).toContain('id="un-apartado"');
    expect(entrada?.html).not.toContain("<h3");
  });

  it("ordena los días y no pierde ninguna entrada", () => {
    const guia = prepareGuide(fuentes, normas);
    expect(guia.days.map((d) => d.date)).toEqual(["2026-10-21", "2026-10-22"]);
    const total = guia.days.reduce((n, d) => n + d.entries.length, 0);
    expect(total).toBe(3);
  });

  it("deja en Futuro las que esperan", () => {
    const guia = prepareGuide(fuentes, normas);
    expect(guia.upcoming.map((entrada) => entrada.title)).toEqual([
      "Otra feature, la primera del día anterior"
    ]);
  });

  it("reescribe los enlaces de una entrada a su documento", () => {
    const guia = prepareGuide(fuentes, normas);
    const entrada = guia.days
      .find((d) => d.date === "2026-10-22")
      ?.entries.find((e) => e.title === "Un fix");
    expect(entrada?.html).toContain(
      `href="${withBase("/desarrollo/adr/0031-0040/0034-la-web-del-proyecto/")}"`
    );
  });

  it("da el mismo resultado dos veces", () => {
    expect(prepareGuide(fuentes, normas)).toEqual(
      prepareGuide(fuentes, normas)
    );
  });

  it("parte la fecha para la cabecera del día", () => {
    expect(splitDate("2026-10-21")).toEqual({
      day: "21",
      month: "octubre",
      year: "2026"
    });
  });
});

describe("la guía en inglés", () => {
  it("lleva los días a `/en/desarrollo/guia/` y deja la última fecha en la portada", () => {
    expect(dayPath("2026-10-21", "2026-10-22", "en")).toBe(
      "/en/desarrollo/guia/2026-10-21/"
    );
    expect(dayPath("2026-10-22", "2026-10-22", "en")).toBe("/en/desarrollo/guia/");
    expect(dayPath("2026-10-21", "2026-10-22")).toBe("/desarrollo/guia/2026-10-21/");
  });

  it("escribe la fecha en el orden del inglés", () => {
    expect(splitDate("2026-10-21", "en")).toEqual({
      day: "21",
      month: "October",
      year: "2026"
    });
    expect(shortDate("2026-10-21", "en")).toBe("Oct 21");
  });

  it("nombra categorías y veredictos en inglés", () => {
    expect(categoryName("feature", "en")).toBe("Features");
    expect(verdictName("fase", "en")).toBe("phase");
    expect(categoryName("feature")).toBe("Novedades");
  });

  it("lleva los enlaces de una entrada a `/en/desarrollo/`", () => {
    const guia = prepareGuide(fuentes, normas, "en");
    const entrada = guia.days
      .find((d) => d.date === "2026-10-22")
      ?.entries.find((e) => e.title === "Un fix");
    expect(entrada?.html).toContain(
      `href="${withBase("/en/desarrollo/adr/0031-0040/0034-la-web-del-proyecto/")}"`
    );
  });
});

describe("la guía traducida", () => {
  const docs = path.resolve(import.meta.dirname, "../docs");
  const entradasEs = path.join(docs, "desarrollo/guideline/entradas");
  const entradasEn = path.join(docs, "en/desarrollo/guideline/entradas");

  it("tiene en inglés las mismas entradas que en español", () => {
    expect(fs.readdirSync(entradasEn).sort()).toEqual(
      fs.readdirSync(entradasEs).sort()
    );
  });

  it("traduce las normas de la guía", () => {
    const es = fs.readFileSync(path.join(docs, "desarrollo/guideline/normas.md"), "utf8");
    const en = fs.readFileSync(path.join(docs, "en/desarrollo/guideline/normas.md"), "utf8");
    expect(es).toContain("## Los iconos");
    expect(en).toContain("## The icons");
    expect(en).not.toContain("## Los iconos");
  });
});

describe("la guía del repo", () => {
  const guideline = path.resolve(
    import.meta.dirname,
    "../docs/desarrollo/guideline"
  );
  const entradas = fs
    .readdirSync(path.join(guideline, "entradas"))
    .filter((archivo) => archivo.endsWith(".md"))
    .sort()
    .map((archivo): GuideSource => {
      const texto = fs.readFileSync(
        path.join(guideline, "entradas", archivo),
        "utf8"
      );
      const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(texto);
      if (!match) throw new Error(`sin frontmatter: ${archivo}`);
      const data = parseYaml(match[1] ?? "") as {
        title: string;
        date: string;
        category: Category;
        verdict: Verdict;
      };
      return {
        id: archivo.replace(/\.md$/, ""),
        body: match[2] ?? "",
        data
      };
    });

  const guia = prepareGuide(
    entradas,
    fs.readFileSync(path.join(guideline, "normas.md"), "utf8")
  );

  it("tiene días y ninguno se queda sin grupos", () => {
    expect(guia.days.length).toBeGreaterThan(0);
    for (const day of guia.days) {
      expect(day.groups.length).toBeGreaterThan(0);
      const sumadas = day.groups.reduce((n, g) => n + g.entries.length, 0);
      expect(sumadas).toBe(day.entries.length);
    }
  });

  it("declara una categoría y un veredicto conocidos", () => {
    for (const fuente of entradas) {
      expect(CATEGORIES[fuente.data.category]).toBeDefined();
      expect(typeof fuente.data.date).toBe("string");
      expect(fuente.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("pinta los grupos en el orden del changelog", () => {
    for (const day of guia.days) {
      const orden = day.groups.map((grupo) => CATEGORIES[grupo.category].orden);
      expect(orden).toEqual([...orden].sort((a, b) => a - b));
    }
  });

  it("no lleva marcas de estado en el cuerpo de las entradas", () => {
    for (const entrada of guia.days.flatMap((day) => day.entries)) {
      expect(entrada.html).not.toMatch(/[✓✗✅]/);
      expect(entrada.summary).not.toMatch(/[✓✗✅]/);
    }
  });

  it("deja las normas fuera de las entradas", () => {
    expect(guia.rules).toContain("Las categorías");
    expect(guia.rules).not.toContain("**Qué es**");
  });
});

describe("la ruta de la guía", () => {
  const dates = ["2026-10-21", "2026-10-22"];

  it("lee el día que pide la dirección, también con la sección y la base delante", () => {
    // Regresión: se exigía que `guia` fuese la primera parte, así que la
    // dirección de un día acababa siempre en el último.
    expect(parseGuidePath("/desarrollo/guia/2026-10-21/", dates)).toEqual({
      kind: "day",
      date: "2026-10-21"
    });
    expect(parseGuidePath("/codarch/desarrollo/guia/2026-10-21/", dates)).toEqual(
      { kind: "day", date: "2026-10-21" }
    );
    expect(
      parseGuidePath("/en/desarrollo/guia/2026-10-21/", dates, "en")
    ).toEqual({ kind: "day", date: "2026-10-21" });
  });

  it("deja el último día en la portada de la guía", () => {
    expect(parseGuidePath("/desarrollo/guia/", dates)).toEqual({
      kind: "day",
      date: "2026-10-22"
    });
    expect(parseGuidePath("/codarch/desarrollo/guia/", dates)).toEqual({
      kind: "day",
      date: "2026-10-22"
    });
  });

  it("reconoce el futuro y las normas", () => {
    expect(parseGuidePath("/desarrollo/guia/futuro/", dates)).toEqual({
      kind: "future"
    });
    expect(parseGuidePath("/desarrollo/guia/normas/", dates)).toEqual({
      kind: "rules"
    });
  });

  it("cae al último día con una fecha que no existe o una ruta ajena", () => {
    expect(parseGuidePath("/desarrollo/guia/2026-01-01/", dates)).toEqual({
      kind: "day",
      date: "2026-10-22"
    });
    expect(parseGuidePath("/docs/model/", dates)).toEqual({
      kind: "day",
      date: "2026-10-22"
    });
  });

  it("escribe la dirección canónica de cada vista", () => {
    expect(guideRoute({ kind: "day", date: "2026-10-21" }, "2026-10-22")).toBe(
      "/desarrollo/guia/2026-10-21/"
    );
    expect(guideRoute({ kind: "day", date: "2026-10-22" }, "2026-10-22")).toBe(
      "/desarrollo/guia/"
    );
    expect(guideRoute({ kind: "future" }, "2026-10-22", "en")).toBe(
      "/en/desarrollo/guia/futuro/"
    );
    expect(guideRoute({ kind: "rules" }, "2026-10-22")).toBe(
      "/desarrollo/guia/normas/"
    );
  });
});
