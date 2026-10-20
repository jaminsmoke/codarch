import { compute } from "./domain";
import wasm from "./native/math.wasm";
import addon from "./native/addon.node";

export const result = compute(Number(wasm) + Number(addon));
