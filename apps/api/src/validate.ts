/** Small, dependency-free validators. Each throws a 400 with a field path on failure. */
import { badRequest } from './http';

export type Obj = Record<string, unknown>;

export function obj(v: unknown, path: string, allowed?: string[]): Obj {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw badRequest(`${path} must be an object.`);
  if (allowed) {
    const extra = Object.keys(v).filter((k) => !allowed.includes(k));
    if (extra.length) throw badRequest(`${path} has fields that can’t be set: ${extra.join(', ')}.`);
  }
  return v as Obj;
}

export function str(v: unknown, path: string, min = 0, max = 500): string {
  if (typeof v !== 'string') throw badRequest(`${path} must be text.`);
  // Minimum on the trimmed text (no blank values); maximum on the stored text (padding can't bypass it).
  if (v.trim().length < min) throw badRequest(min <= 1 ? `${path} is required.` : `${path} must be at least ${min} characters.`);
  if (v.length > max) throw badRequest(`${path} must be at most ${max} characters.`);
  return v;
}

export function optStr(v: unknown, path: string, max = 500): string | undefined {
  return v === undefined ? undefined : str(v, path, 0, max);
}

export function num(v: unknown, path: string, min: number, max: number, integer = false): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw badRequest(`${path} must be a number.`);
  if (integer && !Number.isInteger(v)) throw badRequest(`${path} must be a whole number.`);
  if (v < min || v > max) throw badRequest(`${path} must be between ${min} and ${max}.`);
  return v;
}

export function optNum(v: unknown, path: string, min: number, max: number, integer = false): number | undefined {
  return v === undefined || v === null ? undefined : num(v, path, min, max, integer);
}

export function bool(v: unknown, path: string): boolean {
  if (typeof v !== 'boolean') throw badRequest(`${path} must be true or false.`);
  return v;
}

export function oneOf<T extends string>(v: unknown, path: string, values: readonly T[]): T {
  if (typeof v !== 'string' || !values.includes(v as T)) throw badRequest(`${path} must be one of: ${values.join(', ')}.`);
  return v as T;
}

export function arr(v: unknown, path: string, max: number): unknown[] {
  if (!Array.isArray(v)) throw badRequest(`${path} must be a list.`);
  if (v.length > max) throw badRequest(`${path} can have at most ${max} items.`);
  return v;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
export function isoDate(v: unknown, path: string, opts: { notAfter?: string; notBefore?: string } = {}): string {
  if (typeof v !== 'string' || !ISO_RE.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) throw badRequest(`${path} must be a date (YYYY-MM-DD).`);
  if (opts.notAfter && v > opts.notAfter) throw badRequest(`${path} can’t be in the future.`);
  if (opts.notBefore && v < opts.notBefore) throw badRequest(`${path} is too far in the past.`);
  return v;
}

export function clock(v: unknown, path: string): string {
  if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw badRequest(`${path} must be a time (HH:mm).`);
  return v;
}

export function id(v: unknown, path = 'id'): string {
  return str(v, path, 1, 100);
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function email(v: unknown, path = 'email'): string {
  const e = str(v, path, 3, 254).trim().toLowerCase();
  if (!EMAIL_RE.test(e)) throw badRequest('Enter a valid email address.');
  return e;
}

const COMMON = new Set(['password', 'password1', '12345678', '123456789', 'qwertyui', 'iloveyou', 'healthx1']);
/** Password policy: 8–128 characters, not a very common password, not one repeated character. */
export function password(v: unknown, path = 'password'): string {
  if (typeof v !== 'string') throw badRequest(`${path} is required.`);
  if (v.length < 8) throw badRequest('Password must be at least 8 characters.');
  if (v.length > 128) throw badRequest('Password must be at most 128 characters.');
  if (COMMON.has(v.toLowerCase()) || /^(.)\1+$/.test(v)) throw badRequest('Choose a less common password.');
  return v;
}
