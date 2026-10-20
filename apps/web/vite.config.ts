import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin, type ProxyOptions } from "vite";
import { startDevServer } from "./vite-server.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const resolve = (relative: string): string => path.join(root, relative);

export default defineConfig(async ({ command }) => {
  const devServer = command === "serve" ? await startDevServer() : null;
  const target = devServer ? `http://127.0.0.1:${devServer.port}` : null;
  const proxy: Record<string, ProxyOptions> | undefined = target
    ? {
        "/api": { target, changeOrigin: false },
        "/data": { target, changeOrigin: false },
        "/events": {
          target,
          changeOrigin: false,
          timeout: 0,
          proxyTimeout: 0
        }
      }
    : undefined;

  const devServerPlugin: Plugin = {
    name: "codarch-dev-server",
    configureServer(server) {
      server.httpServer?.on("close", () => devServer?.stop());
    },
    configurePreviewServer(server) {
      server.httpServer?.on("close", () => devServer?.stop());
    }
  };

  return {
    plugins: [react(), devServerPlugin],
    resolve: {
      alias: [
        {
          find: /^@codarch\/render\/browser$/,
          replacement: resolve("packages/render/src/browser.ts")
        },
        {
          find: /^@codarch\/render$/,
          replacement: resolve("packages/render/src/index.ts")
        },
        {
          find: /^@codarch\/metrics\/browser$/,
          replacement: resolve("packages/metrics/src/browser.ts")
        },
        {
          find: /^@codarch\/metrics$/,
          replacement: resolve("packages/metrics/src/index.ts")
        },
        {
          find: /^@codarch\/schema\/browser$/,
          replacement: resolve("packages/schema/src/browser.ts")
        },
        {
          find: /^@codarch\/schema$/,
          replacement: resolve("packages/schema/src/index.ts")
        },
        {
          find: /^@codarch\/layouts$/,
          replacement: resolve("packages/layouts/src/index.ts")
        }
      ]
    },
    server: {
      fs: { allow: [root] },
      ...(proxy ? { proxy } : {})
    },
    ...(proxy ? { preview: { proxy } } : {}),
    build: {
      target: "es2022"
    }
  };
});
