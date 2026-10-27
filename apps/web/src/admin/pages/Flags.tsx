import { useMemo, useState } from 'react';
import { FlaskConical, Globe, Rocket, ToggleRight, Users } from 'lucide-react';
import { timeAgo } from '@healthx/shared';
import { Badge, Card, CardSkeleton, ConfirmDialog, EmptyState, Notice, SearchInput, Segmented, Switch, useToast } from '@/components/ui';
import { cn, useDemoLoading } from '@/lib/utils';
import { useAdmin } from '../adminState';
import type { FeatureFlag } from '../adminData';
import { AdminHeader, FilterSelect, KpiCard, StatusPill, Toolbar } from '../components';

type Env = 'dev' | 'staging' | 'prod';
const ENV_LABEL: Record<Env, string> = { dev: 'Development', staging: 'Staging', prod: 'Production' };

function RolloutSlider({ flag, env, onCommit }: { flag: FeatureFlag; env: Env; onCommit: (v: number) => void }) {
  const saved = flag.env[env].rollout;
  const [v, setV] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setV(saved);
  }
  const commit = () => v !== saved && onCommit(v);
  const disabled = !flag.env[env].enabled;
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={v}
        disabled={disabled}
        aria-label={`${flag.name} rollout percentage`}
        onChange={(e) => setV(Number(e.target.value))}
        onMouseUp={commit}
        onTouchEnd={commit}
        onKeyUp={commit}
        onBlur={commit}
        className="w-full accent-green-600 disabled:opacity-40"
      />
      <span className={cn('num w-14 rounded-full px-2 py-0.5 text-center text-sm', disabled ? 'bg-ink-100 text-ink-400' : 'bg-green-100 text-green-800')}>{v}%</span>
    </div>
  );
}

export default function Flags() {
  const { state, dispatch, audit } = useAdmin();
  const toast = useToast();
  const loading = useDemoLoading(350);
  const [env, setEnv] = useState<Env>('prod');
  const [q, setQ] = useState('');
  const [phase, setPhase] = useState('all');
  const [confirm, setConfirm] = useState<FeatureFlag | null>(null);
  const by = state.session!.name;

  const flags = useMemo(() => {
    const t = q.trim().toLowerCase();
    return state.flags.filter((f) => (!t || `${f.name} ${f.key} ${f.description}`.toLowerCase().includes(t)) && (phase === 'all' || f.phase === phase));
  }, [state.flags, q, phase]);
  const onHere = state.flags.filter((f) => f.env[env].enabled);
  const avgRollout = onHere.length ? Math.round(onHere.reduce((a, f) => a + f.env[env].rollout, 0) / onHere.length) : 0;

  const toggle = (f: FeatureFlag, enabled: boolean) => {
    void dispatch({ type: 'UPDATE_FLAG', key: f.key, env, patch: { enabled, rollout: enabled ? Math.max(f.env[env].rollout, 10) : f.env[env].rollout }, by }).then(
      (ok) => ok && toast.success(`${f.name} ${enabled ? 'enabled' : 'disabled'} in ${env}`),
    );
    audit('flag.update', f.key, `${env} ${enabled ? 'enabled' : 'disabled'}`);
  };

  const requestToggle = (f: FeatureFlag, enabled: boolean) => {
    if (enabled && env === 'prod' && f.phase !== '2') setConfirm(f);
    else toggle(f, enabled);
  };

  return (
    <>
      <AdminHeader title="Feature flags" subtitle="Gate Phase 2/3 modules per environment without an app release (§6.4). Every change is audited." />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Flags" value={state.flags.length} icon={<ToggleRight className="h-5 w-5" />} hint="Phase 2, 3 and future modules" />
        <KpiCard label={`On in ${ENV_LABEL[env].toLowerCase()}`} value={onHere.length} icon={<Rocket className="h-5 w-5" />} tone="sky" hint={`of ${state.flags.length} flags`} />
        <KpiCard label="Average rollout" value={avgRollout} unit="%" icon={<Users className="h-5 w-5" />} tone="lavender" hint="enabled flags only" />
        <KpiCard label="Phase 3 & future" value={state.flags.filter((f) => f.phase !== '2').length} icon={<FlaskConical className="h-5 w-5" />} tone="peach" hint="need medical/legal review" />
      </div>

      <Toolbar>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <SearchInput value={q} onChange={setQ} placeholder="Search flags…" className="sm:max-w-xs sm:flex-1" />
            <div className="sm:w-48">
              <FilterSelect label="Phase" value={phase} onChange={setPhase} options={[{ value: 'all', label: 'All phases' }, { value: '2', label: 'Phase 2' }, { value: '3', label: 'Phase 3' }, { value: 'Future', label: 'Future' }]} />
            </div>
          </div>
          <div className="min-w-0">
            <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">
              <Globe className="h-3.5 w-3.5" /> Environment
            </p>
            <div className="no-scrollbar max-w-full overflow-x-auto">
              <Segmented
                value={env}
                onChange={setEnv}
                options={[
                  { value: 'dev', label: 'Development' },
                  { value: 'staging', label: 'Staging' },
                  { value: 'prod', label: 'Production' },
                ]}
              />
            </div>
          </div>
        </div>
      </Toolbar>

      {env === 'prod' && (
        <Notice tone="warning" className="mb-6">
          Production changes affect real users. Phase 3 and future modules (fertility, pregnancy, menopause…) need medical/legal review before launch (§20, §63).
        </Notice>
      )}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : flags.length === 0 ? (
        <Card>
          <EmptyState icon={<ToggleRight className="h-6 w-6" />} title="No flags match" body="Try a different search or phase." />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {flags.map((f) => {
            const st = f.env[env];
            return (
              <Card key={f.key} className={cn('card-pad relative flex flex-col gap-5 overflow-hidden', st.enabled && 'ring-1 ring-green-200')}>
                <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1.5', st.enabled ? 'bg-green-500' : 'bg-ink-200')} />
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-display text-[17px] font-semibold text-ink-900">
                      {f.name}
                      <Badge tone={f.phase === '2' ? 'lavender' : f.phase === '3' ? 'peach' : 'gray'}>{f.phase === 'Future' ? 'Future' : `Phase ${f.phase}`}</Badge>
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-ink-400">{f.key}</p>
                    <p className="mt-2 text-sm leading-relaxed text-ink-600">{f.description}</p>
                  </div>
                  <Switch checked={st.enabled} onChange={(v) => requestToggle(f, v)} label={<span className="sr-only">Enable {f.name}</span>} />
                </div>
                <div className="rounded-2xl bg-ink-50/70 px-4 py-3">
                  <p className="mb-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">Rollout ({env})</p>
                  <RolloutSlider
                    flag={f}
                    env={env}
                    onCommit={(v) => {
                      dispatch({ type: 'UPDATE_FLAG', key: f.key, env, patch: { rollout: v }, by });
                      audit('flag.update', f.key, `${env} rollout ${st.rollout}% → ${v}%`);
                    }}
                  />
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4 text-xs text-ink-500">
                  {(['dev', 'staging', 'prod'] as Env[]).map((e) => (
                    <StatusPill key={e} tone={f.env[e].enabled ? 'green' : 'gray'} className={cn(e === env && 'ring-1 ring-green-300')}>
                      {e}: {f.env[e].enabled ? `${f.env[e].rollout}%` : 'off'}
                    </StatusPill>
                  ))}
                  <span className="w-full sm:ml-auto sm:w-auto">
                    Changed by {f.lastChangedBy} · {timeAgo(f.lastChangedAt)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && toggle(confirm, true)}
        title={`Enable ${confirm?.name} in production?`}
        body="This module is planned for a later phase. Confirm that medical, legal and privacy reviews are complete for your launch markets (§20, §68)."
        confirmLabel="Enable in production"
        danger
      />
    </>
  );
}
