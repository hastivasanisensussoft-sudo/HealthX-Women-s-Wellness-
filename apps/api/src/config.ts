/** Runtime configuration. No secrets are required: session tokens are random and stored hashed in memory. */
export interface Config {
  host: string;
  port: number;
  production: boolean;
  /** Browser origins allowed to call the API with credentials (CORS allowlist). */
  allowedOrigins: string[];
  accessTtlMs: number;
  refreshTtlMs: number;
  mfaTokenTtlMs: number;
  resetTtlMs: number;
  magicTtlMs: number;
  /** Seeds synthetic demo accounts. Refused in production. */
  seedDemo: boolean;
  /** Password for seeded demo accounts (synthetic, local development only). */
  demoPassword: string;
  /** Dev helpers: email outbox + current MFA code for seeded staff. Never in production; only on a loopback host. */
  devTools: boolean;
  /** Direct peers whose X-Forwarded-For is trusted (e.g. the Vite dev proxy). Empty in production unless TRUST_PROXY is set. */
  trustProxy: string[];
  /** Refresh lifetime for accounts whose email isn't verified yet (limits pre-hijacking). */
  unverifiedRefreshTtlMs: number;
  /** Staff sessions end this long after MFA, however active they are (re-MFA required). */
  staffAbsoluteMs: number;
  /** Per-account app data cap (413 above it). Admin lists have per-list caps in adminPolicy.ts. */
  limits: { maxUserStateBytes: number };
  rate: {
    windowMs: number;
    loginAttempts: number;
    mfaAttempts: number;
    globalPerWindow: number;
    loginPerAccount: number;
    loginFailuresPerIp: number;
    mfaFailuresPerAccount: number;
    userWritesPerWindow: number;
    adminWritesPerWindow: number;
    exportPerHour: number;
    contactPerHour: number;
    registerPerHour: number;
  };
}

const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);
const LOOPBACK = ['127.0.0.1', '::1', 'localhost'];
export const isLoopbackHost = (h: string) => LOOPBACK.includes(h.toLowerCase());

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === 'production';
  const seedDemo = env.SEED_DEMO ? env.SEED_DEMO === 'true' : !production;
  if (production && seedDemo) throw new Error('SEED_DEMO must not be enabled in production.');
  const host = env.HOST ?? '127.0.0.1';
  if (env.DEV_TOOLS === 'true' && (production || !isLoopbackHost(host))) throw new Error('DEV_TOOLS can only be enabled for a loopback HOST outside production.');
  return {
    host,
    port: num(env.PORT, 4000),
    production,
    allowedOrigins: (env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081,http://127.0.0.1:8081,http://127.0.0.1:8094,http://localhost:8094')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    accessTtlMs: num(env.ACCESS_TTL_MS, 15 * 60_000),
    refreshTtlMs: num(env.REFRESH_TTL_MS, 30 * 24 * 3600_000),
    mfaTokenTtlMs: 5 * 60_000,
    resetTtlMs: 30 * 60_000,
    magicTtlMs: 15 * 60_000,
    seedDemo,
    demoPassword: env.DEMO_PASSWORD ?? 'HealthX-demo-2026',
    devTools: !production && isLoopbackHost(host) && env.DEV_TOOLS !== 'false',
    trustProxy: (env.TRUST_PROXY ?? (production ? '' : '127.0.0.1,::1,::ffff:127.0.0.1'))
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    unverifiedRefreshTtlMs: num(env.UNVERIFIED_REFRESH_TTL_MS, 24 * 3600_000),
    staffAbsoluteMs: num(env.STAFF_ABSOLUTE_MS, 12 * 3600_000),
    limits: { maxUserStateBytes: num(env.MAX_USER_STATE_BYTES, 1_500_000) },
    rate: {
      windowMs: num(env.RATE_WINDOW_MS, 15 * 60_000),
      loginAttempts: num(env.RATE_LOGIN_ATTEMPTS, 8),
      mfaAttempts: 5,
      globalPerWindow: num(env.RATE_GLOBAL, 3000),
      loginPerAccount: num(env.RATE_LOGIN_PER_ACCOUNT, 30),
      loginFailuresPerIp: num(env.RATE_LOGIN_FAILURES_PER_IP, 60),
      mfaFailuresPerAccount: num(env.RATE_MFA_FAILURES_PER_ACCOUNT, 10),
      userWritesPerWindow: num(env.RATE_USER_WRITES, 1200),
      adminWritesPerWindow: num(env.RATE_ADMIN_WRITES, 600),
      exportPerHour: num(env.RATE_EXPORT_PER_HOUR, 10),
      contactPerHour: num(env.RATE_CONTACT_PER_HOUR, 10),
      registerPerHour: num(env.RATE_REGISTER_PER_HOUR, 20),
    },
  };
}
