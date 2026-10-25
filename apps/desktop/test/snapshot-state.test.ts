import { describe, expect, it } from "vitest";
import { sameSnapshot, snapshotChecksum } from "../src/snapshot-state";

describe("snapshotChecksum", () => {
  it("lee el checksum de un cc.json", () => {
    expect(snapshotChecksum({ meta: { checksum: "abc123" } })).toBe("abc123");
  });

  it("no inventa uno cuando falta", () => {
    expect(snapshotChecksum({ meta: {} })).toBeNull();
    expect(snapshotChecksum({})).toBeNull();
    expect(snapshotChecksum({ meta: { checksum: "" } })).toBeNull();
    expect(snapshotChecksum(null)).toBeNull();
    expect(snapshotChecksum("cc.json")).toBeNull();
  });
});

describe("sameSnapshot", () => {
  it("reconoce el snapshot que ya está en disco", () => {
    expect(sameSnapshot({ meta: { checksum: "abc" } }, "abc")).toBe(true);
  });

  it("no lo confunde con otro checksum", () => {
    expect(sameSnapshot({ meta: { checksum: "abc" } }, "otro")).toBe(false);
  });

  it("no se fía de un snapshot sin checksum", () => {
    expect(sameSnapshot({ files: [] }, "")).toBe(false);
    expect(sameSnapshot({ files: [] }, "abc")).toBe(false);
  });
});
