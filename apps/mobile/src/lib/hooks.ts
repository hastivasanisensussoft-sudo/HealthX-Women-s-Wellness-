import { useEffect, useState } from 'react';

/** Simulated network latency so loading skeletons are visible in the demo. */
export function useDemoLoading(ms = 550): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}

/** Simulated async action (e.g. "save" or "export") — resolves after a short delay. */
export function simulate<T>(value: T, ms = 900): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
