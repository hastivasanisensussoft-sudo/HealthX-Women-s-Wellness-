/** Test harness: a fresh in-memory API on a random port per call, with synthetic seed data only. */
import { listen } from '../src/app';
import { loadConfig, type Config } from '../src/config';
import { hotp, totp, totpStep } from '../src/crypto';
import { seedStore } from '../src/seed';

export const PW = 'Test-only-pass-2026';

export interface Res {
  status: number;
  body: any;
  headers: Headers;
}

export async function startApi(overrides: Partial<Config> = {}, env: NodeJS.ProcessEnv = {}) {
  const config: Config = { ...loadConfig({ NODE_ENV: 'test', DEMO_PASSWORD: PW, ...env }), port: 0, ...overrides };
  const store = seedStore(config);
  const { server, url } = await listen(config, store);
  const req = async (method: string, path: string, opts: { token?: string; body?: unknown; headers?: Record<string, string>; raw?: string } = {}): Promise<Res> => {
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
    if (opts.body !== undefined || opts.raw !== undefined) headers['Content-Type'] ??= 'application/json';
    const r = await fetch(url + path, { method, headers, body: opts.raw ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)) });
    const text = await r.text();
    let body: any = undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = text;
    }
    return { status: r.status, body, headers: r.headers };
  };

  const loginUser = async (email = 'aisha@example.com', password = PW) => {
    const r = await req('POST', '/v1/auth/login', { body: { email, password }, headers: { 'X-Client': 'mobile' } });
    if (r.status !== 200) throw new Error(`login ${email} → ${r.status} ${JSON.stringify(r.body)}`);
    return r.body as { accessToken: string; refreshToken: string; user: { id: string } };
  };

  const mfaCode = (email: string) => totp(store.byEmail(email)!.mfaSecret!);
  /**
   * A code the server will accept now. Codes are single-use per account, so a repeat sign-in within the
   * same 30 s uses the next step (the server allows ±1 step) or waits until that step is in range.
   */
  const freshMfaCode = async (email: string) => {
    const acc = store.byEmail(email)!;
    const step = Math.max(totpStep(), acc.mfaLastStep + 1);
    const wait = (step - 1) * 30_000 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait + 50));
    return hotp(acc.mfaSecret!, step);
  };

  const loginStaff = async (email: string) => {
    const r1 = await req('POST', '/v1/auth/login', { body: { email, password: PW }, headers: { 'X-Client': 'mobile' } });
    if (r1.status !== 200 || !r1.body.mfaRequired) throw new Error(`staff login ${email} → ${r1.status} ${JSON.stringify(r1.body)}`);
    const r2 = await req('POST', '/v1/auth/mfa/verify', { body: { mfaToken: r1.body.mfaToken, code: await freshMfaCode(email) }, headers: { 'X-Client': 'mobile' } });
    if (r2.status !== 200) throw new Error(`mfa ${email} → ${r2.status} ${JSON.stringify(r2.body)}`);
    return r2.body as { accessToken: string; refreshToken: string; user: { id: string; capabilities: string[] } };
  };

  const act = (token: string, action: unknown, id?: string) => req('POST', '/v1/me/actions', { token, body: { action, ...(id ? { id } : {}) } });
  const adminAct = (token: string, action: unknown) => req('POST', '/v1/admin/actions', { token, body: { action } });
  const close = () => new Promise<void>((resolve) => server.close(() => resolve()));
  return { url, store, config, req, loginUser, loginStaff, mfaCode, act, adminAct, close };
}

export type Api = Awaited<ReturnType<typeof startApi>>;

/**
 * Seeded staff in the four SRS roles. Same accounts as before the seven-to-four consolidation;
 * the keys say who they are now (and what they were, where that matters to a test).
 */
export const STAFF = {
  owner: 'sam.rivera@healthx.example', // Admin holding every privileged permission (was Super Admin)
  admin: 'alex.morgan@healthx.example', // Admin
  admin2: 'ritu.sharma@healthx.example', // Admin
  former_support: 'neha.joshi@healthx.example', // Admin, no privileged permissions (was Support Agent)
  former_analyst: 'kenji.watanabe@healthx.example', // Admin, no privileged permissions (was Analyst)
  content_manager: 'priya.nair@healthx.example', // Content Manager
  content_manager2: 'daniel.okafor@healthx.example', // Content Manager
  reviewer: 'meera.iyer@healthx.example', // Medical Content Reviewer
} as const;
