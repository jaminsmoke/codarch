import { describe, expect, it } from "vitest";
import { documentTitle } from "../src/title";

describe("el título de la ventana", () => {
  it("sin nada abierto, solo el nombre de la app", () => {
    expect(documentTitle(null)).toBe("CodArch");
  });

  it("con una carpeta, su nombre", () => {
    expect(documentTitle("/home/ana/proyectos/codarch")).toBe(
      "CodArch · codarch"
    );
    expect(documentTitle("C:\\repos\\codarch")).toBe("CodArch · codarch");
  });

  it("aguanta la barra final que devuelven algunos diálogos de Linux", () => {
    expect(documentTitle("/home/ana/proyectos/codarch/")).toBe(
      "CodArch · codarch"
    );
  });

  it("con un fichero, también su nombre", () => {
    expect(documentTitle("/tmp/snapshot.cc.json")).toBe(
      "CodArch · snapshot.cc.json"
    );
  });

  it("manda el nombre del proyecto sobre el de la carpeta", () => {
    expect(documentTitle("/home/ana/clones/mi-repo", "Motor de pagos")).toBe(
      "CodArch · Motor de pagos"
    );
  });

  it("un nombre de proyecto vacío no pisa la carpeta", () => {
    expect(documentTitle("/home/ana/clones/mi-repo", "   ")).toBe(
      "CodArch · mi-repo"
    );
  });
});
