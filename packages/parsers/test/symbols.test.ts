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
      "function:principal"
    ]);
  });

  it("no lista las constantes: son datos, no estructura", () => {
    const source = ["const LIMITE = 10;", "let contador = 0;"].join("\n");

    expect(parser.parse(source, "src/datos.ts").symbols).toEqual([]);
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
