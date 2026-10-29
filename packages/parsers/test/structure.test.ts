import { describe, expect, it } from "vitest";
import { TypeScriptParser } from "../src/index";

const parser = new TypeScriptParser();

describe("la superficie del fichero", () => {
  it("recoge los nombres de los imports, con alias y tipo", () => {
    const source = [
      'import fs from "node:fs";',
      'import * as path from "node:path";',
      'import { a, b as c, type D } from "./d";',
      'import type { E } from "./e";',
      'import fs2, { x } from "./x";',
      'import "./side-effect";'
    ].join("\n");

    const imports = parser.parse(source, "src/imports.ts").imports;

    expect(imports.map((entry) => [entry.specifier, entry.names])).toEqual([
      ["node:fs", ["default as fs"]],
      ["node:path", ["* as path"]],
      ["./d", ["a", "b as c", "type D"]],
      ["./e", ["E"]],
      ["./x", ["default as fs2", "x"]],
      ["./side-effect", undefined]
    ]);
    expect(imports[3]?.typeOnly).toBe(true);
  });

  it("recoge declaraciones, alias, default y reexportaciones", () => {
    const source = [
      "export { a, b as bb };",
      'export { c as cc } from "./c";',
      'export * from "./all";',
      'export * as ns from "./ns";',
      "export default function named() {}",
      "export const one = 1, two = 2;",
      "export interface Iface {}",
      "export type T = number;"
    ].join("\n");

    const exports = parser.parse(source, "src/exports.ts").exports ?? [];

    expect(
      exports.map((entry) => `${entry.kind}:${entry.name}${entry.source ? `<-${entry.source}` : ""}`)
    ).toEqual([
      "named:a",
      "named:bb",
      "named:cc<-./c",
      "all:*<-./all",
      "namespace:* as ns<-./ns",
      "default:default",
      "declaration:one",
      "declaration:two",
      "declaration:Iface",
      "declaration:T"
    ]);
    expect(exports[5]?.local).toBe("named");
  });
});

describe("cada forma de exportar", () => {
  it("separa las salidas con nombre, el todo, el espacio y el default", () => {
    const source = [
      "export type { A, B as C };",
      'export * from "./all";',
      'export * as ns from "./ns";',
      "export default 42;",
      "export default function named() {}"
    ].join("\n");

    const exports = parser.parse(source, "src/forms.ts").exports ?? [];

    expect(
      exports.map(
        (entry) => `${entry.kind}:${entry.name}${entry.source ? `<-${entry.source}` : ""}`
      )
    ).toEqual([
      "named:A",
      "named:C",
      "all:*<-./all",
      "namespace:* as ns<-./ns",
      "default:default",
      "default:default"
    ]);
    expect(exports[0]?.typeOnly).toBe(true);
    expect(exports[1]).toMatchObject({ typeOnly: true, local: "B" });
    // Un `export default 42` no tiene nombre local que enseñar; una función
    // con nombre sí.
    expect(exports[4]?.local).toBeUndefined();
    expect(exports[5]?.local).toBe("named");
  });
});

describe("los miembros de una clase", () => {
  it("lista campos y propiedades del constructor bajo su clase", () => {
    const source = [
      "class Store {",
      "  root: string;",
      "  private cache = new Map();",
      "  static count = 0;",
      "  readonly name = 'x';",
      "  constructor(private readonly base: string, public size = 0) {}",
      "  method() {",
      "    const local = 1;",
      "    return local;",
      "  }",
      "}"
    ].join("\n");

    const members = parser.parse(source, "src/store.ts").members ?? [];

    expect(members.map((member) => `${member.owner}.${member.name}:${member.from}`)).toEqual([
      "Store.root:field",
      "Store.cache:field",
      "Store.count:field",
      "Store.name:field",
      "Store.base:parameter",
      "Store.size:parameter"
    ]);
    expect(members.every((member) => member.line > 0)).toBe(true);
  });

  it("usa el nombre de la constante en una clase anónima", () => {
    const source = [
      "const Forma = class {",
      "  lado = 1;",
      "  constructor(public color: string) {}",
      "};"
    ].join("\n");

    const members = parser.parse(source, "src/forma.ts").members ?? [];

    expect(members.map((member) => `${member.owner}.${member.name}`)).toEqual([
      "Forma.lado",
      "Forma.color"
    ]);
  });
});
