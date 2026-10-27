/**
 * Server-side content lifecycle (SRS §39/§40): Draft → Medical review → Compliance → Approved →
 * Scheduled/Published → Archived, with "changes requested" and "rejected" loops. The client may
 * propose an item; the server decides whether the transition is legal for this actor and enforces
 * separation of duties: nobody approves a version they wrote or edited, and the medical and the
 * compliance approval come from two different people. The reviewer name, safety checklist gate,
 * version snapshots, history and audit are written by the server, never taken from the request.
 */
import { LIFE_STAGES, todayISO, type ContentType, type LifeStage } from '@healthx/shared';
import type { Capability, ContentItem, ContentVersion, HistoryEntry, MediaFile, WorkflowStatus } from '@healthx/shared/admin';
import { SAFETY_CHECKLIST } from '@healthx/shared/admin';
import type { AuthInfo } from './auth';
import { badRequest, conflict, forbidden } from './http';
import type { Store } from './store';
import { arr, bool, num, obj, oneOf, optStr, str } from './validate';

export const EDITABLE: WorkflowStatus[] = ['draft', 'changes_requested', 'rejected'];
const STATUSES: WorkflowStatus[] = ['draft', 'medical_review', 'changes_requested', 'compliance_review', 'approved', 'scheduled', 'published', 'archived', 'rejected'];
const TYPES: readonly ContentType[] = ['article', 'video', 'infographic', 'faq', 'podcast', 'program'];
const STAGES = LIFE_STAGES.map((l) => l.key);
/** Editorial fields — editable only while the item is a draft/returned, or as a new version. */
const CONTENT_FIELDS = ['title', 'description', 'type', 'category', 'topic', 'tags', 'durationMin', 'lifeStage', 'language', 'body', 'media'] as const;
const CHECK_KEYS = SAFETY_CHECKLIST.map((s) => s.key);
const MAX_ITEMS = 2000;
const MAX_VERSIONS = 60;
const MAX_HISTORY = 500;

interface Rule {
  from: WorkflowStatus[];
  to: WorkflowStatus;
  caps: Capability[];
  action: string;
  audit: string;
  /** The actor must not have written or edited this version. */
  noSelf?: boolean;
  /** The actor must not be the person who gave this version's medical approval. */
  secondApprover?: boolean;
  needsNote?: boolean;
  newVersion?: boolean;
  safetyGate?: boolean;
}

const RULES: Rule[] = [
  { from: ['draft', 'changes_requested', 'rejected'], to: 'medical_review', caps: ['edit_content'], action: 'Submitted for medical review', audit: 'content.submit_review' },
  { from: ['published', 'approved', 'scheduled', 'archived', 'compliance_review'], to: 'medical_review', caps: ['edit_content'], action: 'New version submitted for medical review', audit: 'content.new_version', newVersion: true },
  { from: ['medical_review'], to: 'compliance_review', caps: ['medical_review'], action: 'Medical review approved', audit: 'content.medical_approve', noSelf: true, safetyGate: true },
  { from: ['medical_review'], to: 'changes_requested', caps: ['medical_review'], action: 'Requested changes', audit: 'content.request_changes', needsNote: true },
  { from: ['medical_review'], to: 'rejected', caps: ['medical_review'], action: 'Rejected', audit: 'content.reject', needsNote: true },
  { from: ['compliance_review'], to: 'approved', caps: ['compliance_review'], action: 'Compliance approved', audit: 'content.compliance_approve', noSelf: true, secondApprover: true, safetyGate: true },
  { from: ['compliance_review'], to: 'published', caps: ['compliance_review', 'publish_content'], action: 'Compliance approved · Published', audit: 'content.compliance_publish', noSelf: true, secondApprover: true, safetyGate: true },
  { from: ['compliance_review'], to: 'scheduled', caps: ['compliance_review', 'publish_content'], action: 'Compliance approved · Scheduled publication', audit: 'content.compliance_schedule', noSelf: true, secondApprover: true, safetyGate: true },
  { from: ['compliance_review'], to: 'changes_requested', caps: ['compliance_review'], action: 'Returned by compliance', audit: 'content.compliance_return', needsNote: true },
  { from: ['approved', 'scheduled'], to: 'published', caps: ['publish_content'], action: 'Published', audit: 'content.publish' },
  { from: ['approved'], to: 'scheduled', caps: ['publish_content'], action: 'Scheduled publication', audit: 'content.schedule' },
  { from: ['scheduled'], to: 'approved', caps: ['publish_content'], action: 'Cancelled schedule', audit: 'content.unschedule' },
  { from: ['draft', 'changes_requested', 'rejected', 'approved', 'scheduled', 'published'], to: 'archived', caps: ['publish_content'], action: 'Archived', audit: 'content.archive' },
  { from: ['archived'], to: 'draft', caps: ['edit_content'], action: 'Restored to draft', audit: 'content.restore' },
];

export const allowedTransitions = (from: WorkflowStatus) => RULES.filter((r) => r.from.includes(from)).map((r) => r.to);

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const noChecks = () => Object.fromEntries(CHECK_KEYS.map((k) => [k, false]));
const sameChecks = (a: Record<string, boolean>, b: Record<string, boolean>) => CHECK_KEYS.every((k) => !!a[k] === !!b[k]);

/** The fields a client may propose — everything else (author, reviewer, dates, history, versions) is server-owned. */
interface Proposal {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  category: string;
  topic?: string;
  tags?: string[];
  durationMin?: number | null;
  lifeStage: LifeStage;
  language: string;
  body: string;
  media: MediaFile | null;
  references: string[];
  status: WorkflowStatus;
  version: number;
  scheduledFor: string | null;
  safetyChecks?: Record<string, boolean>;
  /** A reviewer comment added as the last client history entry, if any. */
  history: unknown[];
}

function validateItem(raw: unknown): Proposal {
  const c = obj(raw, 'item');
  if (JSON.stringify(c).length > 400_000) throw badRequest('Item is too large.');
  const id = str(c.id, 'item.id', 1, 100);
  if (!/^[\w-]+$/.test(id)) throw badRequest('item.id may only contain letters, digits, “_” and “-”.');
  let media: MediaFile | null = null;
  if (c.media !== null && c.media !== undefined) {
    const m = obj(c.media, 'item.media', ['name', 'size', 'type']);
    media = { name: str(m.name, 'item.media.name', 1, 120), size: num(m.size, 'item.media.size', 0, 500 * 1024 * 1024, true), type: str(m.type, 'item.media.type', 1, 60) };
  }
  let safetyChecks: Record<string, boolean> | undefined;
  if (c.safetyChecks !== undefined) {
    const sc = obj(c.safetyChecks, 'item.safetyChecks', CHECK_KEYS);
    safetyChecks = Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, bool(v, `item.safetyChecks.${k}`)]));
  }
  if (c.scheduledFor !== null && c.scheduledFor !== undefined && (typeof c.scheduledFor !== 'string' || c.scheduledFor.length > 40 || Number.isNaN(Date.parse(c.scheduledFor)))) {
    throw badRequest('item.scheduledFor must be a date-time.');
  }
  return {
    id,
    title: str(c.title, 'item.title', 3, 200),
    description: c.description === undefined ? '' : str(c.description, 'item.description', 0, 600),
    type: oneOf(c.type, 'item.type', TYPES),
    category: str(c.category, 'item.category', 1, 60),
    topic: optStr(c.topic, 'item.topic', 80),
    tags: c.tags === undefined ? undefined : arr(c.tags, 'item.tags', 12).map((t, i) => str(t, `item.tags[${i}]`, 1, 40)),
    durationMin: c.durationMin === undefined || c.durationMin === null ? (c.durationMin as null | undefined) : num(c.durationMin, 'item.durationMin', 1, 600, true),
    lifeStage: oneOf(c.lifeStage, 'item.lifeStage', STAGES),
    language: str(c.language, 'item.language', 1, 40),
    body: c.body === undefined ? '' : str(c.body, 'item.body', 0, 50_000),
    references: arr(c.references ?? [], 'item.references', 30).map((r, i) => str(r, `item.references[${i}]`, 1, 600)),
    media,
    status: oneOf(c.status, 'item.status', STATUSES),
    version: num(c.version, 'item.version', 1, 10_000, true),
    scheduledFor: typeof c.scheduledFor === 'string' ? c.scheduledFor : null,
    safetyChecks,
    history: Array.isArray(c.history) ? c.history : [],
  };
}

/** The note of a newly added client history entry (reviewer comment), if any. */
function newNote(existing: ContentItem, incoming: Proposal): string | undefined {
  if (incoming.history.length <= existing.history.length) return undefined;
  const last = incoming.history[incoming.history.length - 1];
  const n = last && typeof last === 'object' ? (last as { note?: unknown }).note : undefined;
  return typeof n === 'string' && n.trim() ? n.trim().slice(0, 1000) : undefined;
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Wrote the item, or wrote/edited the version now under review. */
function isContributor(store: Store, item: ContentItem, auth: AuthInfo) {
  if (store.contentContributors.get(item.id)?.has(auth.account.id)) return true;
  const authorId = store.contentAuthors.get(item.id);
  return authorId ? authorId === auth.account.id : sameName(item.author, auth.account.name);
}

function isMedicalApprover(store: Store, item: ContentItem, auth: AuthInfo) {
  const id = store.contentMedicalApprover.get(item.id);
  // Seeded items have no approver id — fall back to the recorded reviewer name.
  return id ? id === auth.account.id : !!item.medicalReviewer && sameName(item.medicalReviewer, auth.account.name);
}

function snapshot(item: ContentItem): ContentVersion {
  const last = [...item.history].reverse().find((h) => h.version === item.version);
  return { version: item.version, title: item.title, description: item.description, body: item.body, savedAt: last?.at ?? new Date().toISOString(), savedBy: last?.actor ?? item.author, note: last?.action };
}

/**
 * Applies a create/update proposed by the Web Admin. Returns the audit action + target,
 * or null when the request changes nothing (no write, no audit entry).
 */
export function applyContentUpsert(store: Store, auth: AuthInfo, raw: unknown): { audit: string; target: string; detail?: string } | null {
  const p = validateItem(raw);
  const caps = auth.caps;
  const actor = auth.account;
  const now = new Date().toISOString();
  const today = todayISO();
  const entry = (action: string, version: number, note?: string): HistoryEntry => ({ at: now, actor: actor.name, role: actor.role, action, note, version });
  const existing = store.admin.content.find((c) => c.id === p.id);

  if (!existing) {
    if (!caps.includes('edit_content')) throw forbidden();
    if (p.status !== 'draft' && p.status !== 'medical_review') throw conflict('New content starts as a draft or goes straight to medical review.');
    if (store.admin.content.length >= MAX_ITEMS) throw conflict('The content library is full. Archive or remove old items first.');
    const created: ContentItem = {
      id: p.id,
      title: p.title,
      description: p.description,
      type: p.type,
      category: p.category,
      topic: p.topic,
      tags: p.tags,
      durationMin: p.durationMin,
      lifeStage: p.lifeStage,
      language: p.language,
      body: p.body,
      media: p.media,
      references: p.references,
      author: actor.name,
      medicalReviewer: '',
      reviewDate: null,
      publishedDate: null,
      scheduledFor: null,
      updatedDate: today,
      status: p.status,
      version: 1,
      safetyChecks: noChecks(),
      history: [entry('Created draft', 1), ...(p.status === 'medical_review' ? [entry('Submitted for medical review', 1)] : [])],
      versions: [],
    };
    store.admin.content = [created, ...store.admin.content];
    store.contentAuthors.set(created.id, actor.id);
    store.contentContributors.set(created.id, new Set([actor.id]));
    return { audit: p.status === 'medical_review' ? 'content.create_submit' : 'content.create', target: created.title };
  }

  const statusChange = p.status !== existing.status;
  const contentChanged = CONTENT_FIELDS.some((k) => !same(p[k], existing[k]));
  const referencesChanged = !same(p.references, existing.references);
  const versionBump = p.version === existing.version + 1;
  if (p.version !== existing.version && !versionBump) throw conflict('Version numbers must increase one at a time.');

  let rule: Rule | undefined;
  if (statusChange) {
    // A version bump is only legal as "new version → medical review" of a non-editable item.
    rule = RULES.find((r) => r.from.includes(existing.status) && r.to === p.status && !!r.newVersion === versionBump);
    if (!rule) throw conflict(versionBump ? 'A new version must be submitted for medical review.' : `Content can’t move from “${existing.status}” to “${p.status}”.`);
    const missing = rule.caps.filter((c) => !caps.includes(c));
    if (missing.length) throw forbidden(`This step needs the ${missing.join(' + ')} permission.`);
    if (rule.noSelf && isContributor(store, existing, auth)) throw forbidden('You can’t approve content you wrote or edited (separation of duties).');
    if (rule.secondApprover && isMedicalApprover(store, existing, auth)) throw forbidden('Compliance approval must come from someone other than the medical reviewer (separation of duties).');
  } else if (versionBump) {
    throw conflict('A new version must be submitted for medical review.');
  }

  if (contentChanged) {
    if (!caps.includes('edit_content')) throw forbidden('Editing content needs the edit_content permission.');
    if (!EDITABLE.includes(existing.status) && !rule?.newVersion) throw conflict('This item is in review or live — create a new version to edit it.');
  }
  const editorRefs = caps.includes('edit_content') && (EDITABLE.includes(existing.status) || !!rule?.newVersion);
  if (referencesChanged) {
    const reviewerOk = caps.includes('medical_review') && existing.status === 'medical_review';
    if (!editorRefs && !reviewerOk) throw forbidden('References can be changed by the author while drafting, or by the medical reviewer during review.');
  }
  // The safety checklist is the medical reviewer's sign-off; a new version starts with it cleared.
  const checks = rule?.newVersion ? noChecks() : { ...noChecks(), ...existing.safetyChecks, ...(p.safetyChecks ?? {}) };
  const checksChanged = !rule?.newVersion && !sameChecks(checks, existing.safetyChecks);
  if (checksChanged && !(caps.includes('medical_review') && existing.status === 'medical_review')) {
    throw forbidden('Only the medical reviewer can complete the safety checklist, while the item is in medical review.');
  }
  if (!statusChange && !contentChanged && !referencesChanged && !checksChanged) return null;

  const note = newNote(existing, p);
  if (rule?.needsNote && !note) throw badRequest('Add a comment for the author.');
  if (rule?.safetyGate && CHECK_KEYS.some((k) => !checks[k])) throw conflict('Complete the safety checklist before approving.');
  const references = referencesChanged ? p.references : existing.references;
  if (rule?.audit === 'content.medical_approve' && !references.length) throw conflict('Add at least one reference before approving (§40).');
  let scheduledFor: string | null = existing.scheduledFor;
  if (rule?.to === 'scheduled') {
    if (!p.scheduledFor || Date.parse(p.scheduledFor) <= Date.now()) throw badRequest('Choose a future publication time.');
    scheduledFor = new Date(p.scheduledFor).toISOString();
  } else if (rule) scheduledFor = null;

  const edited = contentChanged || referencesChanged;
  const next: ContentItem = {
    ...existing,
    ...(edited ? Object.fromEntries([...CONTENT_FIELDS, 'references'].map((k) => [k, p[k as keyof Proposal]])) : {}),
    safetyChecks: checks,
    status: rule ? rule.to : existing.status,
    version: p.version,
    scheduledFor,
    updatedDate: today,
  };

  // Separation-of-duties bookkeeping (by account id).
  const contributors = rule?.newVersion ? new Set<string>() : new Set(store.contentContributors.get(existing.id) ?? []);
  if (rule?.newVersion || contentChanged || (referencesChanged && editorRefs)) contributors.add(actor.id);
  store.contentContributors.set(existing.id, contributors);
  if (rule?.newVersion) {
    next.versions = [...(existing.versions ?? []), snapshot(existing)].slice(-MAX_VERSIONS);
    next.reviewDate = null;
    next.medicalReviewer = '';
  }
  if (rule && ['medical_review', 'changes_requested', 'rejected', 'draft'].includes(rule.to)) store.contentMedicalApprover.delete(existing.id);
  if (rule?.audit === 'content.medical_approve') {
    next.medicalReviewer = actor.name;
    next.reviewDate = today;
    store.contentMedicalApprover.set(existing.id, actor.id);
  }
  if (rule?.to === 'published') next.publishedDate = today;
  const added: HistoryEntry[] = [];
  if (rule) added.push(entry(rule.action, next.version, note));
  else if (edited) added.push(entry('Edited', next.version, note));
  else added.push(entry('Updated safety checklist', next.version));
  next.history = [...existing.history, ...added].slice(-MAX_HISTORY);
  store.admin.content = store.admin.content.map((c) => (c.id === next.id ? next : c));
  return { audit: rule?.audit ?? (edited ? 'content.edit' : 'content.safety_checklist'), target: next.title, detail: note };
}

/** Publishes scheduled items whose time has come (run on reads; a job scheduler in production). */
export function publishDue(store: Store, ip = 'system') {
  const now = Date.now();
  for (const c of store.admin.content) {
    if (c.status === 'scheduled' && c.scheduledFor && Date.parse(c.scheduledFor) <= now) {
      c.status = 'published';
      c.publishedDate = todayISO();
      c.scheduledFor = null;
      c.history = [...c.history, { at: new Date().toISOString(), actor: 'System', role: 'system', action: 'Published on schedule', version: c.version }];
      store.audit({ actor: 'System', role: 'system', action: 'content.publish_scheduled', target: c.title }, ip);
    }
  }
}
