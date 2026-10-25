import { describe, expect, it } from "vitest";
import { TypeScriptParser } from "../src/index";

const parser = new TypeScriptParser();

describe("TypeScriptParser · símbolos", () => {
  it("lista funciones, clases, interfaces, tipos y enums", () => {
    const source = [
      "export interface Detalle {",
      "  nombre: string;",
      "}",
      "",
      "export type Resultado = { ok: boolean };",
      "",
      "export enum Color {",
      "  Rojo,",
      "  Azul",
      "}",
      "",
      "export class Factura {",
      "  total = 0;",
      "",
      "  cobrar(cantidad: number) {",
      "    if (cantidad > 0) {",
      "      this.total += cantidad;",
      "    }",
      "  }",
      "}",
      "",
      "export function pagar(cantidad: number): void {",
      "  return;",
      "}"
    ].join("\n");

    const symbols = parser.parse(source, "src/factura.ts").symbols ?? [];

    expect(
      symbols.map((symbol) => `${symbol.kind}:${symbol.name}`)
    ).toEqual([
      "interface:Detalle",
      "type:Resultado",
      "enum:Color",
      "class:Factura",
      "function:cobrar",
      "function:pagar"
    ]);
  });

  it("mide la complejidad de cada función", () => {
    const source = [
      "function simple() {",
      "  return 1;",
      "}",
      "",
      "function enrevesada(valor: number) {",
      "  if (valor > 0) {",
      "    return 1;",
      "  }",
      "  for (let i = 0; i < 2; i++) {",
      "    console.log(i);",
      "  }",
      "  return 0;",
      "}"
    ].join("\n");

    const symbols = parser.parse(source, "src/complejo.ts").symbols ?? [];

    expect(symbols.map((symbol) => symbol.complexity)).toEqual([1, 3]);
  });

  it("mide el cuerpo de expresión de una arrow como una función", () => {
    const source = [
      "const pick = (x: number) => x ? 1 : 0;",
      "const both = (a: boolean, b: boolean) => a && b;",
      "const block = (x: number) => { return x ? 1 : 0; };"
    ].join("\n");

    const symbols = parser.parse(source, "src/expresion.ts").symbols ?? [];

    expect(symbols.map((symbol) => symbol.complexity)).toEqual([2, 2, 2]);
  });

  it("da un hash propio a cada cuerpo, también a los métodos", () => {
    const source = [
      "class Factura {",
      "  cobrar() {",
      "    return 1;",
      "  }",
      "",
      "  anular() {",
      "    return 2;",
      "  }",
      "}"
    ].join("\n");

    const symbols = parser.parse(source, "src/metodos.ts").symbols ?? [];
    const hashes = symbols.map((symbol) => symbol.hash ?? "");

    // El hash vacío haría que todos los métodos fueran el mismo símbolo.
    expect(hashes.every((hash) => hash.length === 64)).toBe(true);
    expect(new Set(hashes).size).toBe(hashes.length);
    expect(hashes).not.toContain(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  it("el hash de una variable sigue su valor, no su nombre", () => {
    const primero = parser.parse("const LIMITE = 10;", "src/a.ts").symbols ?? [];
    const segundo = parser.parse("const LIMITE = 20;", "src/a.ts").symbols ?? [];
    const renombrada = parser.parse("const TOPE = 10;", "src/a.ts").symbols ?? [];

    expect(primero[0]?.hash).not.toBe(segundo[0]?.hash);
    expect(primero[0]?.hash).toBe(renombrada[0]?.hash);
  });

  it("un callback anónimo suma en el fichero pero no es un símbolo", () => {
    const source =
      "function outer() { [1].map((x) => x > 0 ? x : 0); }";

    const result = parser.parse(source, "src/callback.ts");

    expect(result.metrics.functions).toBe(2);
    expect(result.metrics.maxComplexity).toBe(2);
    expect(result.symbols?.map((symbol) => symbol.name)).toEqual(["outer"]);
  });

  it("una arrow que devuelve otra no hereda sus decisiones", () => {
    const source =
      "const outer = () => { const inner = (a: boolean, b: boolean) => a && b; return 1; };";

    const symbols = parser.parse(source, "src/anidada.ts").symbols ?? [];

    expect(symbols.map((symbol) => `${symbol.name}:${symbol.complexity}`)).toEqual([
      "outer:1",
      "inner:2"
    ]);
  });

  it("trata una constante que guarda una función como función", () => {
    const source = [
      "const doblar = (x: number) => x * 2;",
      "const CONSTANTE = 3;",
      "",
      "export default function principal() {",
      "  return doblar(1);",
      "}"
    ].join("\n");

    const symbols = parser.parse(source, "src/arrow.ts").symbols ?? [];

    expect(symbols.map((symbol) => `${symbol.kind}:${symbol.name}`)).toEqual([
      "function:doblar",
      "variable:CONSTANTE",
      "function:principal"
    ]);
  });

  it("lista las variables del módulo, también textos y objetos", () => {
    const source = [
      "export const LIMITE = 10;",
      'export const SALUDO = "hola";',
      "const CONFIG = { reintentos: 3 };",
      "let contador = 0;",
      "let pendiente;",
      "const { a } = CONFIG;",
      "const [b] = [1];"
    ].join("\n");

    const symbols = parser.parse(source, "src/datos.ts").symbols ?? [];

    expect(symbols.map((symbol) => `${symbol.kind}:${symbol.name}`)).toEqual([
      "variable:LIMITE",
      "variable:SALUDO",
      "variable:CONFIG",
      "variable:contador"
    ]);
  });

  it("no lista las variables locales, pero sí las funciones locales", () => {
    const source = [
      "function outer() {",
      "  const local = 1;",
      "  const inner = () => local;",
      "  let pendiente = 0;",
      "  return inner();",
      "}"
    ].join("\n");

    const symbols = parser.parse(source, "src/local.ts").symbols ?? [];

    expect(symbols.map((symbol) => `${symbol.kind}:${symbol.name}`)).toEqual([
      "function:outer",
      "function:inner"
    ]);
  });

  it("da la línea 1-based de cada símbolo", () => {
    const source = ["// comentario", "", "function alFinal() {", "  return 1;", "}"].join(
      "\n"
    );

    const symbols = parser.parse(source, "src/lineas.ts").symbols ?? [];

    expect(symbols[0]?.line).toBe(3);
    expect(symbols[0]?.lines).toBe(3);
  });

  it("el hash del cuerpo no depende del formato", () => {
    const original = ["function suma(a: number, b: number) {", "  return a + b;", "}"].join(
      "\n"
    );
    const reformateado = [
      "function suma(a: number, b: number) {",
      "",
      "    return a + b;",
      "",
      "}"
    ].join("\n");

    const uno = parser.parse(original, "src/a.ts").symbols?.[0];
    const otro = parser.parse(reformateado, "src/a.ts").symbols?.[0];

    expect(uno?.hash).toBeDefined();
    expect(otro?.hash).toBe(uno?.hash);
  });

  it("el hash del cuerpo ignora los comentarios", () => {
    const conComentario = [
      "/** Suma dos números. */",
      "function suma(a: number, b: number) {",
      "  return a + b;",
      "}"
    ].join("\n");
    const sinComentario = [
      "function suma(a: number, b: number) {",
      "  return a + b;",
      "}"
    ].join("\n");

    const uno = parser.parse(conComentario, "src/a.ts").symbols?.[0];
    const otro = parser.parse(sinComentario, "src/a.ts").symbols?.[0];

    expect(uno?.hash).toBe(otro?.hash);
  });

  it("el hash del cuerpo cambia cuando cambia el código", () => {
    const uno = parser.parse("function suma(a: number) { return a; }", "src/a.ts")
      .symbols?.[0];
    const otro = parser.parse("function suma(a: number) { return a + 1; }", "src/a.ts")
      .symbols?.[0];

    expect(uno?.hash).not.toBe(otro?.hash);
  });

  it("el hash sobrevive a un cambio de nombre y de sitio", () => {
    const antes = parser.parse("function suma(a: number) { return a; }", "src/a.ts")
      .symbols?.[0];
    const despues = parser
      .parse("function sumar(a: number) { return a; }", "src/b.ts")
      .symbols?.[0];

    // Mismo cuerpo, distinta identidad: el hash es el del cuerpo ✓.
    expect(despues?.hash).toBe(antes?.hash);
    expect(despues?.name).not.toBe(antes?.name);
  });
});
