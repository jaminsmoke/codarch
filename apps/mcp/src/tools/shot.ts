// La captura del mapa en PNG, la misma que sirve el CLI para las PR.

import { readFileSync } from "node:fs";
import { clampInteger } from "./helpers";
import { RenderError } from "@codarch/render";
import { captureMap } from "@codarch/render/node";
import { ArchitectureStore, McpDataError } from "../store";
import type { MapScreenshotArgs, MapScreenshot } from "./types";

export function mapScreenshot(
  store: ArchitectureStore,
  args: MapScreenshotArgs
): MapScreenshot {
  const width = clampInteger(args.width, 0, 160, 4096) || undefined;
  const height = clampInteger(args.height, 0, 160, 4096) || undefined;
  try {
    const shot = captureMap(store.snapshot, store.root, {
      areaMetric: args.area,
      color: args.color,
      width,
      height
    });
    return { ...shot, png: readFileSync(shot.file) };
  } catch (error) {
    if (error instanceof RenderError || error instanceof RangeError) {
      throw new McpDataError(error.message);
    }
    throw error;
  }
}
