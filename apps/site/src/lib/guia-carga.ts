import { getCollection } from "astro:content";
import entradilla from "../../../../docs/guideline/entradilla.md?raw";
import normas from "../../../../docs/guideline/normas.md?raw";
import { prepararGuia } from "./guia-servidor";

/**
 * La guía del repo, cargada en el build (ADR 0046 · ADR 0047).
 *
 * Vive aparte de `guia-servidor.ts` para que los tests puedan probar la
 * preparación sin depender de `astro:content` ni de los imports `?raw`.
 */
export async function cargarGuia() {
  return prepararGuia(await getCollection("guia"), entradilla, normas);
}
