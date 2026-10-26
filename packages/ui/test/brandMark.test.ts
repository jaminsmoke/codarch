import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import mark from "../src/brand-mark.json";

const root = path.resolve(import.meta.dirname, "../../..");
const web = path.join(root, "apps/web/public");

function rects(svg: string): Record<string, string>[] {
  return [...svg.matchAll(/<rect ([^/]*?)\/>/g)].map(([, attributes]) => {
    const parsed: Record<string, string> = {};
    for (const [, name, value] of (attributes ?? "").matchAll(
      /([\w-]+)="([^"]*)"/g
    )) {
      if (name && value !== undefined) parsed[name] = value;
    }
    return parsed;
  });
}

function attr(rect: Record<string, string>, name: string): string {
  const value = rect[name];
  if (value === undefined) throw new Error(`el rect no lleva ${name}`);
  return value;
}

/** Ancho y alto de un PNG, que van en la cabecera IHDR. */
function pngSize(file: string): { width: number; height: number } {
  const header = readFileSync(file).subarray(0, 24);
  expect([...header.subarray(0, 8)]).toEqual([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
  ]);
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

describe("la marca de la casa", () => {
  it.each([
    "apps/web/public/favicon.svg",
    "apps/site/public/favicon.svg"
  ])("%s es el mismo dibujo que la cabecera", (file) => {
    const svg = readFileSync(path.join(root, file), "utf8");
    const [background = {}, ...blocks] = rects(svg);

    expect(Number(attr(background, "width"))).toBe(mark.viewBox);
    expect(Number(attr(background, "height"))).toBe(mark.viewBox);
    expect(Number(attr(background, "rx"))).toBe(mark.background.radius);
    expect(attr(background, "fill")).toBe(mark.background.fill);

    expect(
      blocks.map((block) => [
        Number(attr(block, "x")),
        Number(attr(block, "y")),
        Number(attr(block, "width")),
        Number(attr(block, "height")),
        attr(block, "fill")
      ])
    ).toEqual(
      mark.blocks.map((block) => [
        block.x,
        block.y,
        block.width,
        block.height,
        block.fill
      ])
    );
  });

  it("los iconos salen cuadrados y al tamaño que pide cada sitio", () => {
    expect(pngSize(path.join(web, "favicon.png"))).toEqual({
      width: 64,
      height: 64
    });
    expect(pngSize(path.join(web, "icon.png"))).toEqual({
      width: 512,
      height: 512
    });
    expect(pngSize(path.join(root, "apps/desktop/build/icon.png"))).toEqual({
      width: 512,
      height: 512
    });
  });
});
