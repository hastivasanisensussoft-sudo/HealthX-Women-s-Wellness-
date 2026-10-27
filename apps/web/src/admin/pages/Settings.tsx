import { useState, type ReactNode } from 'react';
import { Check, Database, Globe, KeyRound, Lock, RotateCcw, Save, ShieldCheck, Timer, UserCog, type LucideIcon } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Field, Input, Notice, Segmented, Select, Switch, useToast, type Tone } from '@/components/ui';
import { cn } from '@/lib/utils';
import { DEFAULT_SETTINGS, type AdminSettings } from '../adminData';
import { useAccess, useAdmin } from '../adminState';
import { AdminHeader, AdminHero, HeroStat, ReadOnlyBanner, SecurityNote } from '../components';

const RETENTION: { key: keyof AdminSettings['retention']; label: string; unit: string; options: number[] }[] = [
  { key: 'auditMonths', label: 'Audit log', unit: 'months', options: [12, 24, 84] },
  { key: 'deletedBackupDays', label: 'Backups after account deletion', unit: 'days', options: [30, 35, 90] },
  { key: 'supportMonths', label: 'Support requests', unit: 'months', options: [12, 24] },
  { key: 'analyticsMonths', label: 'Analytics events (pseudonymous)', unit: 'months', options: [13, 25] },
];

const DISC: Record<Tone, string> = {
  green: 'bg-green-100 text-green-700',
  rose: 'bg-rose-100 text-rose-600',
  lavender: 'bg-lavender-100 text-lavender-600',
  peach: 'bg-peach-100 text-peach-600',
  sky: 'bg-sky-100 text-sky-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  butter: 'bg-butter-100 text-butter-600',
};

function SettingsCard({ icon: Icon, tone, title, subtitle, action, children }: { icon: LucideIcon; tone: Tone; title: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="card-pad">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', DISC[tone])}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-[18px] font-semibold tracking-[-0.01em] text-ink-900">{title}</h2>
            <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function LockedRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-ink-50/70 px-4 py-3">
      <span>
        <span className="block text-sm font-semibold text-ink-800">{label}</span>
        <span className="mt-0.5 block text-sm text-ink-500">{detail}</span>
      </span>
      <Badge tone="green" icon={<Lock className="h-3 w-3" />}>
        Always on
      </Badge>
    </div>
  );
}

export default function Settings() {
  const { state, dispatch, audit, apiMode } = useAdmin();
  const { can } = useAccess();
  const toast = useToast();
  const editable = can('manage_settings');
  const [draft, setDraft] = useState<AdminSettings>(state.settings);
  const [resetOpen, setResetOpen] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.settings);
  const retentionSet = RETENTION.filter((r) => state.settings.retention[r.key] !== null).length;

  const save = () => {
    const changes: string[] = [];
    if (draft.sessionTimeoutMin !== state.settings.sessionTimeoutMin) changes.push(`session timeout ${state.settings.sessionTimeoutMin}→${draft.sessionTimeoutMin} min`);
    if (draft.environment !== state.settings.environment) changes.push(`environment ${state.settings.environment}→${draft.environment}`);
    if (draft.showEnvBanner !== state.settings.showEnvBanner) changes.push(`env banner ${draft.showEnvBanner ? 'on' : 'off'}`);
    if (draft.privacy.discreetDefault !== state.settings.privacy.discreetDefault) changes.push(`discreet default ${draft.privacy.discreetDefault ? 'on' : 'off'}`);
    RETENTION.forEach((r) => {
      if (draft.retention[r.key] !== state.settings.retention[r.key]) changes.push(`${r.label} retention → ${draft.retention[r.key] ?? 'not set'}`);
    });
    void dispatch({ type: 'UPDATE_SETTINGS', settings: draft }).then((next) => {
      if (next) toast.success('Settings saved', 'Change recorded in the audit log.');
      else setDraft(state.settings);
    });
    audit('settings.update', 'Admin settings', changes.join('; '));
  };

  return (
    <>
      <AdminHeader
        title="Admin settings"
        subtitle="Security, data retention, privacy defaults and environment. All changes are audited (§47)."
        actions={
          editable ? (
            <>
              {dirty && <Badge tone="warning">Unsaved changes</Badge>}
              {!apiMode && (
                <Button variant="outline" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setResetOpen(true)}>
                  Reset demo data
                </Button>
              )}
              <Button leftIcon={<Save className="h-4 w-4" />} disabled={!dirty} onClick={save}>
                Save changes
              </Button>
            </>
          ) : undefined
        }
      />
      {!editable && <ReadOnlyBanner>Read-only: changing security settings needs an Admin with the “Change security settings” permission.</ReadOnlyBanner>}

      <AdminHero
        eyebrow="Security posture · saved settings"
        title="Staff access is protected by default"
        aside={
          <div className="grid grid-cols-2 gap-3">
            <HeroStat icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Staff MFA" value="Required" hint="Every role (D-33)" />
            <HeroStat icon={<Timer className="h-3.5 w-3.5" />} label="Timeout" value={`${state.settings.sessionTimeoutMin} min`} hint="of inactivity" />
            <HeroStat icon={<Globe className="h-3.5 w-3.5" />} label="Environment" value={<span className="capitalize">{state.settings.environment}</span>} hint={state.settings.showEnvBanner ? 'Banner shown' : 'Banner hidden'} />
            <HeroStat icon={<Database className="h-3.5 w-3.5" />} label="Retention" value={`${retentionSet}/${RETENTION.length}`} hint="Pending legal review (D-20)" />
          </div>
        }
      >
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-green-50/85">
          MFA, opt-in analytics and private-by-default sharing can’t be switched off here. Timeouts, retention placeholders, privacy defaults and the environment label are editable by Admins who hold the security-settings permission.
        </p>
      </AdminHero>

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsCard icon={ShieldCheck} tone="green" title="Security" subtitle="SRS §47 minimum controls">
          <div className="space-y-5">
            <LockedRow label="MFA required for all staff" detail="Every staff role enrols in MFA before first access (§47, D-33). Can’t be disabled." />
            <div>
              <p className="label">Admin session timeout [ADD A-33]</p>
              <Segmented
                value={String(draft.sessionTimeoutMin) as '5' | '15' | '30'}
                onChange={(v) => editable && setDraft({ ...draft, sessionTimeoutMin: Number(v) as 5 | 15 | 30 })}
                options={[
                  { value: '5', label: '5 min' },
                  { value: '15', label: '15 min' },
                  { value: '30', label: '30 min' },
                ]}
              />
              <p className="mt-1.5 text-sm text-ink-500">Staff are signed out after this much inactivity. Applies to this demo’s session timer.</p>
            </div>
            <div>
              <p className="label">Staff password policy</p>
              <ul className="space-y-1.5 text-sm text-ink-600">
                {[`Minimum ${draft.passwordMinLength} characters, passphrases encouraged`, 'Checked against known-breached passwords', 'Rate-limited sign-in with temporary lockout (§47)', 'No forced periodic rotation; reset on suspected compromise'].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                      <Check className="h-3 w-3" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-xs text-ink-400">Display only — enforced by the auth service.</p>
            </div>
            <Field label="Admin IP allow-list" htmlFor="ip-allow" hint="Placeholder — configured in infrastructure (AWS WAF), not in the app.">
              <Input id="ip-allow" value="Managed by infrastructure" disabled readOnly leftIcon={<KeyRound className="h-4 w-4" />} />
            </Field>
          </div>
        </SettingsCard>

        <SettingsCard icon={Database} tone="sky" title="Data retention" subtitle="Required by §42/§68; periods not yet decided" action={<Badge tone="warning">Placeholder · D-20</Badge>}>
          <div className="grid gap-4">
            {RETENTION.map((r) => (
              <Field key={r.key} label={r.label} htmlFor={`ret-${r.key}`}>
                <Select
                  id={`ret-${r.key}`}
                  disabled={!editable}
                  value={draft.retention[r.key] === null ? '' : String(draft.retention[r.key])}
                  onChange={(e) => setDraft({ ...draft, retention: { ...draft.retention, [r.key]: e.target.value === '' ? null : Number(e.target.value) } })}
                >
                  <option value="">Not set — pending legal review</option>
                  {r.options.map((o) => (
                    <option key={o} value={o}>
                      {o} {r.unit}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>
          <Notice tone="info" className="mt-5">
            Values here are placeholders for the decision log (D-20 / [ADD A-34]). Deletion of user data on request is immediate regardless of these settings.
          </Notice>
        </SettingsCard>

        <SettingsCard icon={UserCog} tone="lavender" title="Privacy defaults for new users" subtitle="Privacy by design (§5, §68)">
          <div className="space-y-4">
            <div className="rounded-2xl border border-ink-100 px-4 py-3">
              <Switch
                checked={draft.privacy.discreetDefault}
                disabled={!editable}
                onChange={(v) => setDraft({ ...draft, privacy: { ...draft.privacy, discreetDefault: v } })}
                label="Discreet notifications on by default [ADD A-08]"
                description="Lock-screen text becomes “You have a new HealthX reminder.” Users can change it any time."
              />
            </div>
            <LockedRow label="Analytics is opt-in only" detail="Explicit consent before any product analytics (§42, §68)." />
            <LockedRow label="AI personalisation off by default" detail="Users must opt in per data category (§35)." />
            <LockedRow label="Health integrations off by default" detail="Only requested permissions, only after consent (§43)." />
          </div>
        </SettingsCard>

        <SettingsCard icon={Globe} tone="peach" title="Environment" subtitle="Helps staff avoid acting in the wrong environment">
          <div className="space-y-5">
            <Field label="Environment label" htmlFor="env">
              <Select id="env" disabled={!editable} value={draft.environment} onChange={(e) => setDraft({ ...draft, environment: e.target.value as AdminSettings['environment'] })}>
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </Select>
            </Field>
            <div className="rounded-2xl border border-ink-100 px-4 py-3">
              <Switch
                checked={draft.showEnvBanner}
                disabled={!editable}
                onChange={(v) => setDraft({ ...draft, showEnvBanner: v })}
                label="Show environment banner"
                description="A coloured strip above the admin header (production shows in rose)."
              />
            </div>
            <div>
              <p className="mb-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">Banner preview</p>
              <div
                className={cn(
                  'rounded-xl px-4 py-1.5 text-center font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]',
                  !draft.showEnvBanner ? 'bg-ink-100 text-ink-400' : draft.environment === 'production' ? 'bg-rose-500 text-white' : draft.environment === 'staging' ? 'bg-butter-300 text-green-950' : 'bg-sky-500 text-white',
                )}
              >
                {draft.showEnvBanner ? `${draft.environment} environment · demo data` : 'Banner hidden'}
              </div>
            </div>
          </div>
        </SettingsCard>
      </div>

      <SecurityNote className="mt-6" />

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          dispatch({ type: 'RESET' });
          setDraft(DEFAULT_SETTINGS);
          audit('settings.reset_demo', 'Admin demo data');
          toast.success('Admin demo data reset', 'Content, users, support, campaigns and permissions restored.');
        }}
        title="Reset admin demo data?"
        body="Restores the seeded content, users, support queue, campaigns, flags and permission matrix. Your session stays signed in."
        confirmLabel="Reset"
        danger
      />
    </>
  );
}
