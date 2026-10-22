import { describe, expect, it } from "vitest";
import { CATEGORIAS, fechaPartida, guia, partir } from "../src/lib/guia";

/** Un markdown pequeño, con la forma de la guía. */
const markdown = `# La guía

> La verdad

Una introducción sin metadatos.

## La leyenda

Cómo se escribe.

## Una feature
*feature · fase · 2026-10-22*

El cuerpo de la feature.

## Un fix
*fix · arreglo · 2026-10-22*

El cuerpo del fix.

## Otra feature, la primera del día anterior
*feature · idea · 2026-10-21*

El cuerpo de la otra.

### Un apartado

Con su texto.
`;

describe("partir", () => {
  it("separa la entradilla de las normas", () => {
    const guia = partir(markdown);
    expect(guia.introduccion).toContain("Una introducción sin metadatos");
    expect(guia.introduccion).not.toContain("La leyenda");
    expect(guia.introduccion).not.toContain("Una feature");
    expect(guia.normas).toContain("La leyenda");
    expect(guia.normas).not.toContain("Una feature");
  });

  it("agrupa cada día por categoría, en el orden del changelog", () => {
    const guia = partir(markdown);
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
    const guia = partir(markdown);
    const entrada = guia.dias.find((d) => d.fecha === "2026-10-21")?.entradas[0];
    expect(entrada?.html).toContain("<h5");
    expect(entrada?.html).toContain('id="un-apartado"');
    expect(entrada?.html).not.toContain("<h3");
  });

  it("ordena los días y no pierde ninguna entrada", () => {
    const guia = partir(markdown);
    expect(guia.dias.map((d) => d.fecha)).toEqual(["2026-10-21", "2026-10-22"]);
    const total = guia.dias.reduce((n, d) => n + d.entradas.length, 0);
    expect(total).toBe(3);
  });

  it("deja las categorías y los veredictos que no conoce en «otro»", () => {
    const guia = partir(`## Rara
*inventada · raro · 2026-10-22*

Cuerpo ✓.
`);
    const entrada = guia.dias[0]?.entradas[0];
    expect(entrada?.categoria).toBe("otro");
    expect(entrada?.veredicto).toBe("otro");
  });

  it("da el mismo resultado dos veces", () => {
    expect(partir(markdown)).toEqual(partir(markdown));
  });

  it("parte la fecha para la cabecera del día", () => {
    expect(fechaPartida("2026-10-21")).toEqual({
      dia: "21",
      mes: "octubre",
      anio: "2026"
    });
  });
});

describe("la guía del repo", () => {
  const guiaReal = guia();

  it("tiene días y ninguno se queda sin grupos", () => {
    expect(guiaReal.dias.length).toBeGreaterThan(0);
    for (const dia of guiaReal.dias) {
      expect(dia.grupos.length).toBeGreaterThan(0);
      const sumadas = dia.grupos.reduce((n, g) => n + g.entradas.length, 0);
      expect(sumadas).toBe(dia.entradas.length);
    }
  });

  it("declara una categoría conocida en cada entrada", () => {
    const sinCategoria = guiaReal.dias
      .flatMap((dia) => dia.entradas)
      .filter((entrada) => entrada.categoria === "otro");
    expect(sinCategoria.map((entrada) => entrada.titulo)).toEqual([]);
  });

  it("pinta los grupos en el orden del changelog", () => {
    for (const dia of guiaReal.dias) {
      const orden = dia.grupos.map((grupo) => CATEGORIAS[grupo.categoria].orden);
      expect(orden).toEqual([...orden].sort((a, b) => a - b));
    }
  });

  it("no lleva marcas de estado en el cuerpo de las entradas", () => {
    for (const entrada of guiaReal.dias.flatMap((dia) => dia.entradas)) {
      expect(entrada.html).not.toMatch(/[✓✗✅]/);
      expect(entrada.resumen).not.toMatch(/[✓✗✅]/);
    }
  });

  it("deja las normas fuera de las entradas", () => {
    expect(guiaReal.normas).toContain("Las categorías");
    expect(guiaReal.normas).not.toContain("*feature ·");
  });
});
