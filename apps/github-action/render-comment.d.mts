/** Declaraciones para el .mjs de la GitHub Action (sin tipado propio). */
export function renderComment(
  report: unknown,
  options?: {
    status?: string;
    artifact?: string;
    mapPath?: string;
    baseRef?: string;
    headRef?: string;
    runUrl?: string;
    [key: string]: unknown;
  }
): string;
export function readMap(mapPath: string | undefined): {
  summary?: { area?: unknown; [key: string]: unknown };
  [key: string]: unknown;
} | null;
export function mapSection(
  shot: unknown,
  options?: { runUrl?: string; artifact?: string }
): string[];
export function format(value: number | undefined): string;
export function signed(value: number): string;
export function ruleOrigin(source: string | undefined): string;
export function escapeInline(value: string): string;
export function escapeText(value: string): string;
