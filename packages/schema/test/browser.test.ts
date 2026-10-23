import { describe, expect, it } from "vitest";
import {
  fileId,
  folderId,
  md5Hex,
  parseCcJson,
  sha256Hex
} from "../src/browser";
import * as root from "../src/index";

describe("entrada del navegador", () => {
  it("expone la identidad y los hashes que necesita el parser", () => {
    expect(fileId("src/a.ts")).toBe(root.fileId("src/a.ts"));
    expect(folderId("")).toBe(root.folderId(""));
    expect(md5Hex("codarch")).toBe(root.md5Hex("codarch"));
    expect(sha256Hex("codarch")).toBe(root.sha256Hex("codarch"));
  });

  it("lee un cc.json 2.x sin tocar los almacenes de Node", () => {
    const snapshot = {
      meta: { apiVersion: "2.1", projectName: "demo", checksum: "abc" },
      files: [{ type: "Folder", name: "root", id: "164ddff4bb1345e1", children: [] }],
      lenses: {}
    };

    expect(parseCcJson(snapshot).meta.projectName).toBe("demo");
  });
});
