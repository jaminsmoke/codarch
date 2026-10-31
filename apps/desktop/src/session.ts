import path from "node:path";
import { createAnalyzer, type RepoAnalyzer } from "./analyzer";

/**
 * La sesión del proceso principal: de qué repo se habla y quién analiza.
 *
 * El análisis vive en un `utilityProcess` (`analyze-worker.ts`) porque
 * analizar bloquearía el proceso principal —menú, IPC y hasta el despacho de
 * los clics— durante segundos. Aquí solo está arrancarlo una vez y recordar la
 * última raíz: a quién preguntan el historial, las cadenas y el código.
 */

let current: string | null = null;
let worker: RepoAnalyzer | null = null;

/** La última raíz analizada, o `null` si lo abierto no es un repo. */
export function currentRoot(): string | null {
  return current;
}

export function setCurrentRoot(root: string | null): void {
  current = root;
}

/** El proceso que analiza, arrancado la primera vez que hace falta. */
export function analyzer(): RepoAnalyzer {
  worker ??= createAnalyzer(path.join(__dirname, "analyze-worker.cjs"));
  return worker;
}

/** Cierra el proceso de análisis, si llegó a arrancarse. */
export function closeAnalyzer(): void {
  worker?.close();
  worker = null;
}
