/** /v1/admin/* — Web Admin. Every route requires an MFA-verified staff session + server-side capabilities. */
import { adminUserRow } from '../accounts';
import { auditBy, requireStaff, type Deps } from '../auth';
import { applyAdminAction } from '../adminPolicy';
import { badRequest, notFound, tooMany, type Router } from '../http';
import { projectAdminState } from '../projection';
import { obj, str } from '../validate';

export function adminRoutes(r: Router, deps: Deps) {
  const { store, config } = deps;

  r.get('/v1/admin/state', (ctx) => {
    const a = requireStaff(ctx, deps);
    return { body: { state: projectAdminState(store, a) } };
  });

  r.post('/v1/admin/actions', (ctx) => {
    const a = requireStaff(ctx, deps);
    // Per-account write budget (the audit log is never truncated, so writes are what bound its growth).
    const wait = store.rate.hit(`admin-write:${a.account.id}`, config.rate.adminWritesPerWindow, config.rate.windowMs);
    if (wait) throw tooMany(wait);
    const b = obj(ctx.body, 'body', ['action']);
    const origin = ctx.origin && config.allowedOrigins.includes(ctx.origin) ? ctx.origin : config.allowedOrigins[0];
    const note = applyAdminAction(store, a, b.action, origin);
    if (note) auditBy(deps, a.account, note, ctx.ip);
    return { body: { state: projectAdminState(store, a) } };
  });

  /** Full email for one account — needed for some support cases, so it is audited. */
  r.post('/v1/admin/users/:id/reveal-email', (ctx) => {
    const a = requireStaff(ctx, deps, 'view_users');
    const acc = store.accounts.get(ctx.params.id);
    if (!acc || acc.role !== 'end_user') throw notFound('User not found.');
    auditBy(deps, a.account, { action: 'user.email_revealed', target: acc.id }, ctx.ip);
    return { body: { email: adminUserRow(store, acc, { maskEmail: false }).email } };
  });

  /**
   * Break-glass (A-15): Admins holding the break-glass permission only, reason required, audited. Returns data CATEGORIES and
   * record COUNTS — never individual health values, because no role is authorised to read them.
   */
  r.post('/v1/admin/users/:id/break-glass', (ctx) => {
    const a = requireStaff(ctx, deps, 'break_glass');
    const reason = str(obj(ctx.body, 'body', ['reason']).reason, 'reason', 10, 500).trim();
    const acc = store.accounts.get(ctx.params.id);
    if (!acc || acc.role !== 'end_user') throw notFound('User not found.');
    const s = store.userStates.get(acc.id);
    const counts = s
      ? [
          { label: 'Cycle & period logs', count: s.periods.length },
          { label: 'Symptom logs', count: s.symptomLogs.length },
          { label: 'Check-ins', count: s.checkIns.length },
          { label: 'Hydration', count: s.water.length },
          { label: 'Workouts', count: s.sessions.length },
          { label: 'Sleep', count: s.sleep.length },
        ]
      : [];
    auditBy(deps, a.account, { action: 'user.break_glass', target: acc.id, detail: reason.slice(0, 200) }, ctx.ip);
    return { body: { categories: counts, expiresInSec: 900, note: s ? undefined : 'No wellness data stored for this account.' } };
  });

  r.get('/v1/admin/audit', (ctx) => {
    requireStaff(ctx, deps, 'view_audit');
    const page = Math.max(1, Number(ctx.query.get('page') ?? 1) || 1);
    const size = Math.min(200, Math.max(1, Number(ctx.query.get('size') ?? 50) || 50));
    if (!Number.isInteger(page) || !Number.isInteger(size)) throw badRequest('page and size must be whole numbers.');
    const all = store.admin.audit;
    return { body: { total: all.length, page, size, entries: all.slice((page - 1) * size, page * size) } };
  });
}
