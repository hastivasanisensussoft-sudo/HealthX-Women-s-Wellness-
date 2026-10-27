/** Builds the API request handler (used by main.ts and by the tests, which listen on a random port). */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Deps } from './auth';
import type { Config } from './config';
import { clientIp, createHandler, Router, tooMany, type Ctx } from './http';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { meRoutes } from './routes/me';
import { publicRoutes } from './routes/public';
import { seedStore } from './seed';
import type { Store } from './store';

export function createApp(config: Config, store: Store = seedStore(config), log: (line: string) => void = () => undefined) {
  const deps: Deps = { store, config };
  const router = new Router();
  publicRoutes(router, deps);
  authRoutes(router, deps);
  meRoutes(router, deps);
  adminRoutes(router, deps);
  const inner = createHandler(router, config, log);
  // Global per-IP limit (SRS §47) applied before routing.
  const handler: typeof inner = async (req, res) => {
    const wait = store.rate.hit(`global:${clientIp(req, config)}`, config.rate.globalPerWindow, config.rate.windowMs);
    if (wait) {
      res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8', 'Retry-After': String(wait) });
      res.end(JSON.stringify({ error: { code: 'rate_limited', message: tooMany(wait).message } }));
      return;
    }
    // Backstop: nothing a request does may take the process (and everyone's in-memory data) down.
    return inner(req, res).catch(() => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: { code: 'internal', message: 'Something went wrong. Please try again.' } }));
      } else res.destroy();
    });
  };
  return { handler, store, deps };
}

export async function listen(config: Config, store?: Store, log?: (line: string) => void) {
  const app = createApp(config, store, log);
  const server = createServer(app.handler);
  await new Promise<void>((resolve) => server.listen(config.port, config.host, resolve));
  const { port } = server.address() as AddressInfo;
  return { server, port, url: `http://${config.host}:${port}`, store: app.store };
}

export type { Ctx };
