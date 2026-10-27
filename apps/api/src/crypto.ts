/** Password hashing (scrypt), opaque tokens and RFC 6238 TOTP — Node built-ins only. */
import { createHash, createHmac, randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

/** scrypt is a memory-hard adaptive KDF (SRS §47 / plan: "modern adaptive algorithm"). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize('NFKC'), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

const scryptAsync = (pw: string | Buffer, salt: string | Buffer, keylen: number, o: { N: number; r: number; p: number }) =>
  new Promise<Buffer>((resolve, reject) => scrypt(pw, salt, keylen, { ...o, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key))));

/** Async variants for request handlers — scrypt runs on the libuv thread pool, not the event loop. */
export async function hashPasswordAsync(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize('NFKC'), salt, SCRYPT.keylen, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPasswordAsync(password: string, stored: string | null): Promise<boolean> {
  if (!stored) {
    await scryptAsync(password, 'timing-pad', SCRYPT.keylen, SCRYPT);
    return false;
  }
  const [alg, N, r, p, salt, hash] = stored.split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scryptAsync(password.normalize('NFKC'), Buffer.from(salt, 'base64'), expected.length, { N: Number(N), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Synchronous — only for start-up seeding and unit tests. */
export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) {
    // Spend comparable time so missing accounts aren't distinguishable by timing.
    scryptSync(password, 'timing-pad', SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
    return false;
  }
  const [alg, N, r, p, salt, hash] = stored.split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = scryptSync(password.normalize('NFKC'), Buffer.from(salt, 'base64'), expected.length, { N: Number(N), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const randomId = (prefix: string) => `${prefix}_${randomBytes(9).toString('base64url')}`;
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// ---------- TOTP (RFC 6238, HMAC-SHA1, 30 s, 6 digits) ----------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function newTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(s: string): Buffer {
  let bits = '';
  for (const ch of s.replace(/=+$/, '').toUpperCase()) {
    const v = B32.indexOf(ch);
    if (v < 0) throw new Error('bad base32');
    bits += v.toString(2).padStart(5, '0');
  }
  const out: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}

export function hotp(secret: string, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const off = mac[mac.length - 1] & 0xf;
  const code = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

export const totpStep = (now = Date.now()) => Math.floor(now / 30_000);
export const totp = (secret: string, now = Date.now()) => hotp(secret, totpStep(now));

/**
 * Verifies a code within ±1 step. Returns the matched step so callers can reject replays
 * (a step may be used only once per account).
 */
export function verifyTotp(secret: string, code: string, lastUsedStep: number, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const cur = totpStep(now);
  for (const step of [cur - 1, cur, cur + 1]) {
    if (step <= lastUsedStep) continue;
    if (safeEqual(hotp(secret, step), code)) return step;
  }
  return null;
}

export const otpauthUrl = (secret: string, email: string) => `otpauth://totp/HealthX%20Admin:${encodeURIComponent(email)}?secret=${secret}&issuer=HealthX%20Admin`;
