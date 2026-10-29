import { describe, expect, it } from "vitest";
import {
  integerInRange,
  readSwitch,
  readValueFlag,
  type SwitchFlag,
  type ValueFlag
} from "../src/parse";

interface Options {
  out?: string;
  ignore: string[];
  silent: boolean;
}

function options(): Options {
  return { ignore: [], silent: false };
}

const FLAGS: Array<ValueFlag<Options>> = [
  {
    names: ["--out", "-o"],
    hint: "una ruta",
    set: (target, value) => {
      target.out = value;
    }
  },
  {
    names: ["--ignore"],
    hint: "un patrón",
    set: (target, value) => {
      target.ignore.push(value);
    }
  }
];

describe("las opciones con valor", () => {
  it("lee la forma separada y gasta el argumento siguiente", () => {
    const target = options();
    expect(readValueFlag(["--out", "mapa"], 0, target, FLAGS)).toEqual({
      next: 1
    });
    expect(target.out).toBe("mapa");
  });

  it("lee la forma con igual sin gastar nada más", () => {
    const target = options();
    expect(readValueFlag(["--out=mapa"], 0, target, FLAGS)).toEqual({ next: 0 });
    expect(target.out).toBe("mapa");
  });

  it("admite el valor vacío solo en la forma con igual", () => {
    const target = options();
    expect(readValueFlag(["--out="], 0, target, FLAGS)).toEqual({ next: 0 });
    expect(target.out).toBe("");
    expect(readValueFlag(["--out"], 0, options(), FLAGS)).toEqual({
      error: "--out necesita una ruta"
    });
  });

  it("acepta el nombre corto separado, no con igual", () => {
    const target = options();
    expect(readValueFlag(["-o", "mapa"], 0, target, FLAGS)).toEqual({ next: 1 });
    expect(readValueFlag(["-o=mapa"], 0, options(), FLAGS)).toBeNull();
  });

  it("dice que no es suya cuando el argumento es otro", () => {
    expect(readValueFlag(["--json"], 0, options(), FLAGS)).toBeNull();
  });

  it("se puede repetir: cada vez aplica una vez", () => {
    const target = options();
    readValueFlag(["--ignore=src"], 0, target, FLAGS);
    readValueFlag(["--ignore", "docs"], 0, target, FLAGS);
    expect(target.ignore).toEqual(["src", "docs"]);
  });

  it("corta con el mensaje del validador", () => {
    const validada: Array<ValueFlag<Options>> = [
      {
        names: ["--out"],
        hint: "una ruta",
        set: () => "esa ruta no vale"
      }
    ];
    expect(readValueFlag(["--out=x"], 0, options(), validada)).toEqual({
      error: "esa ruta no vale"
    });
  });
});

describe("los interruptores", () => {
  const SWITCHES: Array<SwitchFlag<Options>> = [
    {
      names: ["--silent", "-s"],
      set: (target) => {
        target.silent = true;
      }
    }
  ];

  it("aplica el que casa y dice que lo era", () => {
    const target = options();
    expect(readSwitch("-s", target, SWITCHES)).toBe(true);
    expect(target.silent).toBe(true);
  });

  it("no toca nada con otro argumento", () => {
    const target = options();
    expect(readSwitch("--json", target, SWITCHES)).toBe(false);
    expect(target.silent).toBe(false);
  });
});

describe("los enteros con rango", () => {
  it("acepta lo que está dentro", () => {
    expect(integerInRange("3", 1)).toBe(3);
    expect(integerInRange("65535", 1, 65535)).toBe(65535);
  });

  it("rechaza el vacío, el texto y lo que se sale", () => {
    expect(integerInRange("", 1)).toBeNull();
    expect(integerInRange(undefined, 1)).toBeNull();
    expect(integerInRange("abc", 1)).toBeNull();
    expect(integerInRange("1.5", 1)).toBeNull();
    expect(integerInRange("0", 1)).toBeNull();
    expect(integerInRange("65536", 1, 65535)).toBeNull();
  });
});
