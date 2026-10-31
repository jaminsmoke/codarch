import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * El guard del patrón de sección (ADR 0061, M49).
 *
 * Toda sección plegable declara título, cuenta y resumen: cerrada, la sección
 * sigue diciendo lo que importa. Dos excepciones, con nombre propio:
 *
 * - los grupos de símbolos (`symbol-group`), donde la cuenta es el resumen;
 * - las secciones sin datos (`section-empty`), que no tienen cuenta que dar.
 *
 * El guard lee el código de `@codarch/ui`, así que la web y el escritorio
 * heredan la misma comprobación sin repetirla.
 */

const ROOT = fileURLToPath(new URL("../src", import.meta.url));

function tsxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...tsxFiles(full));
    else if (entry.name.endsWith(".tsx")) files.push(full);
  }
  return files;
}

/** El texto de cada etiqueta `<CollapsibleSection …>`, con sus atributos. */
function openingTags(source: string): string[] {
  const tags: string[] = [];
  let from = 0;
  while (true) {
    const start = source.indexOf("<CollapsibleSection", from);
    if (start === -1) break;
    let index = start + "<CollapsibleSection".length;
    let depth = 0;
    let quote: string | null = null;
    for (; index < source.length; index += 1) {
      const char = source[index];
      if (quote) {
        if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'" || char === "`") {
        quote = char;
        continue;
      }
      if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
      else if (char === ">" && depth === 0) break;
    }
    tags.push(source.slice(start, index + 1));
    from = index + 1;
  }
  return tags;
}

function declares(tag: string, attribute: string): boolean {
  return new RegExp(`\\s${attribute}\\s*=`).test(tag);
}

describe("el patrón de las secciones plegables", () => {
  it("declara título, cuenta y resumen en cada sección", () => {
    const sections: { file: string; tag: string }[] = [];
    for (const file of tsxFiles(ROOT)) {
      const source = readFileSync(file, "utf8");
      for (const tag of openingTags(source)) {
        if (tag.includes("symbol-group") || tag.includes("section-empty")) {
          continue;
        }
        sections.push({ file: path.relative(ROOT, file), tag });
      }
    }

    // Si el escaneo deja de encontrar secciones, el guard no prueba nada.
    expect(sections.length).toBeGreaterThan(12);

    for (const { file, tag } of sections) {
      const heading = tag.replace(/\s+/g, " ").slice(0, 90);
      expect(declares(tag, "id"), `${file}: ${heading}`).toBe(true);
      expect(declares(tag, "title"), `${file}: ${heading}`).toBe(true);
      expect(declares(tag, "count"), `${file}: ${heading}`).toBe(true);
      expect(declares(tag, "summary"), `${file}: ${heading}`).toBe(true);
    }
  });
});
