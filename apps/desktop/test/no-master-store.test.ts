import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * No hay libro maestro en la ruta nativa de CodArch (ADR 0050).
 *
 * El proceso principal escribe el estado en `.codarch/` del repo y no en el
 * perfil de la app; abrir un fichero suelto deja de vigilar y de apuntar al
 * repo anterior para no mezclar historiales ni cadenas. El estado vive en
 * `persistence.ts` y el abrir, en `targets.ts`: `main.ts` solo cablea.
 */
describe("el estado no vive en la app", () => {
  const source = (name: string): string =>
    fs.readFileSync(path.resolve(import.meta.dirname, "../src", name), "utf8");

  it("el estado se escribe en .codarch y no en el perfil de la app", () => {
    const persistence = source("persistence.ts");
    expect(persistence).toContain("@codarch/schema");
    expect(persistence).toContain("codarchPath(");

    const main = source("main.ts");
    expect(main).not.toMatch(/getPath\(\s*["']userData/);
    expect(main).not.toMatch(/homedir\(/);
    // Sin disco en el cableado: escribir es de `persistence`.
    expect(main).not.toContain("writeFileSync");
  });

  it("un fichero suelto no se guarda como proyecto ni deja el repo anterior", () => {
    expect(source("targets.ts")).toContain(
      "Un fichero suelto no es un repo"
    );
    const plataforma = source("renderer/plataforma.ts");
    expect(plataforma).toContain("persistProject");
    expect(plataforma).not.toContain("codarch.project.v1");
  });
});
