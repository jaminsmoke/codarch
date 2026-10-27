import path from "node:path";
import { analyzeRepository, type AnalyzeOptions, type AnalyzeResult } from "./analyze";
import { ParseCache } from "./cache";
import { ChurnCache } from "./git";
import {
  findScopePaths,
  loadOwnParseCache,
  loadScopeParseCaches,
  serializeParseCache,
  type ParseCachePayload
} from "./parse-cache-store";
import { ChangeGate } from "./pulse";

/**
 * La sesión de análisis de una raíz (ADR 0056).
 *
 * Es lo que hace que el live sea barato: guarda el parseo de la vez anterior,
 * el churn por `HEAD` y la firma del último pulso, y solo analiza cuando el
 * pulso trae algo nuevo. Vive en el proceso que analiza —el `utilityProcess`
 * del escritorio, el CLI, `serve`—, y al primer análisis de una raíz busca
 * además en disco el parseo que un alcance ya dejó (ADR 0089).
 */

/** Lo que la sesión pone por su cuenta: la caché no se elige desde fuera. */
export type SessionOptions = Omit<AnalyzeOptions, "cache" | "churnCache">;

export class AnalysisSession {
  private readonly parse = new ParseCache();
  private readonly churn = new ChurnCache();
  private readonly gate = new ChangeGate();
  private analyzed = false;
  private lastChecksum: string | null = null;
  /** Las cachés de disco ya se buscaron en esta sesión. */
  private loadedFromDisk = false;

  constructor(
    readonly root: string,
    private readonly base: SessionOptions = {}
  ) {}

  /**
   * Analiza si el pulso trae algo distinto de la última vez.
   *
   * `null` significa «nada que rehacer»: ni un `readFile` ni un proceso de git
   * de más. La primera llamada siempre analiza, porque no hay con qué comparar.
   */
  refresh(
    hints: readonly string[] = [],
    options: SessionOptions = {}
  ): AnalyzeResult | null {
    const pulse = this.gate.check(this.root, hints);
    if (this.analyzed && !pulse.fresh) return null;
    return this.run(options);
  }

  /** Analiza siempre: al abrir el repo, al cambiar de raíz o a petición. */
  analyze(hints: readonly string[] = [], options: SessionOptions = {}): AnalyzeResult {
    // La firma se apunta **antes** de leer: si algo cambia mientras se analiza,
    // el pulso siguiente la ve distinta y no se salta ese cambio.
    this.gate.remember(this.root, hints);
    return this.run(options);
  }

  /** El checksum de lo último analizado, si hubo algo. */
  get checksum(): string | null {
    return this.lastChecksum;
  }

  /**
   * La caché de parseo de esta pasada, lista para guardar (ADR 0089).
   *
   * La sesión no la escribe: quien persiste el estado del repo decide dónde va.
   * El CLI la guarda en su `.codarch/` y el escritorio se la manda al proceso
   * principal, que es el único que escribe (ADR 0050).
   */
  parseCachePayload(): ParseCachePayload {
    return serializeParseCache(this.root, this.parse);
  }

  private run(options: SessionOptions): AnalyzeResult {
    const settings = { ...this.base, ...options };
    if (!this.loadedFromDisk) {
      this.loadedFromDisk = true;
      this.loadDiskCaches(settings.ignore ?? []);
    }

    const result = analyzeRepository(this.root, {
      ...settings,
      cache: this.parse,
      churnCache: this.churn
    });
    this.lastChecksum = result.snapshot.meta.checksum ?? null;
    this.analyzed = true;
    return result;
  }

  /**
   * El parseo que ya está en disco: el de este alcance y el de sus alcances de
   * debajo (ADR 0089).
   *
   * Es lo que hace que reabrir un proyecto no vuelva a parsear lo que ya está
   * parseado, aunque la caché de la memoria del ADR 0056 se quedara con el
   * proceso anterior. Se lee hacia abajo y **nunca hacia arriba**: un alcance
   * parcial no hereda el estado de un alcance mayor.
   *
   * Un fallo aquí no se propaga: sin caché se analiza entero, que es el
   * resultado correcto; solo cuesta tiempo. Se busca una vez por sesión: la
   * raíz no cambia y un alcance nuevo se ve en la sesión siguiente.
   */
  private loadDiskCaches(ignore: readonly string[]): void {
    try {
      // El estado vive en el `.codarch/` de la raíz (ADR 0050), que es donde lo
      // deja el análisis que escribió el snapshot que vamos a refrescar.
      loadOwnParseCache(this.parse, this.root, path.join(this.root, ".codarch"));
    } catch {
      // Sin la caché propia se parsea otra vez: cuesta tiempo, no resultado.
    }
    try {
      loadScopeParseCaches(
        this.parse,
        this.root,
        findScopePaths(this.root, ignore)
      );
    } catch {
      // Un alcance ilegible no tumba el análisis del padre: se parsea su parte.
    }
  }
}
