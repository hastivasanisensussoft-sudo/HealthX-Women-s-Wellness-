/** Public endpoints: health check, published content, contact form, and development-only helpers. */
import type { SupportRequest } from '@healthx/shared/admin';
import type { Deps } from '../auth';
import { publishedArticles } from '../content';
import { randomId, totp } from '../crypto';
import { HttpError, notFound, tooMany, type Ctx, type Router } from '../http';
import { email, obj, oneOf, str } from '../validate';

const MAX_SUPPORT = 20_000;
const isLoopbackIp = (ip: string) => ip === '::1' || ip.startsWith('127.') || ip.startsWith('::ffff:127.');

/**
 * Dev helpers answer only to this machine: a loopback peer, no non-loopback proxy hop, and a
 * loopback Host header (so a DNS-rebinding page can't read them through the browser).
 */
function devOnly(ctx: Ctx) {
  const hops = String(ctx.req.headers['x-forwarded-for'] ?? '').split(',').map((h) => h.trim()).filter(Boolean);
  const host = String(ctx.req.headers.host ?? '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase();
  if (!isLoopbackIp(ctx.req.socket.remoteAddress ?? '') || hops.some((h) => !isLoopbackIp(h)) || !['localhost', '127.0.0.1', '::1'].includes(host)) throw notFound();
}

export function publicRoutes(r: Router, deps: Deps) {
  const { store, config } = deps;

  r.get('/v1/health', () => ({ body: { status: 'ok', storage: 'in-memory (resets on restart)', time: new Date().toISOString() } }));

  r.get('/v1/content', () => ({
    body: { items: publishedArticles(store).map(({ body: _b, ...summary }) => summary) },
  }));

  r.get('/v1/content/:id', (ctx) => {
    const item = publishedArticles(store).find((a) => a.id === ctx.params.id);
    if (!item) throw notFound('This article isn’t available.');
    return { body: { item } };
  });

  /** Contact form → Support queue (no account needed). */
  r.post('/v1/contact', (ctx) => {
    const wait = store.rate.hit(`contact:${ctx.ip}`, config.rate.contactPerHour, 3600_000);
    if (wait) throw tooMany(wait);
    const b = obj(ctx.body, 'body', ['name', 'email', 'topic', 'message']);
    const name = str(b.name, 'name', 2, 80).trim();
    const addr = email(b.email);
    const topic = oneOf(b.topic, 'topic', ['general', 'privacy', 'account', 'subscription', 'feedback', 'partnership']);
    const message = str(b.message, 'message', 10, 2000).trim();
    if (store.admin.support.length >= MAX_SUPPORT) throw new HttpError(503, 'unavailable', 'We can’t accept new messages right now. Please try again later.');
    const at = new Date().toISOString();
    const req: SupportRequest = {
      id: randomId('sr'),
      type: topic === 'privacy' ? 'data_export' : topic === 'subscription' ? 'subscription_issue' : 'login_help',
      // Anyone can type any email here, so the sender is never linked to an account and never acted on
      // without verifying them through the account itself.
      userId: 'guest',
      userName: name,
      userEmail: addr,
      subject: `[unverified sender] [${topic}] ${message.slice(0, 80)}`,
      createdAt: at,
      status: 'open',
      assignee: null,
      priority: 'normal',
      channel: 'email',
      notes: [{ at, by: name, text: message }],
    };
    store.admin.support = [req, ...store.admin.support];
    return { status: 202, body: { ok: true, reference: req.id } };
  });

  if (config.devTools) {
    // DEVELOPMENT ONLY (never registered in production or on a non-loopback HOST): read the email
    // outbox and the current authenticator code for seeded staff, so the demo works without real email/MFA apps.
    r.get('/v1/dev/outbox', (ctx) => {
      devOnly(ctx);
      const to = ctx.query.get('to')?.toLowerCase();
      return { body: { messages: store.outbox.filter((m) => !to || m.to === to).slice(0, 20) } };
    });
    r.get('/v1/dev/mfa-code', (ctx) => {
      devOnly(ctx);
      const acc = store.byEmail(ctx.query.get('email') ?? '');
      if (!acc || !acc.mfaSecret) throw notFound('No MFA-enrolled staff account with that email.');
      return { body: { code: totp(acc.mfaSecret), note: 'Development helper — use an authenticator app in real environments.' } };
    });
  }
}
