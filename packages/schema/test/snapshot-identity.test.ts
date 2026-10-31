import { describe, expect, it } from "vitest";
import { snapshotRelation } from "../src/snapshot-identity";

describe("snapshotRelation", () => {
  it("dice que es el mismo snapshot con el mismo código y el mismo historial", () => {
    expect(
      snapshotRelation(
        { checksum: "abc", historyChecksum: "h1" },
        { checksum: "abc", historyChecksum: "h1" }
      )
    ).toBe("same");
  });

  it("distingue el calor nuevo del mismo árbol", () => {
    expect(
      snapshotRelation(
        { checksum: "abc", historyChecksum: "h1" },
        { checksum: "abc", historyChecksum: "h2" }
      )
    ).toBe("heat");
  });

  it("trata como otro árbol un checksum de código distinto", () => {
    expect(
      snapshotRelation(
        { checksum: "abc", historyChecksum: "h1" },
        { checksum: "def", historyChecksum: "h1" }
      )
    ).toBe("tree");
  });

  it("no da por igual un snapshot sin checksum de código", () => {
    expect(snapshotRelation({ historyChecksum: "h1" }, { checksum: "abc" })).toBe(
      "tree"
    );
    expect(snapshotRelation(null, { checksum: "abc" })).toBe("tree");
  });

  it("compara el historial como vacío cuando falta", () => {
    expect(snapshotRelation({ checksum: "abc" }, { checksum: "abc" })).toBe(
      "same"
    );
    expect(
      snapshotRelation({ checksum: "abc" }, { checksum: "abc", historyChecksum: "h1" })
    ).toBe("heat");
  });
});
