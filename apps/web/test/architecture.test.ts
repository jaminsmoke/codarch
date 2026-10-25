import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Las apps no crecen: lo que comparten vive en el hook o en `AppShell`.
 *
 * Es una guarda de mantenimiento (ADR 0049): si un `App.tsx` empieza a pintar
 * el armazón o a crecer sin freno, el test lo dice antes de que las dos apps
 * se separen otra vez. Los topes dejan margen para lo propio de cada
 * plataforma; si se quedan cortos, se sube el hook, no la app.
 */
const APPS = [
  {
    name: "la web",
    file: path.resolve(import.meta.dirname, "../src/App.tsx"),
    maxLines: 850
  },
  {
    name: "el escritorio",
    file: path.resolve(
      import.meta.dirname,
      "../../desktop/src/renderer/App.tsx"
    ),
    maxLines: 200
  }
];

/** Las piezas del armazón: solo las pinta `AppShell`. */
const ARMAZON = [
  "MapCanvas",
  "Inspector",
  "ChangesPanel",
  "DebtList",
  "HeatList",
  "HotList",
  "Kpi",
  "LanguageSample",
  "Legend",
  "HistoryPanel"
];

describe("las apps no engordan", () => {
  for (const app of APPS) {
    it(`${app.name} no pinta el armazón por su cuenta`, () => {
      const source = fs.readFileSync(app.file, "utf8");
      expect(source).toContain("AppShell");
      for (const pieza of ARMAZON) {
        expect(
          source.includes(pieza),
          `${pieza} se pinta en AppShell, no en ${app.name}`
        ).toBe(false);
      }
    });

    it(`${app.name} no pasa de ${app.maxLines} líneas`, () => {
      const lines = fs.readFileSync(app.file, "utf8").split("\n").length - 1;
      expect(
        lines,
        "si hay que añadir más, va al hook de @codarch/ui o a AppShell"
      ).toBeLessThanOrEqual(app.maxLines);
    });
  }
});
