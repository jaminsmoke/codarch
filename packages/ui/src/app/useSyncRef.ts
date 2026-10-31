import { useEffect, type MutableRefObject } from "react";

/** Mantiene un ref alineado con un valor: evita recrear callbacks al cambiar. */
export function useSyncRef<T>(ref: MutableRefObject<T>, value: T): void {
  useEffect(() => {
    ref.current = value;
  }, [ref, value]);
}