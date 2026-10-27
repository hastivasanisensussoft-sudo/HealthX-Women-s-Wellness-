/** Minimal HTTP layer: routing, JSON bodies, CORS allowlist, security headers, errors. */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Config } from './config';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, 'bad_request', message, details);
export const unauthorized = (message = 'Please sign in.') => new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'You don’t have permission to do that.') => new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Not found.') => new HttpError(404, 'not_found', message);
export const conflict = (message: string) => new HttpError(409, 'conflict', message);
export const tooMany = (retryAfterSec: number) => new HttpError(429, 'rate_limited', `Too many attempts. Try again in ${Math.max(1, Math.ceil(retryAfterSec / 60))} min.`, { retryAfterSec });

export interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  ip: string;
  origin: string | undefined;
  cookies: Record<string, string>;
  /** Extra response headers (e.g. Set-Cookie). */
  headers: Record<string, string | string[]>;
}

export interface Reply {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export type Handler = (ctx: Ctx) => Promise<Reply> | Reply;

interface Route {
  method: string;
  parts: string[];
  handler: Handler;
}

export class Router {
  private routes: Route[] = [];
  add(method: string, pattern: string, handler: Handler) {
    this.routes.push({ method, parts: pattern.split('/').filter(Boolean), handler });
  }
  get = (p: string, h: Handler) => this.add('GET', p, h);
  post = (p: string, h: Handler) => this.add('POST', p, h);
  patch = (p: string, h: Handler) => this.add('PATCH', p, h);
  delete = (p: string, h: Handler) => this.add('DELETE', p, h);

  match(method: string, path: string): { handler: Handler; params: Record<string, string> } | 'method' | 'bad_path' | null {
    const parts = path.split('/').filter(Boolean);
    let methodMismatch = false;
    for (const r of this.routes) {
      if (r.parts.length !== parts.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < parts.length; i++) {
        if (r.parts[i].startsWith(':')) {
          const v = safeDecode(parts[i]);
          if (v === null) return 'bad_path';
          params[r.parts[i].slice(1)] = v;
        } else if (r.parts[i] !== parts[i]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      if (r.method !== method) {
        methodMismatch = true;
        continue;
      }
      return { handler: r.handler, params };
    }
    return methodMismatch ? 'method' : null;
  }
}

/** decodeURIComponent throws on malformed escapes (e.g. "%E0") — never let that escape a handler. */
export function safeDecode(v: string): string | null {
  try {
    return decodeURIComponent(v);
  } catch {
    return null;
  }
}

const MAX_BODY = 512 * 1024;

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new HttpError(413, 'payload_too_large', 'Request body is too large.');
    chunks.push(chunk as Buffer);
  }
  if (!size) return undefined;
  const ct = req.headers['content-type'] ?? '';
  if (!ct.includes('application/json')) throw new HttpError(415, 'unsupported_media_type', 'Send JSON (Content-Type: application/json).');
  const text = Buffer.concat(chunks).toString('utf8');
  if (nestedTooDeep(text)) throw badRequest('JSON is nested too deeply.');
  try {
    return JSON.parse(text);
  } catch {
    throw badRequest('Malformed JSON.');
  }
}

const MAX_DEPTH = 32;
/** Refused before parsing: stored values are serialised again for other users, and deep nesting overflows the stack. */
function nestedTooDeep(text: string): boolean {
  let depth = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (inString) {
      if (ch === 92) i++; // backslash escapes the next character
      else if (ch === 34) inString = false;
    } else if (ch === 34) inString = true;
    else if (ch === 123 || ch === 91) {
      if (++depth > MAX_DEPTH) return true;
    } else if (ch === 125 || ch === 93) depth--;
  }
  return false;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    const v = safeDecode(part.slice(i + 1).trim());
    if (v !== null) out[part.slice(0, i).trim()] = v;
  }
  return out;
}

export function serializeCookie(name: string, value: string, opts: { maxAgeSec: number; path: string; secure: boolean }) {
  return `${name}=${encodeURIComponent(value)}; Path=${opts.path}; Max-Age=${opts.maxAgeSec}; HttpOnly; SameSite=Strict${opts.secure ? '; Secure' : ''}`;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function createHandler(router: Router, config: Config, log: (line: string) => void) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const started = Date.now();
    const method = (req.method ?? 'GET').toUpperCase();
    let pathname = '/';
    const origin = req.headers.origin;
    const allowed = !!origin && config.allowedOrigins.includes(origin);
    const baseHeaders: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'Cross-Origin-Resource-Policy': 'same-site',
      // Responses can contain health data — never cache them.
      'Cache-Control': 'no-store',
      Vary: 'Origin',
    };
    if (config.production) baseHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    if (allowed) {
      baseHeaders['Access-Control-Allow-Origin'] = origin!;
      baseHeaders['Access-Control-Allow-Credentials'] = 'true';
    }
    const send = (status: number, body: unknown, extra: Record<string, string | string[]> = {}) => {
      // Serialise BEFORE writing headers, so a serialisation error can still become a clean 500.
      const payload = body === undefined ? undefined : JSON.stringify(body);
      res.writeHead(status, { ...baseHeaders, ...(payload === undefined ? {} : { 'Content-Type': 'application/json; charset=utf-8' }), ...extra });
      res.end(payload);
      log(`${method} ${pathname} ${status} ${Date.now() - started}ms`);
    };
    const fail = (e: HttpError, extra: Record<string, string | string[]> = {}) => {
      if (e.status === 429 && e.details && typeof e.details === 'object' && 'retryAfterSec' in e.details) extra['Retry-After'] = String((e.details as { retryAfterSec: number }).retryAfterSec);
      send(e.status, { error: { code: e.code, message: e.message, ...(e.details && e.status !== 429 ? { details: e.details } : {}) } }, extra);
    };

    const ctxHeaders: Record<string, string | string[]> = {};
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      pathname = url.pathname;
      if (method === 'OPTIONS') {
        if (!allowed) return send(403, { error: { code: 'origin_not_allowed', message: 'Origin not allowed.' } });
        return send(204, undefined, {
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Client,X-Requested-With',
          'Access-Control-Max-Age': '600',
        });
      }
      // Defence in depth against CSRF: a browser request from a foreign origin may not change state.
      if (!SAFE_METHODS.has(method) && origin && !allowed) {
        return send(403, { error: { code: 'origin_not_allowed', message: 'Origin not allowed.' } });
      }
      const found = router.match(method, url.pathname);
      if (found === null) return send(404, { error: { code: 'not_found', message: 'Not found.' } });
      if (found === 'method') return send(405, { error: { code: 'method_not_allowed', message: 'Method not allowed.' } });
      if (found === 'bad_path') throw badRequest('Malformed URL.');
      const ctx: Ctx = {
        req,
        res,
        method,
        path: url.pathname,
        params: found.params,
        query: url.searchParams,
        body: undefined,
        ip: clientIp(req, config),
        origin,
        cookies: parseCookies(req.headers.cookie),
        headers: ctxHeaders,
      };
      ctx.body = SAFE_METHODS.has(method) ? undefined : await readBody(req);
      const reply = await found.handler(ctx);
      send(reply.status ?? (reply.body === undefined ? 204 : 200), reply.body, { ...ctx.headers, ...(reply.headers ?? {}) });
    } catch (e) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (e instanceof HttpError) return fail(e, { ...ctxHeaders });
      // Never leak internals (stack traces, request bodies, health values) to clients or logs.
      log(`ERROR ${method} ${pathname}: ${(e as Error)?.message ?? 'unknown'}`);
      try {
        send(500, { error: { code: 'internal', message: 'Something went wrong. Please try again.' } });
      } catch {
        res.destroy();
      }
    }
  };
}

/**
 * Client IP for rate limiting / audit. X-Forwarded-For is trusted ONLY when the direct peer is a
 * configured proxy (e.g. the Vite dev proxy on loopback), otherwise anyone could spoof it.
 */
export function clientIp(req: IncomingMessage, config: Config): string {
  const peer = req.socket.remoteAddress ?? 'unknown';
  if (!config.trustProxy.includes(peer)) return peer;
  const xff = String(req.headers['x-forwarded-for'] ?? '').split(',')[0]?.trim();
  return xff && /^[0-9a-fA-F:.]{2,45}$/.test(xff) ? xff : peer;
}
