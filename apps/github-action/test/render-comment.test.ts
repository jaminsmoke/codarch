import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  escapeInline,
  escapeText,
  format,
  mapSection,
  readMap,
  renderComment,
  ruleOrigin,
  signed
} from "../render-comment.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(here, "fixtures");

function load(name: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(fixtures, name), "utf8"));
}

describe("render-comment · helpers", () => {
  it("firma un delta y formatea números en español", () => {
    expect(signed(0)).toBe("0");
    expect(signed(3)).toBe("+3");
    expect(signed(-2)).toBe("-2");
    expect(format(3.5)).toBe(new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(3.5));
    expect(format(1200)).toBe(new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(1200));
    expect(format(Number.NaN)).toBe("—");
    expect(format(undefined as unknown as number)).toBe("—");
  });

  it("escapa backticks y saltos de línea", () => {
    expect(escapeInline("a`b")).toBe("a'b");
    expect(escapeText("hola\nmundo `x`")).toBe("hola mundo 'x'");
  });

  it("anota el origen de la regla", () => {
    expect(ruleOrigin(undefined)).toBe("");
    expect(ruleOrigin("config")).toBe("");
    expect(ruleOrigin("profile")).toBe(" (del perfil)");
    expect(ruleOrigin("addon:lint")).toBe(" (addon `lint`)");
    expect(ruleOrigin("otro")).toBe("");
  });
});

describe("render-comment · readMap y mapa", () => {
  it("lee un mapa con summary y rechaza basura", () => {
    expect(readMap(path.join(fixtures, "map-shot.json"))?.summary?.area).toBe(
      "size"
    );
    expect(readMap(undefined)).toBeNull();
    expect(readMap(path.join(fixtures, "no-existe.json"))).toBeNull();

    const tmp = path.join(os.tmpdir(), `codarch-map-${process.pid}.json`);
    fs.writeFileSync(tmp, "{no-json", "utf8");
    expect(readMap(tmp)).toBeNull();
    fs.writeFileSync(tmp, JSON.stringify({ empty: true }), "utf8");
    expect(readMap(tmp)).toBeNull();
    fs.unlinkSync(tmp);
  });

  it("pinta el bloque del mapa con celdas y leyenda", () => {
    const shot = load("map-shot.json") as {
      summary: Record<string, unknown>;
    };
    const lines = mapSection(shot, {
      runUrl: "https://example.test/run",
      artifact: "codarch"
    });
    const text = lines.join("\n");
    expect(text).toContain("### Mapa del head");
    expect(text).toContain("Cajas por `size`");
    expect(text).toContain("Escala: bajo · alto");
    expect(text).toContain("| Celda | Área | Valor |");
    expect(text).toContain("`src/a.ts`");
    expect(text).toContain("#artifacts");
  });
});

describe("render-comment · comentario", () => {
  it("un reporte limpio dice que no hay cambios", () => {
    const report = load("report-clean.json");
    const text = renderComment(report, { status: "0", artifact: "codarch" });
    expect(text).toContain("<!-- codarch-report -->");
    expect(text).toContain("**✅ Sin cambios relevantes de arquitectura.**");
    expect(text).toContain(
      "Sin ciclos, hotspots, violaciones, duplicación ni cambios de símbolos nuevos."
    );
    expect(text).toContain("Base `base-aaa` → Head `head-bbb`");
    expect(text).toContain("Artefacto: `codarch`");
  });

  it("marca bloqueo y error según el estado", () => {
    const report = load("report-clean.json");
    expect(renderComment(report, { status: "2" })).toContain(
      "**❌ La política de arquitectura ha fallado.**"
    );
    expect(renderComment(report, { status: "1" })).toContain(
      "**⚠️ CodArch no pudo completar el análisis.**"
    );
  });

  it("resume el diff rico y trunca listas largas", () => {
    const report = load("report-rich.json");
    const text = renderComment(report, {
      status: "0",
      runUrl: "https://example.test/run",
      artifact: "pack",
      mapShot: load("map-shot.json")
    });
    expect(text).toContain("**⚠️ Hay cambios de arquitectura, sin bloqueo.**");
    expect(text).toContain("| Ciclos nuevos | 6 |");
    expect(text).toContain("(`risk`)");
    expect(text).toContain("### Ciclos nuevos");
    expect(text).toContain("- … y 1 más");
    expect(text).toContain("### Hotspots");
    expect(text).toContain("### Violaciones nuevas");
    expect(text).toContain("(del perfil)");
    expect(text).toContain("(addon `lint`)");
    expect(text).toContain("aviso con 'ticks'");
    expect(text).toContain("### Símbolos");
    expect(text).toContain("### Migración");
    expect(text).toContain("### Duplicación");
    expect(text).toContain("### Mapa del head");
    expect(text).toContain("[Ver ejecución](https://example.test/run)");
    expect(text).toContain("Artefacto: `pack`");
  });

  it("sin medir duplicación lo dice en la tabla", () => {
    const report = load("report-rich.json") as {
      duplication: { lines: { delta: number | null }; base: boolean };
    };
    report.duplication.lines.delta = null;
    const text = renderComment(report);
    expect(text).toContain("| Duplicación | sin medir en el head |");
  });
});
