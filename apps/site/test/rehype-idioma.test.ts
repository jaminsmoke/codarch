import path from "node:path";
import { describe, expect, it } from "vitest";
import { rehypeIdioma } from "../src/lib/rehype-idioma.mjs";

const docs = path.resolve(import.meta.dirname, "../docs");

/** Un texto del árbol. */
interface Texto {
  type: "text";
  value: string;
}

/** Un elemento, con las propiedades como las deja Starlight. */
interface Elemento {
  type: "element";
  tagName: string;
  properties: Record<string, string | string[]>;
  children: Nodo[];
}

type Nodo = Elemento | Texto;

function aviso(etiqueta: string, variante = "note"): Elemento {
  return {
    type: "element",
    tagName: "aside",
    properties: {
      ariaLabel: etiqueta,
      className: ["starlight-aside", `starlight-aside--${variante}`]
    },
    children: [
      {
        type: "element",
        tagName: "p",
        properties: { className: ["starlight-aside__title"], ariaHidden: "true" },
        children: [
          { type: "element", tagName: "svg", properties: {}, children: [] },
          { type: "text", value: etiqueta }
        ]
      },
      {
        type: "element",
        tagName: "p",
        properties: {},
        children: [{ type: "text", value: "el cuerpo" }]
      }
    ]
  };
}

/** Starlight monta el ancla a mano: la clase va como `class`, no como `className`. */
function ancla(texto: string): Elemento {
  return {
    type: "element",
    tagName: "a",
    properties: { class: "sl-anchor-link", href: "#requisitos" },
    children: [
      {
        type: "element",
        tagName: "span",
        properties: { className: ["sl-anchor-icon"] },
        children: []
      },
      {
        type: "element",
        tagName: "span",
        properties: { className: ["sr-only"] },
        children: [{ type: "text", value: texto }]
      }
    ]
  };
}

function procesar(desde: string, nodos: Nodo[]): Nodo[] {
  const tree: { type: "root"; children: Nodo[] } = {
    type: "root",
    children: nodos
  };
  rehypeIdioma({ docsRoot: docs })(tree, { path: path.join(docs, desde) });
  return tree.children;
}

/** El rótulo accesible del aviso. */
function rotulo(nodo: Nodo | undefined): string | undefined {
  if (nodo?.type !== "element") return undefined;
  const etiqueta = nodo.properties.ariaLabel;
  return typeof etiqueta === "string" ? etiqueta : undefined;
}

/** El texto del título que pinta Starlight, después del icono. */
function titulo(nodo: Nodo | undefined): string | undefined {
  if (nodo?.type !== "element") return undefined;
  const parrafo = nodo.children[0];
  if (parrafo?.type !== "element") return undefined;
  const texto = parrafo.children[1];
  return texto?.type === "text" ? texto.value : undefined;
}

/** El texto que solo lee el lector de pantalla dentro del ancla. */
function oculto(nodo: Nodo | undefined): string | undefined {
  if (nodo?.type !== "element") return undefined;
  const span = nodo.children[1];
  if (span?.type !== "element") return undefined;
  const texto = span.children[0];
  return texto?.type === "text" ? texto.value : undefined;
}

describe("los rótulos de los avisos", () => {
  it("hablan inglés en las páginas inglesas", () => {
    const [nota, consejo] = procesar("en/usar/mcp.md", [
      aviso("Nota"),
      aviso("Consejo", "tip")
    ]);
    expect(rotulo(nota)).toBe("Note");
    expect(titulo(nota)).toBe("Note");
    expect(rotulo(consejo)).toBe("Tip");
  });

  it("dejan en paz el título que escribe el documento", () => {
    const [propio] = procesar("en/usar/mcp.md", [aviso("Learn more")]);
    expect(rotulo(propio)).toBe("Learn more");
    expect(titulo(propio)).toBe("Learn more");
  });

  it("siguen en español en las páginas españolas", () => {
    const [nota] = procesar("usar/mcp.md", [aviso("Nota")]);
    expect(rotulo(nota)).toBe("Nota");
    expect(titulo(nota)).toBe("Nota");
  });

  it("se pueden pasar dos veces sin cambiar nada", () => {
    const avisos = procesar("en/usar/mcp.md", [aviso("Nota")]);
    rehypeIdioma({ docsRoot: docs })(
      { type: "root", children: avisos },
      { path: path.join(docs, "en/usar/mcp.md") }
    );
    expect(rotulo(avisos[0])).toBe("Note");
    expect(titulo(avisos[0])).toBe("Note");
  });
});

describe("las anclas de sección", () => {
  it("se rotulan en el idioma de su página", () => {
    const [ingles] = procesar("en/usar/mcp.md", [
      ancla("Sección titulada «Requirements»")
    ]);
    expect(oculto(ingles)).toBe("Section titled “Requirements”");

    const [espanol] = procesar("usar/mcp.md", [
      ancla("Sección titulada «Requisitos»")
    ]);
    expect(oculto(espanol)).toBe("Sección titulada «Requisitos»");
  });
});
