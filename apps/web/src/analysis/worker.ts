import { runAnalysis, type AnalyzeRequest, type AnalyzeResponse } from "./run";
import runtimeWasm from "web-tree-sitter/tree-sitter.wasm?url";
import typescriptWasm from "tree-sitter-typescript/tree-sitter-typescript.wasm?url";
import tsxWasm from "tree-sitter-typescript/tree-sitter-tsx.wasm?url";

/**
 * Worker del análisis en el navegador.
 *
 * El análisis es CPU puro y puede tardar varios segundos en un repo grande:
 * si corriera en el hilo principal, la interfaz se congelaría. Aquí corre
 * con las mismas gramáticas y el mismo código que el CLI, así que el snapshot
 * que sale tiene su checksum.
 *
 * Cancelar es terminar el worker: el proceso muere y el análisis se corta en
 * el momento, sin esperar al siguiente fichero.
 */

const scope = self as unknown as {
  postMessage(message: AnalyzeResponse): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<AnalyzeRequest>) => void
  ): void;
};

scope.addEventListener("message", (event) => {
  const request = event.data;
  if (request.type !== "analyze") return;

  void (async () => {
    scope.postMessage({ type: "progress", message: "Cargando el parser…" });
    const response = await runAnalysis(
      request,
      { typescript: typescriptWasm, tsx: tsxWasm, runtime: runtimeWasm },
      (update) => scope.postMessage(update)
    );
    scope.postMessage(response);
  })();
});
