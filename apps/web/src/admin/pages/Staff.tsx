import { Fragment, useState } from 'react';
import { Check, FilePen, KeyRound, Lock, Mail, Minus, RotateCcw, ShieldCheck, ShieldPlus, Stethoscope, UserCheck, UserCog, UserPlus, UserRound, Users, UserX, type LucideIcon } from 'lucide-react';
import { timeAgo } from '@healthx/shared';
import { Avatar } from '@/components/brand/Brand';
import { Badge, Button, Card, Checkbox, ConfirmDialog, EmptyState, Field, Input, Modal, Notice, Select, useToast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAccess, useAdmin } from '../adminState';
import type { StaffMember } from '../adminData';
import { AdminHeader, ReadOnlyBanner, RoleBadge, RowActions, SecurityNote, StatusPill, TableShell, Th } from '../components';
import {
  ALL_CAPABILITIES,
  ALL_ROLES,
  CAPABILITY_META,
  CLINICAL_CAPABILITIES,
  canWith,
  isLockedCell,
  isPrivileged,
  PRIVILEGED_CAPABILITIES,
  ROLE_META,
  STAFF_ROLES,
  type Capability,
  type PrivilegedCapability,
  type StaffRole,
} from '../rbac';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GROUPS = [...new Set(ALL_CAPABILITIES.map((c) => CAPABILITY_META[c].group))];
const STATUS: Record<StaffMember['status'], { label: string; tone: 'mint' | 'gray' | 'danger' }> = {
  active: { label: 'Active', tone: 'mint' },
  invited: { label: 'Invited', tone: 'gray' },
  deactivated: { label: 'Deactivated', tone: 'danger' },
};
const PRIV_SHORT: Record<PrivilegedCapability, string> = {
  manage_staff: 'Manage staff',
  manage_permissions: 'Edit permissions',
  manage_settings: 'Security settings',
  break_glass: 'Break-glass',
};
const ROLE_LOOK: Record<StaffRole, { icon: LucideIcon; disc: string; ring: string; dot: string }> = {
  end_user: { icon: UserRound, disc: 'bg-ink-100 text-ink-600', ring: 'ring-ink-200', dot: 'bg-ink-400' },
  content_manager: { icon: FilePen, disc: 'bg-sky-100 text-sky-700', ring: 'ring-sky-200', dot: 'bg-sky-500' },
  medical_content_reviewer: { icon: Stethoscope, disc: 'bg-lavender-100 text-lavender-700', ring: 'ring-lavender-200', dot: 'bg-lavender-500' },
  admin: { icon: ShieldCheck, disc: 'bg-green-100 text-green-700', ring: 'ring-green-200', dot: 'bg-green-600' },
};

/** Why a locked matrix cell can't change. */
const lockReason = (role: StaffRole, cap: Capability) =>
  role === 'end_user'
    ? 'End Users never get admin access.'
    : CLINICAL_CAPABILITIES.includes(cap)
      ? 'Clinical sign-off stays with Medical Content Reviewers (§6.3, §40).'
      : 'Admins always keep access to the Web Admin.';

export default function Staff() {
  const { state, dispatch, audit, apiMode } = useAdmin();
  const { can, permissions, privileges: myPrivileges } = useAccess();
  const toast = useToast();
  const me = state.session!;
  const canManageStaff = can('manage_staff');
  const canEditMatrix = can('manage_permissions');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; role: StaffRole }>({ name: '', email: '', role: 'content_manager' });
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [pending, setPending] = useState<{ member: StaffMember; role: StaffRole } | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [roleFor, setRoleFor] = useState<StaffMember | null>(null);
  const [roleDraft, setRoleDraft] = useState<StaffRole>('content_manager');
  const [statusFor, setStatusFor] = useState<StaffMember | null>(null);
  const [privFor, setPrivFor] = useState<StaffMember | null>(null);
  const [privDraft, setPrivDraft] = useState<PrivilegedCapability[]>([]);
  const [roleFilter, setRoleFilter] = useState<StaffRole | 'all'>('all');
  const shown = roleFilter === 'all' ? state.staff : state.staff.filter((m) => m.role === roleFilter);
  // Same rule as the API: you can't change someone who holds privileged permissions you don't hold.
  const canTouch = (m: StaffMember) => (m.privileges ?? []).every((p) => myPrivileges.includes(p));
  const holders = (p: PrivilegedCapability) => state.staff.filter((m) => m.role === 'admin' && m.status === 'active' && (m.privileges ?? []).includes(p));

  const invite = () => {
    const e: typeof errors = {};
    if (form.name.trim().length < 2) e.name = 'Enter the person’s full name.';
    else if (state.staff.some((m) => m.name.trim().toLowerCase() === form.name.trim().toLowerCase())) e.name = 'Another staff member already has this name — add a surname or an initial.';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address.';
    else if (state.staff.some((m) => m.email.toLowerCase() === form.email.trim().toLowerCase())) e.email = 'This email already has a staff account.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const member: StaffMember = { id: `st_${Date.now().toString(36)}`, name: form.name.trim(), email: form.email.trim(), role: form.role, privileges: [], mfaEnabled: false, status: 'invited', lastLogin: null };
    void dispatch({ type: 'INVITE_STAFF', member }).then((ok) => {
      if (!ok) return;
      toast.success(
        apiMode ? 'Invitation sent' : 'Invitation sent (simulated)',
        apiMode
          ? `${member.email} sets a password and enrols in MFA from the invite link.${import.meta.env.DEV ? ' Development: the link is in the dev outbox (/api/v1/dev/outbox).' : ''}`
          : `${member.email} must enrol in MFA on first sign-in.`,
      );
      setInviteOpen(false);
      setForm({ name: '', email: '', role: 'content_manager' });
    });
    audit('staff.invite', member.email, `Role: ${ROLE_META[member.role].label}`);
  };

  const toggleCell = (role: StaffRole, cap: Capability) => {
    const granted = !canWith(permissions, role, cap);
    void dispatch({ type: 'SET_PERMISSION', role, cap, granted }).then(
      (ok) =>
        ok &&
        toast.info(
          `${ROLE_META[role].label}: ${CAPABILITY_META[cap].label} ${granted ? 'granted' : 'revoked'}`,
          apiMode ? 'Saved on the server — it applies to that role’s next request.' : 'Offline demo — this matrix is not enforced.',
        ),
    );
    audit('permission.update', ROLE_META[role].label, `${CAPABILITY_META[cap].label}: ${granted ? 'granted' : 'revoked'}`);
  };

  const setStatus = (m: StaffMember) => {
    const deactivate = m.status !== 'deactivated';
    void dispatch({ type: 'UPDATE_STAFF', id: m.id, patch: { status: deactivate ? 'deactivated' : 'active' } }).then((next) => {
      if (!next) return;
      const after = next.staff.find((x) => x.id === m.id)?.status;
      if (deactivate) toast.success('Staff member deactivated', `${m.name} was signed out everywhere and their invite links stopped working.`);
      else toast.success('Staff member reactivated', after === 'invited' ? `${m.name} hadn’t finished setting up, so a new invitation was sent.` : `${m.name} can sign in again.`);
    });
    audit(deactivate ? 'staff.deactivate' : 'staff.reactivate', m.name);
  };

  const savePrivileges = () => {
    if (!privFor) return;
    const m = privFor;
    void dispatch({ type: 'UPDATE_STAFF', id: m.id, patch: { privileges: privDraft } }).then(
      (ok) => ok && toast.success('Privileged permissions updated', privDraft.length ? `${m.name}: ${privDraft.map((p) => PRIV_SHORT[p]).join(', ')}.` : `${m.name} now has none.`),
    );
    audit('staff.privileges', m.name, privDraft.join(', ') || 'none');
    setPrivFor(null);
  };

  /** Why a matrix cell can't be edited by this person (the API gives the same answers). */
  const cellBlock = (role: StaffRole): string | null => (apiMode && role === me.role ? 'You can’t change the permissions of your own role.' : null);

  return (
    <>
      <AdminHeader
        title="Staff & permissions"
        subtitle="Four roles from SRS §6 — End User, Content Manager, Medical Content Reviewer and Admin. MFA is required for every staff account (D-33)."
        actions={
          canManageStaff ? (
            <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
              Invite staff
            </Button>
          ) : undefined
        }
      />
      {!canManageStaff && <ReadOnlyBanner>Read-only: inviting staff and changing roles or privileged permissions needs an Admin with the “Manage staff” permission.</ReadOnlyBanner>}

      <section aria-label="Roles" className="mb-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-1.5">SRS §6.1–§6.4</p>
            <h2 className="font-display text-[20px] font-semibold tracking-[-0.015em] text-ink-900">Four roles</h2>
          </div>
          {roleFilter !== 'all' && (
            <button type="button" onClick={() => setRoleFilter('all')} className="text-sm font-semibold text-green-700 hover:text-green-900 hover:underline">
              Show all staff
            </button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ALL_ROLES.map((r) => {
            const look = ROLE_LOOK[r];
            const members = state.staff.filter((m) => m.role === r);
            const active = members.filter((m) => m.status === 'active').length;
            const on = roleFilter === r;
            const isStaffRole = r !== 'end_user';
            const body = (
              <>
                <span className="flex items-start justify-between gap-3">
                  <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', look.disc)}>
                    <look.icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-400">{ROLE_META[r].srs}</span>
                </span>
                <span className="mt-4 block font-display text-[16px] font-semibold leading-tight text-ink-900">{ROLE_META[r].label}</span>
                <span className="mt-1 line-clamp-3 text-[13px] leading-snug text-ink-500" title={ROLE_META[r].description}>
                  {ROLE_META[r].description}
                </span>
                <span className="mt-auto flex items-center gap-2 pt-4 text-xs font-semibold text-ink-600">
                  <span className={cn('h-2 w-2 rounded-full', look.dot)} />
                  {isStaffRole ? `${members.length} ${members.length === 1 ? 'person' : 'people'} · ${active} active` : 'App users · no admin access'}
                </span>
              </>
            );
            const cls = cn('card flex h-full flex-col items-stretch justify-start p-5 text-left transition', on && cn('ring-2', look.ring));
            return isStaffRole ? (
              <button key={r} type="button" aria-pressed={on} onClick={() => setRoleFilter(on ? 'all' : r)} className={cn(cls, 'hover:-translate-y-0.5 hover:shadow-lift')} title={on ? 'Show all staff' : `Show only ${ROLE_META[r].label} staff`}>
                {body}
              </button>
            ) : (
              <div key={r} className={cn(cls, 'bg-ink-50/40')}>
                {body}
              </div>
            );
          })}
        </div>
      </section>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1.5">Staff accounts</p>
          <h2 className="font-display text-[20px] font-semibold tracking-[-0.015em] text-ink-900">{roleFilter === 'all' ? 'Everyone with Web Admin access' : `${ROLE_META[roleFilter].label} staff`}</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 ring-1 ring-ink-100">
          <Users className="h-3.5 w-3.5 text-green-700" /> {shown.length} of {state.staff.length}
        </span>
      </div>
      <Card className="mb-8 overflow-hidden">
        <TableShell minWidth={900}>
          <thead>
            <tr>
              <Th>Staff member</Th>
              <Th>Role</Th>
              <Th>Privileged permissions</Th>
              <Th>Status · MFA</Th>
              <Th>Last sign-in</Th>
              <Th className="w-12">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState compact icon={<Users className="h-5 w-5" />} title="No staff in this role" body="Invite someone or show all staff." />
                </td>
              </tr>
            )}
            {shown.map((m) => {
              const isMe = m.email.toLowerCase() === me.email.toLowerCase();
              const privs = m.privileges ?? [];
              return (
                <tr key={m.id}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <Avatar name={m.name} size={38} />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink-900">
                          {m.name} {isMe && <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[11px] font-semibold text-green-800">(you)</span>}
                        </span>
                        <span className="block text-xs text-ink-500">{m.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={m.role} />
                  </td>
                  <td className="px-4 py-3">
                    {m.role !== 'admin' ? (
                      <span className="text-xs text-ink-400">—</span>
                    ) : privs.length ? (
                      <span className="flex flex-wrap gap-1">
                        {privs.map((p) => (
                          <Badge key={p} tone="dark" icon={<KeyRound className="h-3 w-3" />}>
                            {PRIV_SHORT[p]}
                          </Badge>
                        ))}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-ink-500">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={(STATUS[m.status] ?? STATUS.invited).tone}>{(STATUS[m.status] ?? STATUS.invited).label}</StatusPill>
                    <span className={cn('mt-1.5 flex items-center gap-1 whitespace-nowrap text-[11.5px] font-medium', m.mfaEnabled ? 'text-green-700' : 'text-warning')}>
                      <ShieldCheck className="h-3 w-3" /> {m.mfaEnabled ? 'MFA enabled' : 'MFA setup pending'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-600">{m.lastLogin ? timeAgo(m.lastLogin) : 'Never'}</td>
                  <td className="px-2 py-3">
                    <RowActions
                      label={m.name}
                      actions={[
                        canManageStaff && !isMe && canTouch(m) && { label: 'Change role…', icon: UserCog, onSelect: () => { setRoleFor(m); setRoleDraft(m.role); } },
                        canManageStaff && !isMe && canTouch(m) && m.role === 'admin' && { label: 'Privileged permissions…', icon: ShieldPlus, onSelect: () => { setPrivFor(m); setPrivDraft(privs); } },
                        canManageStaff && !isMe && canTouch(m) && m.status !== 'deactivated' && { label: 'Deactivate…', icon: UserX, danger: true, onSelect: () => setStatusFor(m) },
                        canManageStaff && canTouch(m) && m.status === 'deactivated' && { label: 'Reactivate…', icon: UserCheck, onSelect: () => setStatusFor(m) },
                        !apiMode && canManageStaff && m.status === 'invited' && { label: 'Resend invitation', icon: Mail, onSelect: () => { audit('staff.invite_resent', m.email); toast.success('Invitation re-sent (simulated)', m.email); } },
                        !apiMode && canManageStaff && !isMe && m.mfaEnabled && { label: 'Reset MFA enrolment', icon: KeyRound, danger: true, onSelect: () => { dispatch({ type: 'UPDATE_STAFF', id: m.id, patch: { mfaEnabled: false } }); audit('staff.mfa_reset', m.name); toast.info('MFA reset', `${m.name} must re-enrol at next sign-in.`); } },
                        { label: 'View permissions', icon: ShieldCheck, onSelect: () => document.getElementById('permission-matrix')?.scrollIntoView({ behavior: 'smooth' }) },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      </Card>

      <section id="permission-matrix" className="scroll-mt-28">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow mb-1.5">Roles & permissions · §47</p>
            <h2 className="font-display text-[20px] font-semibold tracking-[-0.015em] text-ink-900">Permission matrix</h2>
            <p className="mt-1 text-sm text-ink-500">{canEditMatrix ? 'Click a cell to grant or revoke (audited).' : 'Read-only — editing needs the “Edit the permission matrix” permission.'}</p>
          </div>
          {canEditMatrix ? (
            <Button size="sm" variant="outline" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setResetOpen(true)}>
              Reset defaults
            </Button>
          ) : (
            <Badge tone="gray" icon={<Lock className="h-3 w-3" />}>
              Read-only
            </Badge>
          )}
        </div>
      <Card className="card-pad">
        {apiMode ? (
          <Notice tone="info" className="mb-5">
            Changes are saved on the HealthX API, which checks this matrix on every request (§47). Nobody can change their own role’s permissions. Privileged permissions are never given to a role — they’re held by individual Admins (staff list → Privileged permissions…).
          </Notice>
        ) : (
          <Notice tone="warning" className="mb-5">
            <strong>Mock permissions.</strong> These toggles change what this demo UI shows — they are not security. The HealthX API enforces the real matrix server-side on every request (§47).
          </Notice>
        )}
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white">
              <Check className="h-3 w-3" />
            </span>
            Allowed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-100 text-ink-400">
              <Minus className="h-3 w-3" />
            </span>
            Not allowed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-100 text-ink-400">
              <Lock className="h-3 w-3" />
            </span>
            Locked
          </span>
          <span className="inline-flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-ink-400" /> Held per Admin
          </span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-ink-100">
        <TableShell minWidth={760}>
          <thead>
            <tr>
              <Th>Capability</Th>
              {ALL_ROLES.map((r) => (
                <Th key={r} className="text-center">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn('h-2 w-2 rounded-full', ROLE_LOOK[r].dot)} />
                    {ROLE_META[r].short}
                  </span>
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <Fragment key={g}>
                <tr>
                  <td colSpan={ALL_ROLES.length + 1} className="bg-green-50/70 px-4 py-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-green-800">
                    {g}
                  </td>
                </tr>
                {ALL_CAPABILITIES.filter((c) => CAPABILITY_META[c].group === g).map((c) => (
                  <tr key={c}>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-ink-800">{CAPABILITY_META[c].label}</span> <span className="font-mono text-[11px] text-ink-400">{CAPABILITY_META[c].srs}</span>
                    </td>
                    {isPrivileged(c) ? (
                      <td colSpan={ALL_ROLES.length} className="px-4 py-2.5 text-sm text-ink-600">
                        <span className="inline-flex items-center gap-1.5">
                          <KeyRound className="h-3.5 w-3.5 text-ink-400" />
                          Per Admin: {holders(c).map((m) => m.name).join(', ') || 'nobody'}
                        </span>
                      </td>
                    ) : (
                      ALL_ROLES.map((r) => {
                        const on = canWith(permissions, r, c);
                        const locked = isLockedCell(r, c);
                        const blocked = canEditMatrix && !locked ? cellBlock(r) : null;
                        const editable = canEditMatrix && !locked && !blocked;
                        const label = `${ROLE_META[r].label} — ${CAPABILITY_META[c].label}: ${on ? 'allowed' : 'not allowed'}${locked ? ' (locked)' : ''}`;
                        return (
                          <td key={r} className="px-2 py-2 text-center">
                            <button
                              type="button"
                              disabled={!editable}
                              aria-pressed={on}
                              aria-label={label}
                              title={locked ? lockReason(r, c) : (blocked ?? label)}
                              onClick={() => toggleCell(r, c)}
                              className={cn(
                                'inline-flex h-8 w-8 items-center justify-center rounded-full transition',
                                on ? (locked ? 'bg-green-100 text-green-700' : 'bg-green-600 text-white shadow-soft') : 'bg-ink-100 text-ink-400',
                                editable && 'hover:ring-2 hover:ring-green-400 hover:ring-offset-1',
                                !editable && 'cursor-default',
                              )}
                            >
                              {locked && !on ? <Lock className="h-3.5 w-3.5" /> : on ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                            </button>
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </TableShell>
        </div>
        <div className="mt-5 space-y-2">
          <p className="text-xs leading-relaxed text-ink-500">
            The four roles come from SRS §6.1–§6.4. Former Super Admin, Support Agent and Analyst accounts are Admins now; the former Super Admin powers are per-person privileged permissions. Compliance approval belongs to Admins (D-08 option B), and clinical sign-off is fixed to Medical Content Reviewers.
          </p>
          <SecurityNote />
        </div>
      </Card>
      </section>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite staff member"
        description="They’ll receive an email invitation and must enrol in MFA before first access. New staff never start with privileged permissions."
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={invite}>Send invitation</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Full name" required htmlFor="inv-name" error={errors.name}>
            <Input id="inv-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} />
          </Field>
          <Field label="Work email" required htmlFor="inv-email" error={errors.email}>
            <Input id="inv-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} invalid={!!errors.email} placeholder="name@healthx.example" />
          </Field>
          <Field label="Role" htmlFor="inv-role" hint={ROLE_META[form.role].description}>
            <Select id="inv-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_META[r].label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!privFor}
        onClose={() => setPrivFor(null)}
        size="sm"
        title="Privileged permissions"
        description={privFor ? `${privFor.name} · Admin. You can only grant or remove permissions you hold yourself.` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPrivFor(null)}>
              Cancel
            </Button>
            <Button onClick={savePrivileges}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          {PRIVILEGED_CAPABILITIES.map((p) => {
            const mine = myPrivileges.includes(p);
            return (
              <Checkbox
                key={p}
                checked={privDraft.includes(p)}
                disabled={!mine}
                onChange={(v) => setPrivDraft((d) => (v ? [...d, p] : d.filter((x) => x !== p)))}
                label={
                  <span>
                    <span className="font-semibold text-ink-900">{CAPABILITY_META[p].label}</span>
                    {!mine && <span className="block text-xs text-ink-400">You don’t hold this permission, so you can’t change it.</span>}
                  </span>
                }
              />
            );
          })}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          const { member, role } = pending;
          void dispatch({ type: 'UPDATE_STAFF', id: member.id, patch: { role } }).then((ok) => ok && toast.success('Role updated', `${member.name} is now ${ROLE_META[role].label}.`));
          audit('staff.role_change', member.name, `${ROLE_META[member.role].label} → ${ROLE_META[role].label}`);
        }}
        title="Change role?"
        body={
          pending ? (
            <>
              {pending.member.name}: <strong>{ROLE_META[pending.member.role].label}</strong> → <strong>{ROLE_META[pending.role].label}</strong>. Access changes immediately and the change is audited.
              {pending.member.role === 'admin' && (pending.member.privileges ?? []).length > 0 && ' Their privileged permissions are removed with the Admin role.'}
            </>
          ) : null
        }
        confirmLabel="Change role"
      />
      <Modal
        open={!!roleFor}
        onClose={() => setRoleFor(null)}
        size="sm"
        title="Change role"
        description={roleFor ? `${roleFor.name} · currently ${ROLE_META[roleFor.role].label}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRoleFor(null)}>
              Cancel
            </Button>
            <Button
              disabled={!roleFor || roleDraft === roleFor.role}
              onClick={() => {
                if (roleFor) setPending({ member: roleFor, role: roleDraft });
                setRoleFor(null);
              }}
            >
              Continue
            </Button>
          </>
        }
      >
        <Field label="New role" htmlFor="role-draft" hint={ROLE_META[roleDraft].description}>
          <Select id="role-draft" value={roleDraft} onChange={(e) => setRoleDraft(e.target.value as StaffRole)}>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_META[r].label}
              </option>
            ))}
          </Select>
        </Field>
      </Modal>
      <ConfirmDialog
        open={!!statusFor}
        onClose={() => setStatusFor(null)}
        onConfirm={() => statusFor && setStatus(statusFor)}
        title={statusFor?.status === 'deactivated' ? 'Reactivate this staff member?' : 'Deactivate this staff member?'}
        body={
          statusFor?.status === 'deactivated'
            ? `${statusFor.name} gets their access back. If they never finished setting up their account, a new invitation is sent.`
            : `${statusFor?.name ?? ''} is signed out on every device right away, outstanding invite links stop working, and they can’t sign in until reactivated. The change is audited.`
        }
        confirmLabel={statusFor?.status === 'deactivated' ? 'Reactivate' : 'Deactivate'}
        danger={statusFor?.status !== 'deactivated'}
      />
      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          void dispatch({ type: 'RESET_PERMISSIONS' }).then((ok) => ok && toast.success('Permission matrix reset to defaults'));
          audit('permission.reset', 'Permission matrix', 'Restored defaults');
        }}
        title="Reset permission matrix?"
        body="Every role returns to its default capabilities. Individual Admins keep their privileged permissions."
        confirmLabel="Reset"
      />
    </>
  );
}
