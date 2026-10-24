/**
 * Encadena los análisis de un repositorio.
 *
 * Un análisis tarda segundos y el vigilante puede avisar varias veces mientras
 * uno está en marcha. Aquí corre **uno a la vez** y las peticiones se agrupan
 * por raíz: si llega otra mientras corre, se encola **una repetición** en vez de
 * una por aviso, porque el resultado que está en vuelo puede ser anterior al
 * cambio que provocó la nueva petición. La repetición ya ve el disco de después.
 *
 * No sabe nada de Electron: recibe la función que analiza, así que se prueba
 * sin abrir la app.
 */

interface Waiter<T> {
  resolve: (value: T) => void;
  reject: (cause: unknown) => void;
}

export class PendingAnalyses<T> {
  /** La raíz que se está analizando ahora mismo, si hay alguna. */
  private running: string | null = null;
  /** Lo que espera turno, por raíz y en orden de llegada. */
  private readonly queued = new Map<string, Waiter<T>[]>();

  constructor(private readonly run: (root: string) => Promise<T>) {}

  /** Analiza `root`; se une a lo que ya esté esperando para esa misma raíz. */
  analyze(root: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const waiting = this.queued.get(root);
      if (waiting) {
        waiting.push({ resolve, reject });
        return;
      }
      if (this.running === null) {
        void this.start(root, [{ resolve, reject }]);
        return;
      }
      this.queued.set(root, [{ resolve, reject }]);
    });
  }

  /** Si hay algo corriendo o esperando. Lo usan los tests y el cierre. */
  get busy(): boolean {
    return this.running !== null || this.queued.size > 0;
  }

  private async start(root: string, waiters: Waiter<T>[]): Promise<void> {
    this.running = root;
    try {
      const result = await this.run(root);
      for (const waiter of waiters) waiter.resolve(result);
    } catch (cause) {
      for (const waiter of waiters) waiter.reject(cause);
    } finally {
      this.running = null;
      this.next();
    }
  }

  private next(): void {
    const following = this.queued.entries().next();
    if (following.done) return;
    const [root, waiters] = following.value;
    this.queued.delete(root);
    void this.start(root, waiters);
  }
}
