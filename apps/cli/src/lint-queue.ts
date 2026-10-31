/**
 * La cola del lint del live (ADR 0094, ADR 0098).
 *
 * El live lanza el lint después de medir un cambio. Una pasada tarda lo que
 * tarde la herramienta —segundos en un repo mediano—, y mientras corre el
 * usuario puede guardar otra vez: esa pasada no puede perderse ni sumarse a la
 * que ya está en marcha. Se apunta la última petición y se repite al acabar,
 * así el artefacto no se queda contando el árbol de hace dos guardados.
 *
 * La petición lleva su árbol —el checksum del snapshot que se midió— porque el
 * artefacto tiene que decir qué árbol es: si solo se apuntara la raíz, una
 * pasada encolada acabaría firmando el snapshot de después (ADR 0098).
 */

/** Lo que se pide lintar: una raíz y el checksum del árbol que se sirve. */
export interface LintRequest {
  root: string;
  /** El checksum del snapshot medido; `""` si no hay (no se firma). */
  tree: string;
}

export interface LintQueue {
  /** Pide una pasada; si ya hay una, encola una más para cuando acabe. */
  request(job: LintRequest): void;
  /** Se resuelve cuando no queda nada por lintar. Para los tests. */
  idle(): Promise<void>;
}

export function createLintQueue(
  run: (job: LintRequest) => Promise<void>
): LintQueue {
  let running: Promise<void> | null = null;
  let pending: LintRequest | null = null;

  const drain = async (first: LintRequest): Promise<void> => {
    let job: LintRequest | null = first;
    while (job !== null) {
      pending = null;
      try {
        await run(job);
      } catch {
        // Quien ejecuta ya dice lo que falló; la cola sigue con lo siguiente.
      }
      job = pending;
    }
    running = null;
  };

  return {
    request(job) {
      if (running) {
        pending = job;
        return;
      }
      running = drain(job);
    },
    idle: () => running ?? Promise.resolve()
  };
}
