import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  aplicarTema,
  CLAVE_TEMA,
  escribirTema,
  leerTema,
  parseTema,
  temaEfectivo,
  type Tema
} from "../src/theme";

/** Un almacenamiento de mentira: ni navegador ni cuota. */
function almacen(inicial: Record<string, string> = {}): Storage {
  const datos = new Map(Object.entries(inicial));
  return {
    get length() {
      return datos.size;
    },
    clear: () => datos.clear(),
    getItem: (clave: string) => datos.get(clave) ?? null,
    key: (indice: number) => [...datos.keys()][indice] ?? null,
    removeItem: (clave: string) => void datos.delete(clave),
    setItem: (clave: string, valor: string) => void datos.set(clave, valor)
  } satisfies Storage;
}

/** Un documento de mentira: solo lo que toca el tema. */
function documento(): HTMLElement {
  return {
    dataset: {} as DOMStringMap,
    style: {} as CSSStyleDeclaration
  } as unknown as HTMLElement;
}

describe("el tema guardado", () => {
  it("lee las tres opciones y deja «el sistema» para lo demás", () => {
    for (const tema of ["light", "dark", "system"] as Tema[]) {
      expect(parseTema(tema)).toBe(tema);
    }
    expect(parseTema("sepia")).toBe("system");
    expect(parseTema(null)).toBe("system");
    expect(parseTema(undefined)).toBe("system");
  });

  it("sin nada guardado, sigue al sistema", () => {
    expect(leerTema(almacen())).toBe("system");
  });

  it("recuerda lo elegido en la máquina", () => {
    for (const tema of ["light", "dark", "system"] as Tema[]) {
      const store = almacen();
      escribirTema(tema, store);
      expect(store.getItem(CLAVE_TEMA)).toBe(tema);
      expect(leerTema(store)).toBe(tema);
    }
  });

  it("no se rompe si el almacenamiento está bloqueado", () => {
    const roto = {
      getItem: () => {
        throw new Error("sin almacenamiento");
      },
      setItem: () => {
        throw new Error("sin almacenamiento");
      }
    } as unknown as Storage;
    expect(leerTema(roto)).toBe("system");
    expect(() => escribirTema("dark", roto)).not.toThrow();
  });

  it("resuelve «el sistema» a claro u oscuro", () => {
    expect(temaEfectivo("system", true)).toBe("dark");
    expect(temaEfectivo("system", false)).toBe("light");
    expect(temaEfectivo("light", true)).toBe("light");
    expect(temaEfectivo("dark", false)).toBe("dark");
  });

  it("escribe data-theme y color-scheme en el documento", () => {
    const raiz = documento();
    expect(aplicarTema("system", true, raiz)).toBe("dark");
    expect(raiz.dataset.theme).toBe("dark");
    expect(raiz.style.colorScheme).toBe("dark");

    expect(aplicarTema("light", true, raiz)).toBe("light");
    expect(raiz.dataset.theme).toBe("light");
    expect(raiz.style.colorScheme).toBe("light");
  });
});

/*
 * El contraste de la paleta oscura (ADR 0084).
 *
 * Los dos bloques de `styles.css` se leen y se miden: cada tinta sobre papel,
 * panel y hoja. Un token nuevo que no llegue a 4,5:1 rompe la suite, que es la
 * manera de que el tema no se degrade regla a regla.
 */

const estilos = readFileSync(
  path.resolve(import.meta.dirname, "../src/styles.css"),
  "utf8"
);

const OSCURO = ':root[data-theme="dark"]';
const claro = estilos.slice(0, estilos.indexOf(OSCURO));
const oscuro = estilos.slice(estilos.indexOf(OSCURO));

type Color = [number, number, number, number];

function color(valor: string): Color {
  const hex = valor.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)?.[1];
  if (hex) {
    const ancho = hex.length / 3;
    const parte = (indice: number) =>
      parseInt(hex.slice(indice * ancho, (indice + 1) * ancho), 16);
    return [parte(0), parte(1), parte(2), 1];
  }
  const rgba = valor.match(
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
  throw new Error(`no es un color: ${valor}`);
}

function token(bloque: string, nombre: string): Color {
  const match = bloque.match(
    new RegExp(`${nombre}\\s*:\\s*(#[0-9a-fA-F]{3,6}|rgba?\\([^)]*\\))`)
  );
  const valor = match?.[1];
  if (!valor) throw new Error(`el bloque no define ${nombre}`);
  return color(valor);
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
        contraste(token(oscuro, nombre), token(oscuro, fondo))
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("el botón y el marco se leen sobre su fondo", () => {
    expect(
      contraste(token(oscuro, "--button-ink"), token(oscuro, "--button"))
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contraste(token(oscuro, "--frame-ink"), token(oscuro, "--frame"))
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contraste(token(oscuro, "--frame-muted"), token(oscuro, "--frame"))
    ).toBeGreaterThanOrEqual(4.5);
  });
});

describe("el contraste del tema claro", () => {
  it.each(["--ink", "--ink-soft", "--muted"] as const)(
    "%s se lee sobre papel y panel",
    (nombre) => {
      for (const fondo of ["--paper", "--panel"] as const) {
        expect(
          contraste(token(claro, nombre), token(claro, fondo))
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  );

  it("el botón y el marco se leen sobre su fondo", () => {
    expect(
      contraste(token(claro, "--button-ink"), token(claro, "--button"))
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contraste(token(claro, "--frame-muted"), token(claro, "--frame"))
    ).toBeGreaterThanOrEqual(4.5);
  });
});
