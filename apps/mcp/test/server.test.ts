import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createServer } from "../src/server";
import { makeStore } from "./fixtures";

describe("servidor MCP", () => {
  it("registra las quince herramientas y responde por transporte en memoria", async () => {
    const server = createServer(makeStore());
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "codarch-test", version: "0.0.0" });

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    try {
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
        "check_change_impact",
        "explain_module",
        "find_hotspots",
        "get_architecture_map",
        "get_duplication_report",
        "get_history",
        "get_lint_report",
        "get_migration_plan",
        "get_project_config",
        "get_symbol_chain",
        "list_profiles",
        "list_violations",
        "map_screenshot",
        "suggest_architecture",
        "verify_history"
      ]);

      const result = await client.callTool({
        name: "find_hotspots",
        arguments: { metric: "maxComplexity", limit: 1 }
      });
      expect(result.isError).toBeFalsy();
      const first = (
        result.content as Array<{ type: string; text?: string }>
      )[0];
      expect(first?.type).toBe("text");
      const text = first?.type === "text" ? (first.text ?? "{}") : "{}";
      const payload = JSON.parse(text) as {
        hotspots: Array<{ path: string }>;
      };
      expect(payload.hotspots[0]?.path).toBe("src/domain/c.ts");
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("devuelve el mapa como imagen y su resumen al lado", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-mcp-shot-"));
    const server = createServer(makeStore(null, root));
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "codarch-test", version: "0.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    try {
      const result = await client.callTool({
        name: "map_screenshot",
        arguments: { color: "risk", width: 240, height: 200 }
      });
      expect(result.isError).toBeFalsy();

      const [image, text] = result.content as Array<{
        type: string;
        data?: string;
        mimeType?: string;
        text?: string;
      }>;
      expect(image?.type).toBe("image");
      expect(image?.mimeType).toBe("image/png");
      const png = Buffer.from(image?.data ?? "", "base64");
      expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
      expect(png.readUInt32BE(16)).toBe(240);
      expect(png.readUInt32BE(20)).toBe(200);

      const payload = JSON.parse(text?.text ?? "{}") as {
        file: string;
        slot: number;
        summary: { color: string; area: string | null; cells: unknown[] };
      };
      expect(payload.slot).toBe(1);
      expect(payload.file.startsWith(root)).toBe(true);
      expect(payload.summary.color).toBe("risk");
      expect(payload.summary.area).toBe("rloc");
      expect(payload.summary.cells.length).toBeGreaterThan(0);
      expect(fs.existsSync(payload.file)).toBe(true);
    } finally {
      await client.close();
      await server.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("devuelve isError con un mensaje claro para una ruta ausente", async () => {
    const server = createServer(makeStore());
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "codarch-test", version: "0.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    try {
      const result = await client.callTool({
        name: "explain_module",
        arguments: { path: "src/nope.ts" }
      });
      expect(result.isError).toBe(true);
      const first = (
        result.content as Array<{ type: string; text?: string }>
      )[0];
      const text = first?.type === "text" ? (first.text ?? "") : "";
      expect(text).toContain("no encuentro");
    } finally {
      await client.close();
      await server.close();
    }
  });
});
