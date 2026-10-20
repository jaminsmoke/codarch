import { describe, expect, it } from "vitest";
import {
  canonicalPath,
  fileId,
  folderId,
  idFromCanonicalPath,
  nodeId,
  normalizeName,
  pathSegments
} from "../src/index";

describe("identidad de nodos", () => {
  it("reproduce los ids de cc.json 2.x", () => {
    expect(folderId("")).toBe("164ddff4bb1345e1");
    expect(fileId(".codecharta.yml")).toBe("b3691a6b1a077c33");
    expect(fileId("src/a.ts")).toBe("2041e04dbc53eb30");
  });

  it("distingue File de Folder y normaliza la ruta canónica", () => {
    expect(nodeId("File", ["src", "a.ts"])).toBe("2041e04dbc53eb30");
    expect(nodeId("Folder", ["src", "a.ts"])).not.toBe(nodeId("File", ["src", "a.ts"]));
    expect(idFromCanonicalPath("src/a.ts", "File")).toBe("2041e04dbc53eb30");
  });

  it("normaliza separadores, `.` y `..`", () => {
    expect(pathSegments("src\\lib\\..\\a.ts")).toEqual(["src", "a.ts"]);
    expect(pathSegments("/src/./a.ts")).toEqual(["src", "a.ts"]);
    expect(canonicalPath(["src", "a.ts"])).toBe("/src/a.ts");
    expect(canonicalPath([])).toBe("/");
  });

  it("normaliza NFC para que NFD y NFC tengan el mismo id", () => {
    const nfd = "cafe\u0301.ts";
    const nfc = "caf\u00e9.ts";
    expect(normalizeName(nfd)).toBe(nfc);
    expect(fileId(nfd)).toBe(fileId(nfc));
  });
});
