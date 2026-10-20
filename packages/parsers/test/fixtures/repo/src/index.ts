import { a } from "./lib/a.js";
import { b } from "@app/b";
import { dir } from "./dir";
import type { Type } from "./types";
import { util } from "@fixture/util";
import { extra } from "@fixture/util/extra";
import { root } from "@root";
export * from "./re-export";

const lazy = () => import("./lazy");
const legacy = require("./legacy");
const external = require("external-package");
const missing = require("./missing");

export const all = [a, b, dir, util, extra, root, lazy, legacy, external, missing];
export type { Type };
