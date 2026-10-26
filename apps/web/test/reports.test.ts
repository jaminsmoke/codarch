import { describe, expect, it } from "vitest";
import {
  ARTIFACT_REPORT_URL,
  HEAD_REPORT_URL,
  servedReportUrl
} from "../src/reports";

describe("qué reporte pide la app (ADR 0075)", () => {
  it("con servidor local, solo el reporte HEAD", () => {
    // El repo está delante y Cambios compara el árbol con su último commit:
    // un report.json de dos fotos viejas no entra en esa pestaña.
    expect(servedReportUrl(true)).toBe(HEAD_REPORT_URL);
  });

  it("un artefacto estático trae su report.json", () => {
    // El mapa de un PR no tiene git: su único cambio es el diff del pull.
    expect(servedReportUrl(false)).toBe(ARTIFACT_REPORT_URL);
  });

  it("los dos caminos apuntan a ficheros distintos", () => {
    expect(HEAD_REPORT_URL).not.toBe(ARTIFACT_REPORT_URL);
    expect(HEAD_REPORT_URL).toBe("data/head-report.json");
    expect(ARTIFACT_REPORT_URL).toBe("data/report.json");
  });
});
