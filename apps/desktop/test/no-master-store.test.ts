import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * No hay libro maestro en la ruta nativa de CodArch (ADR 0050).
 *
 * El proceso principal escribe el estado en `.codarch/` del repo y no en el
 * perfil de la app; abrir un fichero suelto deja de vigilar y de apuntar al
 * repo anterior para no mezclar historiales ni cadenas.
 */
describe("el estado no vive en la app", () => {
  const main = fs.readFileSync(
    path.resolve(import.meta.dirname, "../src/main.ts"),
    "utf8"
  );
  const plataforma = fs.readFileSync(
    path.resolve(import.meta.dirname, "../src/renderer/plataforma.ts"),
    "utf8"
  );

  it("el proceso principal usa .codarch y no el perfil de la app", () => {
    expect(main).toContain('CODARCH_DIR = ".codarch"');
    expect(main).not.toMatch(/getPath\(\s*["']userData/);
    expect(main).not.toMatch(/homedir\(/);
  });

  it("un fichero suelto no se guarda como proyecto ni deja el repo anterior", () => {
    expect(main).toContain("Un fichero suelto no es un proyecto");
    expect(plataforma).toContain("persistProject");
    expect(plataforma).not.toContain("codarch.project.v1");
  });
});
