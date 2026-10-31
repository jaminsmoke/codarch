import { describe, expect, it } from "vitest";
import type { TreeNode } from "@codarch/render/browser";
import {
  filePick,
  indexOfPath,
  planRestore,
  tabAfterFilePick
} from "../src/app/selection";

const files = [
  { path: "src/a.ts" },
  { path: "src/b.ts" },
  { path: "lib/c.ts" }
];

const roots: TreeNode[] = [
  { kind: "folder", path: "src", name: "src", key: "d:src" },
  { kind: "folder", path: "lib", name: "lib", key: "d:lib" }
] as TreeNode[];

describe("el índice de una ruta", () => {
  it("encuentra el fichero y dice -1 cuando no está", () => {
    expect(indexOfPath(files, "lib/c.ts")).toBe(2);
    expect(indexOfPath(files, "nada.ts")).toBe(-1);
  });
});

describe("la hoja de una selección", () => {
  it("elegir un fichero devuelve la hoja del fichero si estaba en carpeta o proyecto", () => {
    expect(tabAfterFilePick("folder")).toBe("file");
    expect(tabAfterFilePick("project")).toBe("file");
  });

  it("respeta la hoja de cambios, que no habla de la selección", () => {
    expect(tabAfterFilePick("changes")).toBe("changes");
    expect(tabAfterFilePick("file")).toBe("file");
  });
});

describe("el fichero de un índice", () => {
  it("recuerda su ruta y la suelta al vaciar la selección", () => {
    expect(filePick(files, 1)).toEqual({ index: 1, path: "src/b.ts" });
    expect(filePick(files, null)).toEqual({ index: null, path: null });
  });

  it("un índice fuera del mapa no inventa ruta", () => {
    expect(filePick(files, 9)).toEqual({ index: 9, path: null });
  });
});

describe("la selección tras un modelo nuevo", () => {
  it("sin mapa, no hay fichero que elegir", () => {
    expect(
      planRestore({
        files: null,
        roots: [],
        folder: "src",
        remembered: "src/a.ts",
        defaultIndex: 0
      })
    ).toEqual({ index: null, folder: undefined, folderGone: false });
  });

  it("con la carpeta en el árbol no toca nada: el refresco no elige fichero", () => {
    const plan = planRestore({
      files,
      roots,
      folder: "src",
      remembered: "src/a.ts",
      defaultIndex: 0
    });

    // `undefined` es «no tocar»: ni índice, ni carpeta, ni hoja.
    expect(plan).toEqual({
      index: undefined,
      folder: undefined,
      folderGone: false
    });
  });

  it("recupera el fichero que había aunque no sea el de por defecto", () => {
    const plan = planRestore({
      files,
      roots,
      folder: null,
      remembered: "lib/c.ts",
      defaultIndex: 0
    });

    expect(plan).toEqual({ index: 2, folder: undefined, folderGone: false });
  });

  it("si el recordado ya no está, cae al de por defecto", () => {
    const plan = planRestore({
      files,
      roots,
      folder: null,
      remembered: "borrado.ts",
      defaultIndex: 1
    });

    expect(plan).toEqual({ index: 1, folder: undefined, folderGone: false });
  });

  it("la carpeta que se fue deja su hoja sin sujeto y suelta la selección", () => {
    const plan = planRestore({
      files,
      roots,
      folder: "fuera",
      remembered: "src/a.ts",
      defaultIndex: 0
    });

    expect(plan).toEqual({ index: 0, folder: null, folderGone: true });
  });

  it("sin recordado ni defecto, la selección queda vacía", () => {
    const plan = planRestore({
      files,
      roots,
      folder: null,
      remembered: null,
      defaultIndex: null
    });

    expect(plan).toEqual({ index: null, folder: undefined, folderGone: false });
  });
});
