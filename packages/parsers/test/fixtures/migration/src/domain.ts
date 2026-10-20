export function compute(value: number): number {
  if (value > 10) return value * 2;
  if (value > 5) return value + 1;
  return value;
}
