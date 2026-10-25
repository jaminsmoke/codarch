import { analyzeRepository, type AnalyzeOptions, type AnalyzeResult } from "./analyze";
import { ParseCache } from "./cache";
import { ChurnCache } from "./git";
import { ChangeGate } from "./pulse";

/**
 * La sesión de análisis de una raíz (ADR 0056).
 *
 * Es lo que hace que el live sea barato: guarda el parseo de la vez anterior,
 * el churn por `HEAD` y la firma del último pulso, y solo analiza cuando el
 * pulso trae algo nuevo. Vive en el proceso que analiza —el `utilityProcess`
 * del escritorio, el CLI, `serve`—, no en el disco.
 */

/** Lo que la sesión pone por su cuenta: la caché no se elige desde fuera. */
export type SessionOptions = Omit<AnalyzeOptions, "cache" | "churnCache">;

export class AnalysisSession {
  private readonly parse = new ParseCache();
  private readonly churn = new ChurnCache();
  private readonly gate = new ChangeGate();
  private analyzed = false;
  private lastChecksum: string | null = null;

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

  private run(options: SessionOptions): AnalyzeResult {
    const result = analyzeRepository(this.root, {
      ...this.base,
      ...options,
      cache: this.parse,
      churnCache: this.churn
    });
    this.lastChecksum = result.snapshot.meta.checksum ?? null;
    this.analyzed = true;
    return result;
  }
}
