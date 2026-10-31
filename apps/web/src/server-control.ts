import { readServerMeta, type ServerMeta } from "./session";

/**
 * Los dos mandos del servidor local: analizar otra carpeta y encender o apagar
 * el live.
 *
 * Son `POST /api/root` y `POST /api/watch` (ADR 0044). La app solo tenía el
 * `fetch` a pelo dentro del componente, con el JSON y el error repetidos en
 * cada uno; aquí está una vez, y el servidor puede contestar con su propio
 * motivo de fallo.
 */

/** Una carpeta nueva, o `null` si el servidor no dijo cuál es ahora. */
export async function selectRoot(path: string): Promise<ServerMeta | null> {
  return post("/api/root", { path }, "no se pudo analizar la carpeta");
}

/** Enciende o apaga la vigilancia sin reiniciar el servidor. */
export async function setWatch(enabled: boolean): Promise<ServerMeta | null> {
  return post("/api/watch", { enabled }, "no se pudo cambiar el modo live");
}

async function post(
  url: string,
  payload: unknown,
  fallback: string
): Promise<ServerMeta | null> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (cause) {
    // Sin servidor delante, el mensaje del `fetch` no le dice nada a nadie.
    throw new Error(`${fallback} (${(cause as Error).message})`);
  }

  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  if (!response.ok) {
    const reason = typeof body?.error === "string" ? body.error : fallback;
    throw new Error(reason);
  }
  return readServerMeta(body);
}
