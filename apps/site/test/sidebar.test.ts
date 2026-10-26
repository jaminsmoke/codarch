import { describe, expect, it } from "vitest";
import { sidebar } from "../src/sidebar.mjs";

type Entrada = { label: string; slug?: string; link?: string; items?: Entrada[] };

const grupos = sidebar() as Entrada[];
const usar = grupos.find((grupo) => grupo.label === "Usar CodArch");
const construir = grupos.find((grupo) => grupo.label === "Cómo se construye");
const cli = usar?.items?.find((item) => item.label === "CLI");
const decisiones = construir?.items?.find(
  (item) => item.label === "Decisiones (ADR)"
);
const bloque = decisiones?.items?.find((item) => item.label === "0041–0050");

describe("la sidebar de los documentos", () => {
  it("tiene dos bloques: usar y cómo se construye", () => {
    expect(grupos.map((grupo) => grupo.label)).toEqual([
      "Usar CodArch",
      "Cómo se construye"
    ]);
  });

  it("pone lo que necesita quien usa CodArch en su orden", () => {
    expect(usar?.items?.map((item) => item.slug ?? item.label)).toEqual([
      "docs/index",
      "docs/usar/instalacion",
      "docs/usar/primeros-pasos",
      "CLI",
      "docs/usar/actualizaciones",
      "docs/usar/webapp",
      "docs/usar/escritorio",
      "docs/rules",
      "docs/mcp",
      "docs/usar/github-action",
      "docs/usar/preguntas-frecuentes"
    ]);
  });

  it("da una página a cada comando del CLI", () => {
    expect(cli?.items?.map((item) => item.slug)).toEqual([
      "docs/usar/cli/analyze",
      "docs/usar/cli/inspect",
      "docs/usar/cli/render",
      "docs/usar/cli/diff",
      "docs/usar/cli/serve",
      "docs/usar/cli/history",
      "docs/usar/cli/mcp"
    ]);
  });

  it("pone cómo se construye con el roadmap, el diseño, los ADR y la guía", () => {
    expect(construir?.items?.map((item) => item.slug ?? item.label)).toEqual([
      "docs/adr/roadmap",
      "docs/model",
      "docs/design/map",
      "docs/migration",
      "Decisiones (ADR)",
      "La guía"
    ]);
  });

  it("agrupa los ADR por carpeta de diez", () => {
    expect(decisiones?.items?.some((item) => item.slug === "docs/adr/index")).toBe(
      true
    );
    expect(bloque?.items?.some((item) => item.slug?.endsWith("0046-los-documentos-con-starlight"))).toBe(
      true
    );
    expect(bloque?.items?.some((item) => item.slug?.endsWith("0047-el-changelog-es-la-guia"))).toBe(
      true
    );
    expect(bloque?.items?.some((item) => item.slug?.includes(".changelog"))).toBe(
      false
    );
  });
});
