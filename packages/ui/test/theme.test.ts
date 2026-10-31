import { describe, expect, it } from "vitest";
import { readUiStyles } from "./readStyles";
import {
  applyTheme,
  THEME_KEY,
  writeTheme,
  readTheme,
  parseTheme,
  effectiveTheme,
  type Theme
} from "../src/theme";

/** Un almacenamiento de mentira: ni navegador ni cuota. */
function memoryStore(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (indice: number) => [...data.keys()][indice] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, value)
  } satisfies Storage;
}

/** Un documento de mentira: solo lo que toca el tema. */
function fakeDocument(): HTMLElement {
  return {
    dataset: {} as DOMStringMap,
    style: {} as CSSStyleDeclaration
  } as unknown as HTMLElement;
}

describe("el tema guardado", () => {
  it("lee las tres opciones y deja «el sistema» para lo demás", () => {
    for (const theme of ["light", "dark", "system"] as Theme[]) {
      expect(parseTheme(theme)).toBe(theme);
    }
    expect(parseTheme("sepia")).toBe("system");
    expect(parseTheme(null)).toBe("system");
    expect(parseTheme(undefined)).toBe("system");
  });

  it("sin nada guardado, sigue al sistema", () => {
    expect(readTheme(memoryStore())).toBe("system");
  });

  it("recuerda lo elegido en la máquina", () => {
    for (const theme of ["light", "dark", "system"] as Theme[]) {
      const store = memoryStore();
      writeTheme(theme, store);
      expect(store.getItem(THEME_KEY)).toBe(theme);
      expect(readTheme(store)).toBe(theme);
    }
  });

  it("no se rompe si el almacenamiento está bloqueado", () => {
    const broken = {
      getItem: () => {
        throw new Error("sin almacenamiento");
      },
      setItem: () => {
        throw new Error("sin almacenamiento");
      }
    } as unknown as Storage;
    expect(readTheme(broken)).toBe("system");
    expect(() => writeTheme("dark", broken)).not.toThrow();
  });

  it("resuelve «el sistema» a claro u oscuro", () => {
    expect(effectiveTheme("system", true)).toBe("dark");
    expect(effectiveTheme("system", false)).toBe("light");
    expect(effectiveTheme("light", true)).toBe("light");
    expect(effectiveTheme("dark", false)).toBe("dark");
  });

  it("escribe data-theme y color-scheme en el documento", () => {
    const root = fakeDocument();
    expect(applyTheme("system", true, root)).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
    expect(root.style.colorScheme).toBe("dark");

    expect(applyTheme("light", true, root)).toBe("light");
    expect(root.dataset.theme).toBe("light");
    expect(root.style.colorScheme).toBe("light");
  });
});

/*
 * El contraste de la paleta oscura (ADR 0084).
 *
 * Los dos bloques de la hoja de la UI (`styles.css` y sus piezas) se leen y se miden: cada tinta sobre papel,
 * panel y hoja. Un token nuevo que no llegue a 4,5:1 rompe la suite, que es la
 * manera de que el tema no se degrade regla a regla.
 */

const estilos = readUiStyles();

const DARK_BLOCK = ':root[data-theme="dark"]';
const lightCss = estilos.slice(0, estilos.indexOf(DARK_BLOCK));
const darkCss = estilos.slice(estilos.indexOf(DARK_BLOCK));

type Color = [number, number, number, number];

function color(value: string): Color {
  const hex = value.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)?.[1];
  if (hex) {
    const ancho = hex.length / 3;
    const parte = (indice: number) =>
      parseInt(hex.slice(indice * ancho, (indice + 1) * ancho), 16);
    return [parte(0), parte(1), parte(2), 1];
  }
  const rgba = value.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/
  );
  if (rgba) {
    return [
      Number(rgba[1]),
      Number(rgba[2]),
      Number(rgba[3]),
      rgba[4] === undefined ? 1 : Number(rgba[4])
    ];
  }
  throw new Error(`no es un color: ${value}`);
}

function token(bloque: string, nombre: string): Color {
  const match = bloque.match(
    new RegExp(`${nombre}\\s*:\\s*(#[0-9a-fA-F]{3,6}|rgba?\\([^)]*\\))`)
  );
  const raw = match?.[1];
  if (!raw) throw new Error(`el bloque no define ${nombre}`);
  return color(raw);
}

/** Pone `encima` sobre `debajo`, como haría el navegador. */
function superponer(encima: Color, debajo: Color): Color {
  const alfa = encima[3] + debajo[3] * (1 - encima[3]);
  const mezcla = (a: number, b: number) =>
    (a * encima[3] + b * debajo[3] * (1 - encima[3])) / alfa;
  return [mezcla(encima[0], debajo[0]), mezcla(encima[1], debajo[1]), mezcla(encima[2], debajo[2]), alfa];
}

function canal(componente: number): number {
  const c = componente / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminancia([r, g, b]: Color): number {
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(encima: Color, debajo: Color): number {
  const fondo = superponer(debajo, [0, 0, 0, 1]);
  const tinta = superponer(encima, fondo);
  const [alto, bajo] = [luminancia(tinta), luminancia(fondo)].sort(
    (a, b) => b - a
  ) as [number, number];
  return (alto + 0.05) / (bajo + 0.05);
}

const TINTAS = [
  "--ink",
  "--ink-soft",
  "--muted",
  "--cobalt",
  "--ochre",
  "--rust",
  "--violet",
  "--patina",
  "--debt",
  "--diff-add",
  "--diff-del",
  "--state-teal",
  "--state-rust",
  "--state-blue",
  "--state-violet",
  "--state-slate",
  "--folder-ink"
];

describe("el contraste del tema oscuro", () => {
  const fondos = ["--paper", "--panel", "--sheet"] as const;

  it.each(TINTAS)("%s se lee sobre las tres hojas", (nombre) => {
    for (const fondo of fondos) {
      expect(
        contraste(token(darkCss, nombre), token(darkCss, fondo))
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("el botón y el marco se leen sobre su fondo", () => {
    expect(
      contraste(token(darkCss, "--button-ink"), token(darkCss, "--button"))
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contraste(token(darkCss, "--frame-ink"), token(darkCss, "--frame"))
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contraste(token(darkCss, "--frame-muted"), token(darkCss, "--frame"))
    ).toBeGreaterThanOrEqual(4.5);
  });
});

describe("el contraste del tema claro", () => {
  it.each(["--ink", "--ink-soft", "--muted"] as const)(
    "%s se lee sobre papel y panel",
    (nombre) => {
      for (const fondo of ["--paper", "--panel"] as const) {
        expect(
          contraste(token(lightCss, nombre), token(lightCss, fondo))
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  );

  it("el botón y el marco se leen sobre su fondo", () => {
    expect(
      contraste(token(lightCss, "--button-ink"), token(lightCss, "--button"))
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contraste(token(lightCss, "--frame-muted"), token(lightCss, "--frame"))
    ).toBeGreaterThanOrEqual(4.5);
  });
});
