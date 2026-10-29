import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { parseCcJson } from "@codarch/schema";
import { buildRenderModel, RenderError } from "../src/index";
import { captureMap, renderMapPng } from "../src/mapShot";
import { encodePng } from "../src/png";
import { listShots, shotName, writeShot } from "../src/shots";

const fixtureJson = JSON.parse(
  readFileSync(new URL("./fixtures/render.cc.json", import.meta.url), "utf8")
) as unknown;
const fixture = parseCcJson(fixtureJson);

/** El fixture con otro nombre en su primer fichero: solo cambia la etiqueta. */
function withFirstName(name: string) {
  const copy = structuredClone(fixtureJson) as {
    files: Array<{ type: string; name: string; children?: unknown[] }>;
  };
  const rename = (node: { type: string; name: string; children?: unknown[] }): boolean => {
    if (node.type === "File") {
      node.name = name;
      return true;
    }
    for (const child of (node.children ?? []) as typeof copy.files) {
      if (rename(child)) return true;
    }
    return false;
  };
  rename(copy.files[0] as { type: string; name: string; children?: unknown[] });
  return parseCcJson(copy);
}

const temporaries: string[] = [];

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-shot-"));
  temporaries.push(root);
  return root;
}

afterEach(() => {
  while (temporaries.length > 0) {
    fs.rmSync(temporaries.pop() as string, { recursive: true, force: true });
  }
});

/** Lee la cabecera IHDR de un PNG: firma, ancho y alto. */
function headerOf(png: Buffer) {
  return {
    signature: [...png.subarray(0, 8)],
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20)
  };
}

describe("la captura del mapa", () => {
  it("da los mismos bytes para el mismo mapa", () => {
    const model = buildRenderModel(fixture);
    expect(renderMapPng(model).equals(renderMapPng(model))).toBe(true);
  });

  it("escribe un PNG con el tamaño pedido", () => {
    const png = renderMapPng(buildRenderModel(fixture), 320, 240);
    expect(headerOf(png)).toEqual({
      signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      width: 320,
      height: 240
    });
  });

  it("pinta el nombre de la caja grande, con su caja y su tamaño", () => {
    const alpha = renderMapPng(buildRenderModel(withFirstName("alpha.ts")), 400, 300);
    const omega = renderMapPng(buildRenderModel(withFirstName("omega.ts")), 400, 300);
    expect(alpha.equals(omega)).toBe(false);

    // El mismo nombre da los mismos píxeles: la letra no depende del azar.
    expect(
      alpha.equals(renderMapPng(buildRenderModel(withFirstName("alpha.ts")), 400, 300))
    ).toBe(true);
  });

  it("pinta distinto según el color pedido", () => {
    const risk = renderMapPng(buildRenderModel(fixture, { color: "risk" }), 200, 200);
    const metric = renderMapPng(
      buildRenderModel(fixture, { color: "rloc" }),
      200,
      200
    );
    expect(risk.equals(metric)).toBe(false);
  });

  it("no deja pedir un mapa de cuatro píxeles ni uno de 9000", () => {
    const model = buildRenderModel(fixture);
    expect(() => renderMapPng(model, 40, 40)).toThrow(RangeError);
    expect(() => renderMapPng(model, 4097, 4097)).toThrow(RangeError);
  });

  it("falla con una métrica que el snapshot no trae", () => {
    expect(() => buildRenderModel(fixture, { color: "ffiCrossings" })).toThrow(
      RenderError
    );
  });

  it("resuelve el área y el color en el resumen", () => {
    const shot = captureMap(fixture, tempRoot(), { color: "risk" });
    expect(shot.summary.color).toBe("risk");
    expect(shot.summary.area).toBe("rloc");
    expect(shot.summary.legend.map((entry) => entry.label)).toEqual([
      "riesgo bajo",
      "riesgo medio",
      "riesgo alto"
    ]);
    expect(shot.summary.cells[0]?.path).toBe("src/only/a.ts");
    expect(fs.existsSync(shot.file)).toBe(true);
  });

  it("acepta el calor como alias de la métrica de commits", () => {
    const shot = captureMap(fixture, tempRoot(), { color: "churn" });
    expect(shot.summary.color).toBe("number_of_commits");
  });

  it("guarda en una ruta concreta sin gastar ranura", () => {
    const out = path.join(tempRoot(), "capturas", "mapa.png");
    const shot = captureMap(fixture, tempRoot(), { out });
    expect(shot.slot).toBe(0);
    expect(shot.file).toBe(path.resolve(out));
    expect(fs.statSync(out).size).toBe(shot.bytes);
  });
});

describe("las dos ranuras", () => {
  const png = (tag: number): Buffer => encodePng(1, 1, new Uint8Array([1, 2, 3, tag]));

  it("llenan la primera y la segunda antes de pisar nada", () => {
    const root = tempRoot();
    expect(writeShot(root, png(1)).slot).toBe(1);
    expect(writeShot(root, png(2)).slot).toBe(2);
    expect(listShots(root).map((file) => path.basename(file))).toEqual([
      shotName(1),
      shotName(2)
    ]);
  });

  it("con las dos ocupadas, pisan la más antigua", () => {
    const root = tempRoot();
    const first = writeShot(root, png(1));
    const second = writeShot(root, png(2));
    // La primera captura es la de antes: se le pone una fecha anterior.
    fs.utimesSync(first.file, new Date(1_000), new Date(1_000));

    const third = writeShot(root, png(3));
    expect(third.slot).toBe(first.slot);
    expect(fs.readFileSync(third.file).equals(png(3))).toBe(true);

    // La segunda sigue donde estaba, con su contenido original.
    const kept = fs.readFileSync(second.file);
    expect(kept.equals(png(2))).toBe(true);

    // Las fechas se fijan a mano: el orden no puede depender del reloj.
    fs.utimesSync(second.file, new Date(2_000), new Date(2_000));
    fs.utimesSync(third.file, new Date(3_000), new Date(3_000));
    expect(listShots(root).map((file) => path.basename(file))).toEqual([
      shotName(2),
      shotName(1)
    ]);
  });

  it("nunca guarda más de dos", () => {
    const root = tempRoot();
    for (let index = 0; index < 6; index++) writeShot(root, png(index));
    expect(
      fs.readdirSync(path.join(root, ".codarch", "shots")).filter((name) => name.endsWith(".png"))
    ).toHaveLength(2);
    expect(listShots(root)).toHaveLength(2);
  });
});
