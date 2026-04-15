import { useRef } from "react";

/**
 * Return a stable function reference while always calling the latest fn.
 */
export function usePersistFn<T extends (...args: any[]) => any>(fn: T): T {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const persistFnRef = useRef<T | null>(null);

  if (!persistFnRef.current) {
    persistFnRef.current = function (
      this: ThisParameterType<T>,
      ...args: Parameters<T>
    ): ReturnType<T> {
      return fnRef.current.apply(this, args);
    } as T;
  }

  return persistFnRef.current;
}