import { describe, expect, it } from "vitest";
import {
  sameSnapshot,
  snapshotChecksum,
  snapshotHistoryChecksum
} from "../src/snapshot-state";

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

describe("snapshotHistoryChecksum", () => {
  it("lee el checksum del historial de un cc.json", () => {
    expect(
      snapshotHistoryChecksum({ meta: { historyChecksum: "hist1" } })
    ).toBe("hist1");
  });

  it("no lo inventa cuando falta", () => {
    expect(snapshotHistoryChecksum({ meta: {} })).toBeNull();
    expect(snapshotHistoryChecksum({ meta: { historyChecksum: "" } })).toBeNull();
    expect(snapshotHistoryChecksum(null)).toBeNull();
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

  it("reconoce el mismo código con el mismo historial", () => {
    expect(
      sameSnapshot(
        { meta: { checksum: "abc", historyChecksum: "hist1" } },
        "abc",
        "hist1"
      )
    ).toBe(true);
  });

  it("no da por guardado el mismo código con otro historial", () => {
    expect(
      sameSnapshot(
        { meta: { checksum: "abc", historyChecksum: "hist2" } },
        "abc",
        "hist1"
      )
    ).toBe(false);
  });

  it("no da por guardado un snapshot con historial si el disco no lo tiene", () => {
    expect(
      sameSnapshot(
        { meta: { checksum: "abc", historyChecksum: "hist1" } },
        "abc"
      )
    ).toBe(false);
  });
});
