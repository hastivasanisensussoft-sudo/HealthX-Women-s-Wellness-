import { useMemo, useState } from 'react';
import { Check, Crown, Eye, Gift, IndianRupee, Percent, ReceiptText, TrendingDown, TrendingUp, Undo2, Users, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { addDays, formatDate, todayISO, type PhotoKey } from '@healthx/shared';
import { cv } from '@/theme/engine';
import { AreaTrend } from '@/components/charts/Charts';
import { Avatar } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { BackendBadge, Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, Input, Modal, Notice, Pagination, PhaseBadge, SearchInput, Segmented, Select, Textarea, useToast } from '@/components/ui';
import { cn, paginate } from '@/lib/utils';
import { useAdmin } from '../adminState';
import { MRR_SERIES, type AdminUser } from '../adminData';
import { AdminHeader, AdminHero, HeroStat, RowActions, StatusPill, TableShell, Th } from '../components';
import { formatDateTime, maskEmail } from '../helpers';

const FREE = ['Basic period tracking', 'Basic symptoms', 'Basic wellness tracking'];
const PREMIUM = ['Advanced insights', 'AI coach', 'Advanced cycle history', 'Nutrition', 'Personalised programs', 'Advanced wellness reports'];
const PLANS: { name: string; items: string[]; photo: PhotoKey; position: string; premium: boolean }[] = [
  { name: 'Free', items: FREE, photo: 'walking-outdoors', position: '50% 35%', premium: false },
  { name: 'Premium', items: PREMIUM, photo: 'pilates-mat', position: '50% 40%', premium: true },
];

export default function Subscriptions() {
  const { state, dispatch, audit } = useAdmin();
  const toast = useToast();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grant, setGrant] = useState<{ userId: string; days: '7' | '30' | '90'; reason: string }>({ userId: '', days: '30', reason: '' });
  const [errors, setErrors] = useState<{ user?: string; reason?: string }>({});
  const [revoke, setRevoke] = useState<AdminUser | null>(null);
  const [refundFor, setRefundFor] = useState<AdminUser | null>(null);
  const [refund, setRefund] = useState({ amount: '199', reason: 'Duplicate charge', note: '' });
  const [refundErr, setRefundErr] = useState<{ amount?: string; note?: string }>({});

  const openRefund = (u: AdminUser) => {
    setRefundFor(u);
    setRefund({ amount: '199', reason: 'Duplicate charge', note: '' });
    setRefundErr({});
  };

  const submitRefund = () => {
    if (!refundFor) return;
    const amt = Number(refund.amount);
    const e: typeof refundErr = {};
    if (!Number.isFinite(amt) || amt < 1 || amt > 1999) e.amount = 'Enter an amount between ₹1 and ₹1,999.';
    if (refund.reason === 'Other' && refund.note.trim().length < 10) e.note = 'Describe the reason (at least 10 characters).';
    setRefundErr(e);
    if (Object.keys(e).length) return;
    const reason = refund.reason === 'Other' ? refund.note.trim() : refund.reason;
    const name = refundFor.name;
    void dispatch({ type: 'ADD_REFUND', refund: { id: `rf_${Date.now().toString(36)}`, userId: refundFor.id, userName: refundFor.name, amount: amt, reason, at: new Date().toISOString(), by: state.session!.name } }).then((ok) => {
      if (!ok) return;
      toast.success('Refund requested (simulated)', `₹${amt} for ${name} via the store.`);
      setRefundFor(null);
    });
    audit('subscription.refund', refundFor.id, `₹${amt} · ${reason}`);
  };

  const subs = useMemo(() => state.users.filter((u) => u.plan === 'premium' && u.status !== 'deleted'), [state.users]);
  const filtered = subs.filter((u) => !q.trim() || `${u.name} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase()));
  const pg = paginate(filtered, page, 8);
  const eligible = state.users.filter((u) => u.plan === 'free' && u.status === 'active');
  const last = MRR_SERIES[MRR_SERIES.length - 1];
  const comps = subs.filter((u) => u.comp).length;

  const submitGrant = () => {
    const e: typeof errors = {};
    if (!grant.userId) e.user = 'Choose a user.';
    if (grant.reason.trim().length < 10) e.reason = 'Add a reason (at least 10 characters) for the audit trail.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const user = state.users.find((u) => u.id === grant.userId)!;
    const until = addDays(todayISO(), Number(grant.days));
    void dispatch({ type: 'UPDATE_USER', id: user.id, patch: { plan: 'premium', comp: { until, reason: grant.reason.trim() } } }).then((ok) => {
      if (!ok) return;
      toast.success('Complimentary Premium granted', `${user.name} until ${formatDate(until)}.`);
      setGrantOpen(false);
      setGrant({ userId: '', days: '30', reason: '' });
    });
    audit('subscription.grant_comp', user.id, `${grant.days} days · ${grant.reason.trim()}`);
  };

  return (
    <>
      <AdminHeader
        title="Subscriptions"
        badge={<PhaseBadge phase={2} />}
        subtitle="Free and Premium plans (§49). Billing via App Store / Google Play is undecided (D-13) — all figures are simulated."
        actions={
          <Button leftIcon={<Gift className="h-4 w-4" />} onClick={() => setGrantOpen(true)}>
            Grant complimentary access
          </Button>
        }
      />

      <AdminHero
        eyebrow="Revenue preview · illustrative"
        title="Monthly recurring revenue"
        aside={
          <div className="grid grid-cols-2 gap-3">
            <HeroStat label="Premium subscribers" value={(last.subs + subs.length).toLocaleString('en-IN')} icon={<Users className="h-3.5 w-3.5" />} hint={`${subs.length} in this demo list`} />
            <HeroStat label="Monthly churn" value="3.1%" icon={<TrendingDown className="h-3.5 w-3.5" />} hint="subscription_cancelled" />
            <HeroStat label="Trial conversion" value="24%" icon={<Percent className="h-3.5 w-3.5" />} hint="if trials are approved (D-13)" />
            <HeroStat label="Refunds recorded" value={state.refunds.length} icon={<ReceiptText className="h-3.5 w-3.5" />} hint={`${comps} complimentary grants`} />
          </div>
        }
      >
        <p className="mt-4 flex flex-wrap items-baseline gap-3">
          <span className="num text-[44px] leading-none text-white sm:text-[52px]">₹{last.mrr.toLocaleString('en-IN')}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-butter-300 px-2.5 py-1 text-xs font-bold text-green-950">
            <TrendingUp className="h-3.5 w-3.5" /> +30.8%
          </span>
        </p>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-green-50/80">MRR (illustrative) — pricing TBD (D-13). Entitlements are server-authoritative; nothing here is real billing.</p>
      </AdminHero>

      <div className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="card-pad">
          <CardHeader title="Monthly recurring revenue" subtitle="Simulated preview" icon={<IndianRupee className="h-5 w-5" />} />
          <AreaTrend data={MRR_SERIES} series={[{ key: 'mrr', name: 'MRR (₹)', color: cv('green', 600) }]} />
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {PLANS.map((p) => (
            <Card key={p.name} className={cn('overflow-hidden', p.premium && 'ring-1 ring-butter-200')}>
              <div className="flex gap-4 p-4 sm:p-5">
                <Photo photo={p.photo} alt="" position={p.position} className="hidden h-24 w-20 shrink-0 sm:block" shape="arch" />
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 font-display text-[18px] font-semibold text-ink-900">
                      <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', p.premium ? 'bg-butter-100 text-butter-600' : 'bg-green-50 text-green-700')}>
                        {p.premium ? <Crown className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </span>
                      {p.name}
                    </p>
                    <Badge tone={p.premium ? 'butter' : 'gray'}>§49</Badge>
                  </div>
                  <ul className="grid gap-1.5 text-sm text-ink-600">
                    {p.items.map((i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-green-600" /> {i}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="eyebrow mb-1">Premium members</p>
            <p className="font-display text-[18px] font-semibold text-ink-900">Subscribers</p>
            <p className="text-sm text-ink-500">Entitlements are server-authoritative; receipts validated server-side [ADD A-22].</p>
          </div>
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Search subscribers…"
            className="sm:w-72"
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<Crown className="h-6 w-6" />} title="No subscribers found" body={q ? 'Try a different name or email.' : undefined} compact />
        ) : (
          <>
            <TableShell minWidth={820}>
              <thead>
                <tr>
                  <Th>Subscriber</Th>
                  <Th>Source</Th>
                  <Th>Since</Th>
                  <Th>Status</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {pg.items.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <Avatar name={u.name} size={36} />
                        <span>
                          <span className="block font-semibold text-ink-900">{u.name}</span>
                          <span className="block text-xs text-ink-500">{maskEmail(u.email)}</span>
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">{u.comp ? 'Complimentary' : u.devices[0]?.platform === 'iOS' ? 'App Store' : 'Google Play'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">{formatDate(u.signupDate)}</td>
                    <td className="px-4 py-3">{u.comp ? <StatusPill tone="lavender">Comp until {formatDate(u.comp.until)}</StatusPill> : <StatusPill tone="green">Active</StatusPill>}</td>
                    <td className="px-2 py-3 text-right">
                      <RowActions
                        label={u.name}
                        actions={[
                          { label: 'View account', icon: Eye, onSelect: () => nav(`/admin/users?q=${encodeURIComponent(u.email)}`) },
                          !u.comp && { label: 'Issue refund…', icon: Undo2, onSelect: () => openRefund(u) },
                          !!u.comp && { label: 'Revoke complimentary access', icon: XCircle, danger: true, onSelect: () => setRevoke(u) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <div className="border-t border-ink-100 p-4">
              <Pagination page={pg.page} pages={pg.pages} onChange={setPage} total={pg.total} label="subscribers" />
            </div>
          </>
        )}
      </Card>

      <Modal
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        title="Grant complimentary Premium"
        description="For support goodwill, beta testers or partners. The grant is audited."
        footer={
          <>
            <BackendBadge className="mr-auto self-center" />
            <Button variant="ghost" onClick={() => setGrantOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitGrant}>Grant access</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="User" required htmlFor="g-user" error={errors.user}>
            <Select id="g-user" value={grant.userId} onChange={(e) => setGrant({ ...grant, userId: e.target.value })} invalid={!!errors.user}>
              <option value="">Select an active free user…</option>
              {eligible.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.email}
                </option>
              ))}
            </Select>
          </Field>
          <div>
            <p className="label">Duration</p>
            <Segmented
              value={grant.days}
              onChange={(d) => setGrant({ ...grant, days: d })}
              options={[
                { value: '7', label: '7 days' },
                { value: '30', label: '30 days' },
                { value: '90', label: '90 days' },
              ]}
            />
          </div>
          <Field label="Reason" required htmlFor="g-reason" error={errors.reason}>
            <Textarea id="g-reason" value={grant.reason} onChange={(e) => setGrant({ ...grant, reason: e.target.value })} invalid={!!errors.reason} placeholder="e.g. Beta tester thank-you" />
          </Field>
          <Field label="Expires">
            <Input value={formatDate(addDays(todayISO(), Number(grant.days)))} disabled readOnly />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!revoke}
        onClose={() => setRevoke(null)}
        onConfirm={() => {
          if (!revoke) return;
          // The API revokes on comp: null (JSON drops undefined); the shared patch type doesn't allow null yet.
          void dispatch({ type: 'UPDATE_USER', id: revoke.id, patch: { plan: 'free', comp: null as unknown as undefined } }).then((ok) => ok && toast.success('Complimentary access revoked', 'The user keeps their data; Premium views lock (D-13).'));
          audit('subscription.revoke_comp', revoke.id);
        }}
        title="Revoke complimentary Premium?"
        body={<>{revoke?.name} returns to the Free plan. Their data is kept.</>}
        confirmLabel="Revoke"
        danger
      />

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-4 sm:p-5">
          <div>
            <p className="eyebrow mb-1">Store billing</p>
            <p className="font-display text-[18px] font-semibold text-ink-900">Refunds</p>
            <p className="text-sm text-ink-500">Store-billed refunds are issued by Apple / Google; HealthX records the request (D-13). Simulated.</p>
          </div>
          <BackendBadge />
        </div>
        {state.refunds.length === 0 ? (
          <EmptyState icon={<Undo2 className="h-6 w-6" />} title="No refunds yet" body="Refunds you issue from a subscriber’s row appear here." compact />
        ) : (
          <TableShell minWidth={680}>
            <thead>
              <tr>
                <Th>User</Th>
                <Th className="text-right">Amount</Th>
                <Th>Reason</Th>
                <Th>Issued by</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody>
              {state.refunds.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-semibold text-ink-900">{r.userName}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-900">₹{r.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-ink-600">{r.reason}</td>
                  <td className="px-4 py-3 text-ink-600">{r.by}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-600">{formatDateTime(r.at)}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <Modal
        open={!!refundFor}
        onClose={() => setRefundFor(null)}
        size="sm"
        title="Issue refund"
        description={refundFor ? `${refundFor.name} · ${refundFor.devices[0]?.platform === 'iOS' ? 'App Store' : 'Google Play'} billing` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRefundFor(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={submitRefund}>
              Issue refund
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Amount (₹)" required htmlFor="rf-amount" error={refundErr.amount} hint="Up to one billing period (illustrative price ₹199, D-13).">
            <Input id="rf-amount" type="number" min={1} max={1999} value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} invalid={!!refundErr.amount} />
          </Field>
          <Field label="Reason" required htmlFor="rf-reason">
            <Select id="rf-reason" value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })}>
              {['Duplicate charge', 'Purchased by mistake', 'Service issue', 'Other'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </Field>
          {refund.reason === 'Other' && (
            <Field label="Details" required htmlFor="rf-note" error={refundErr.note}>
              <Textarea id="rf-note" value={refund.note} onChange={(e) => setRefund({ ...refund, note: e.target.value })} invalid={!!refundErr.note} />
            </Field>
          )}
        </div>
      </Modal>

      <Notice tone="info" className="mt-5">
        Downgrades keep all user data and lock Premium views (D-13 proposal). Store subscriptions must be cancelled in the App Store / Google Play.
      </Notice>
    </>
  );
}
