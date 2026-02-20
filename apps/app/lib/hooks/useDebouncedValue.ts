import { useEffect, useState } from "react";

/**
 * Returns a value that updates only after the input has been stable for `delay` ms.
 * Useful for debouncing search inputs before triggering a query.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
