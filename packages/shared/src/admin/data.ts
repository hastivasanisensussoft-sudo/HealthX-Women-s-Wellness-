/**
 * Admin domain types + seeded demo data, shared by the Web Admin and the API
 * (moved from apps/web/src/admin/adminData.ts). Seeded admin-side data (users, content workflow, staff, flags, analytics,
 * audit). FRONTEND-ONLY: production reads these from the NestJS `users`,
 * `content`, `analytics`, `subscriptions` and `audit` modules (SRS §56).
 * Analytics are aggregates only — no individual health values (SRS §50, §53).
 */
import { addDays, formatDate, todayISO } from '../dates';
import { CONTENT_CATEGORIES, NOTIFICATION_TYPES } from '../catalog';
import { ARTICLES } from '../mock/articles';
import type { ContentCategory, ContentType, ISODate, LifeStage, NotificationType } from '../types';
import { PRIVILEGED_CAPABILITIES, type LegacyRole, type PrivilegedCapability, type StaffRole } from './rbac';

/** Role recorded on a history/audit entry when it was written (entries from before the 4-role consolidation keep their original role). */
export type RecordedRole = StaffRole | LegacyRole | 'system';

// ---------- seeded RNG ----------
function makeRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T,>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)],
    chance: (p: number) => next() < p,
  };
}

const hoursAgoISO = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

// ---------- types ----------
export type WorkflowStatus =
  | 'draft'
  | 'medical_review'
  | 'changes_requested'
  | 'compliance_review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'archived'
  | 'rejected';

export const STATUS_META: Record<WorkflowStatus, { label: string; srs: string; tone: 'gray' | 'lavender' | 'warning' | 'peach' | 'sky' | 'indigo' | 'green' | 'dark' | 'danger' }> = {
  draft: { label: 'Draft', srs: 'Draft', tone: 'gray' },
  medical_review: { label: 'Medical review', srs: 'Review', tone: 'lavender' },
  changes_requested: { label: 'Changes requested', srs: 'Draft', tone: 'warning' },
  compliance_review: { label: 'Compliance review', srs: 'Review', tone: 'peach' },
  approved: { label: 'Approved', srs: 'Approved', tone: 'sky' },
  scheduled: { label: 'Scheduled', srs: 'Approved', tone: 'indigo' },
  published: { label: 'Published', srs: 'Published', tone: 'green' },
  archived: { label: 'Archived', srs: 'Archived', tone: 'dark' },
  rejected: { label: 'Rejected', srs: 'Draft', tone: 'danger' },
};

export interface HistoryEntry {
  at: string;
  actor: string;
  role: RecordedRole;
  action: string;
  note?: string;
  version: number;
}

export interface MediaFile {
  name: string;
  size: number;
  type: string;
}

/** Snapshot of an earlier version (for the version-history diff). */
export interface ContentVersion {
  version: number;
  title: string;
  description: string;
  body: string;
  savedAt: string;
  savedBy: string;
  note?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  /** A built-in ContentCategory key, or a custom category added under Categories & tags. */
  category: ContentCategory | (string & {});
  /** Subcategory (e.g. "Cycle phases"). */
  topic?: string;
  /** Library tags, e.g. "Quick Help". */
  tags?: string[];
  /** Read/listen/watch time in minutes. */
  durationMin?: number | null;
  /** Earlier versions, oldest first (the live fields are the current version). */
  versions?: ContentVersion[];
  lifeStage: LifeStage;
  language: string;
  author: string;
  medicalReviewer: string;
  reviewDate: ISODate | null;
  references: string[];
  publishedDate: ISODate | null;
  updatedDate: ISODate;
  scheduledFor: string | null;
  status: WorkflowStatus;
  version: number;
  body: string;
  media: MediaFile | null;
  safetyChecks: Record<string, boolean>;
  history: HistoryEntry[];
}

export type UserStatus = 'active' | 'deactivated' | 'deletion_pending' | 'deleted';
export type AuthMethod = 'email' | 'google' | 'apple' | 'magic_link';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  signupDate: ISODate;
  plan: 'free' | 'premium';
  comp?: { until: ISODate; reason: string };
  status: UserStatus;
  authMethod: AuthMethod;
  lastActive: string;
  country: string;
  devices: { platform: 'iOS' | 'Android' | 'Web'; model: string; appVersion: string; lastSeen: string }[];
  consents: { analytics: boolean; ai: boolean; integrations: boolean; notifications: boolean };
  mfa: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  /** Admin accounts only: privileged permissions held by this person (never granted by role). */
  privileges: PrivilegedCapability[];
  mfaEnabled: boolean;
  /** `deactivated`: access removed by an Admin with the Manage staff permission (sessions ended, sign-in refused). */
  status: 'active' | 'invited' | 'deactivated';
  lastLogin: string | null;
}

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  phase: '2' | '3' | 'Future';
  env: Record<'dev' | 'staging' | 'prod', { enabled: boolean; rollout: number }>;
  lastChangedBy: string;
  lastChangedAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  role: RecordedRole;
  action: string;
  target: string;
  ip: string;
  detail?: string;
  /** Stable account id + email of the actor (server-written). Display names can change. */
  actorId?: string;
  actorEmail?: string;
}

export interface InsightRule {
  id: string;
  name: string;
  condition: string;
  phase: 1 | 2;
  enabled: boolean;
}

// ---------- seeds ----------
const FIRST = ['Aisha', 'Priya', 'Meera', 'Ananya', 'Kavya', 'Riya', 'Sara', 'Emily', 'Olivia', 'Grace', 'Chloe', 'Hannah', 'Zara', 'Fatima', 'Leila', 'Mei', 'Yuki', 'Hana', 'Sofia', 'Lucia', 'Maria', 'Amara', 'Zainab', 'Nia', 'Imani', 'Ruth', 'Joy', 'Laura', 'Emma', 'Isla', 'Neha', 'Pooja', 'Divya', 'Sneha', 'Ishita', 'Tanvi', 'Nisha', 'Rachel', 'Megan', 'Julia'];
const LAST = ['Sharma', 'Patel', 'Iyer', 'Reddy', 'Nair', 'Shah', 'Kapoor', 'Mehta', 'Singh', 'Das', 'Khan', 'Ali', 'Chen', 'Wong', 'Tanaka', 'Kim', 'Garcia', 'Lopez', 'Okafor', 'Mensah', 'Smith', 'Brown', 'Wilson', 'Taylor', 'Martin'];
const COUNTRIES = ['India', 'India', 'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates', 'Singapore'];
const IOS = ['iPhone 15', 'iPhone 14', 'iPhone 13 mini', 'iPhone 16 Pro'];
const ANDROID = ['Pixel 8', 'Galaxy S24', 'OnePlus 12', 'Redmi Note 13'];

export function seedUsers(today: ISODate = todayISO()): AdminUser[] {
  const r = makeRng(4242);
  const users: AdminUser[] = [];
  const used = new Set<string>();
  for (let i = 0; users.length < 60 && i < 400; i++) {
    const first = r.pick(FIRST);
    const last = r.pick(LAST);
    const key = `${first}.${last}`.toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    const plan = r.chance(0.22) ? 'premium' : 'free';
    const statusRoll = r.next();
    const status: UserStatus = statusRoll < 0.86 ? 'active' : statusRoll < 0.95 ? 'deactivated' : 'deletion_pending';
    const authRoll = r.next();
    const authMethod: AuthMethod = authRoll < 0.4 ? 'email' : authRoll < 0.7 ? 'google' : authRoll < 0.9 ? 'apple' : 'magic_link';
    const ios = authMethod === 'apple' || r.chance(0.45);
    users.push({
      id: `usr_${String(users.length + 1).padStart(4, '0')}`,
      name: `${first} ${last}`,
      email: `${key}@example.com`,
      signupDate: addDays(today, -r.int(1, 320)),
      plan,
      status,
      authMethod,
      lastActive: hoursAgoISO(status === 'active' ? r.int(1, 24 * 6) : r.int(24 * 20, 24 * 90)),
      country: r.pick(COUNTRIES),
      devices: [
        {
          platform: ios ? 'iOS' : 'Android',
          model: ios ? r.pick(IOS) : r.pick(ANDROID),
          appVersion: `1.${r.int(0, 3)}.${r.int(0, 9)}`,
          lastSeen: hoursAgoISO(r.int(1, 72)),
        },
        ...(r.chance(0.3) ? [{ platform: 'Web' as const, model: 'Chrome on Windows', appVersion: 'web', lastSeen: hoursAgoISO(r.int(24, 200)) }] : []),
      ],
      consents: { analytics: r.chance(0.75), ai: r.chance(0.3), integrations: r.chance(0.35), notifications: r.chance(0.85) },
      mfa: r.chance(0.2),
    });
  }
  return users;
}

const SAFETY_KEYS = ['non_diagnostic', 'estimates_labelled', 'no_medication', 'professional_signpost', 'references_checked'] as const;
export const SAFETY_CHECKLIST: { key: (typeof SAFETY_KEYS)[number]; label: string; srs: string }[] = [
  { key: 'non_diagnostic', label: 'No diagnosis of PCOS, endometriosis, infertility or pregnancy complications', srs: '§67' },
  { key: 'estimates_labelled', label: 'Cycle/ovulation estimates are labelled as estimates; no contraception claims', srs: '§12, §20' },
  { key: 'no_medication', label: 'No prescription-medication recommendations or dosages', srs: '§67' },
  { key: 'professional_signpost', label: 'Signposts to a qualified healthcare professional where relevant', srs: '§19, §67' },
  { key: 'references_checked', label: 'References are present and support the claims made', srs: '§40' },
];
const allChecked = () => Object.fromEntries(SAFETY_KEYS.map((k) => [k, true]));
const noneChecked = () => Object.fromEntries(SAFETY_KEYS.map((k) => [k, false]));

export function seedContent(today: ISODate = todayISO()): ContentItem[] {
  const fromArticles: ContentItem[] = ARTICLES.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    type: a.type,
    category: a.category,
    topic: a.topic,
    tags: a.tags ?? (a.type === 'faq' ? ['FAQ'] : []),
    durationMin: a.readMin,
    lifeStage: a.lifeStage,
    language: a.language,
    author: 'Priya Nair',
    medicalReviewer: 'Dr. Meera Iyer (sample)',
    reviewDate: a.reviewDate,
    references: a.references,
    publishedDate: a.publishedAt,
    updatedDate: a.updatedAt,
    scheduledFor: null,
    status: 'published',
    version: a.version,
    body: a.body.join('\n\n'),
    media: { name: `${a.photo}.jpg`, size: 248_000, type: 'image/jpeg' },
    safetyChecks: allChecked(),
    history: [
      { at: `${addDays(a.reviewDate, -6)}T09:10:00.000Z`, actor: 'Priya Nair', role: 'content_manager', action: 'Created draft', version: 1 },
      { at: `${addDays(a.reviewDate, -4)}T11:30:00.000Z`, actor: 'Priya Nair', role: 'content_manager', action: 'Submitted for medical review', version: 1 },
      { at: `${a.reviewDate}T14:05:00.000Z`, actor: 'Dr. Meera Iyer (sample)', role: 'medical_content_reviewer', action: 'Medical review approved', version: 1 },
      { at: `${addDays(a.reviewDate, 1)}T10:15:00.000Z`, actor: 'Ritu Sharma', role: 'admin', action: 'Compliance approved', version: 1 },
      { at: `${a.publishedAt}T08:00:00.000Z`, actor: 'Priya Nair', role: 'content_manager', action: 'Published', version: 1 },
    ],
  }));

  const extra = (
    id: string,
    title: string,
    type: ContentType,
    category: ContentCategory,
    lifeStage: LifeStage,
    status: WorkflowStatus,
    o: Partial<ContentItem> = {},
  ): ContentItem => {
    const DURATION: Record<ContentType, number> = { article: 5, faq: 4, infographic: 2, video: 10, podcast: 25, program: 20 };
    const created = addDays(today, -((id.length * 3) % 20) - 2);
    const history: HistoryEntry[] = [{ at: `${created}T09:00:00.000Z`, actor: o.author ?? 'Daniel Okafor', role: 'content_manager', action: 'Created draft', version: o.version ?? 1 }];
    if (status !== 'draft') history.push({ at: `${addDays(created, 1)}T10:00:00.000Z`, actor: o.author ?? 'Daniel Okafor', role: 'content_manager', action: 'Submitted for medical review', version: o.version ?? 1 });
    if (['compliance_review', 'approved', 'scheduled', 'published', 'archived'].includes(status))
      history.push({ at: `${addDays(created, 2)}T15:00:00.000Z`, actor: 'Dr. Sarah Thompson (sample)', role: 'medical_content_reviewer', action: 'Medical review approved', version: o.version ?? 1 });
    if (['approved', 'scheduled', 'published', 'archived'].includes(status))
      history.push({ at: `${addDays(created, 3)}T11:00:00.000Z`, actor: 'Ritu Sharma', role: 'admin', action: 'Compliance approved', version: o.version ?? 1 });
    if (status === 'changes_requested')
      history.push({ at: `${addDays(created, 2)}T16:20:00.000Z`, actor: 'Dr. Meera Iyer (sample)', role: 'medical_content_reviewer', action: 'Requested changes', note: 'Please add a professional-signpost line and a reference for the protein guidance.', version: o.version ?? 1 });
    if (status === 'rejected')
      history.push({ at: `${addDays(created, 2)}T12:40:00.000Z`, actor: 'Dr. Sarah Thompson (sample)', role: 'medical_content_reviewer', action: 'Rejected', note: 'Claims about daily water requirements are not individualised safely; rewrite as general guidance.', version: o.version ?? 1 });
    if (status === 'scheduled') history.push({ at: `${addDays(created, 4)}T09:30:00.000Z`, actor: 'Daniel Okafor', role: 'content_manager', action: 'Scheduled publication', version: o.version ?? 1 });
    if (status === 'archived') history.push({ at: `${addDays(created, 6)}T09:30:00.000Z`, actor: 'Alex Morgan', role: 'admin', action: 'Archived', version: o.version ?? 1 });
    if (status === 'published') history.push({ at: `${addDays(created, 4)}T08:00:00.000Z`, actor: 'Daniel Okafor', role: 'content_manager', action: 'Published', version: o.version ?? 1 });
    const reviewed = ['compliance_review', 'approved', 'scheduled', 'published', 'archived'].includes(status);
    return {
      id,
      title,
      description: o.description ?? `Sample ${type} for the ${category.replace('_', ' ')} library.`,
      type,
      category,
      lifeStage,
      language: o.language ?? 'English',
      topic: o.topic,
      tags: o.tags ?? [],
      durationMin: o.durationMin ?? DURATION[type],
      versions: o.versions,
      author: o.author ?? 'Daniel Okafor',
      medicalReviewer: reviewed ? 'Dr. Sarah Thompson (sample)' : '',
      reviewDate: reviewed ? addDays(created, 2) : null,
      references: reviewed ? ['Reference to be added during medical review (demo placeholder)'] : o.references ?? [],
      publishedDate: status === 'published' || status === 'archived' ? addDays(created, 4) : null,
      updatedDate: addDays(created, 2),
      scheduledFor: status === 'scheduled' ? `${addDays(today, 3)}T09:00` : null,
      status,
      version: o.version ?? 1,
      body:
        o.body ??
        'Write a clear, supportive introduction here.\n\n## Key points\n- Use plain language\n- Label estimates as estimates\n- Signpost to a qualified healthcare professional where relevant\n\n> This is sample draft content for the demo CMS.',
      media: o.media ?? null,
      safetyChecks: reviewed ? allChecked() : noneChecked(),
      history,
    };
  };

  // A published article with a reviewed wording fix in v2 (mockup "Version history" example).
  const phases = fromArticles.find((c) => c.id === 'a_cycle_phases');
  if (phases) {
    const reviewed = phases.reviewDate ?? today;
    const v1Body = phases.body.replace(
      'In HealthX, phases are calendar estimates based on the information you have provided. A calendar calculation cannot confirm when, or whether, ovulation happened.',
      'Ovulation happens on day 14. In HealthX, phases are based on the information you have provided.',
    );
    phases.versions = [{ version: 1, title: phases.title, description: phases.description, body: v1Body, savedAt: `${addDays(reviewed, -6)}T09:10:00.000Z`, savedBy: 'Priya Nair', note: 'First draft' }];
    phases.version = 2;
    phases.history = [
      ...phases.history,
      { at: `${addDays(reviewed, 20)}T10:05:00.000Z`, actor: 'Dr. Meera Iyer (sample)', role: 'medical_content_reviewer', action: 'Requested changes', note: 'Please change to “Ovulation is estimated around mid-cycle and varies for each person.”', version: 1 },
      { at: `${addDays(reviewed, 21)}T16:40:00.000Z`, actor: 'Priya Nair', role: 'content_manager', action: 'Created new version & submitted for medical review', version: 2 },
      { at: `${addDays(reviewed, 22)}T11:00:00.000Z`, actor: 'Dr. Meera Iyer (sample)', role: 'medical_content_reviewer', action: 'Medical review approved', version: 2 },
      { at: `${addDays(reviewed, 22)}T15:30:00.000Z`, actor: 'Ritu Sharma', role: 'admin', action: 'Compliance approved', version: 2 },
      { at: `${addDays(reviewed, 23)}T08:00:00.000Z`, actor: 'Priya Nair', role: 'content_manager', action: 'Published', version: 2 },
    ];
  }

  return [
    ...fromArticles,
    extra('c_video_mobility', 'Video: 10-minute morning mobility', 'video', 'fitness', 'all', 'draft', { media: { name: 'morning-mobility.mp4', size: 48_200_000, type: 'video/mp4' } }),
    extra('c_info_cycle', 'Infographic: Your cycle at a glance', 'infographic', 'cycle', 'reproductive', 'medical_review', { author: 'Priya Nair', media: { name: 'cycle-at-a-glance.png', size: 1_200_000, type: 'image/png' } }),
    extra('c_faq_medical', 'FAQ: Is HealthX a medical app?', 'faq', 'cycle', 'all', 'compliance_review', {
      body: '## Is HealthX a medical app?\nNo. HealthX is a wellness app. It does not diagnose, treat or prevent any medical condition.\n\n## What should I do if I am worried about a symptom?\nIf you are concerned about a symptom or pattern, consider speaking with a qualified healthcare professional.',
    }),
    extra('c_podcast_sleep', 'Podcast: Sleep, stress and your cycle', 'podcast', 'mental_wellness', 'all', 'approved', { media: { name: 'sleep-stress-ep1.mp3', size: 22_400_000, type: 'audio/mpeg' } }),
    extra('c_program_strength', 'Program: 4-week strength foundations', 'program', 'fitness', 'all', 'changes_requested', { author: 'Priya Nair' }),
    extra('c_iron_veg', 'Iron-rich vegetarian meal ideas', 'article', 'nutrition', 'all', 'scheduled'),
    extra('c_hot_flashes', 'Understanding hot flashes', 'article', 'life_stages', 'perimenopause', 'medical_review'),
    extra('c_video_breathing', 'Video: Breathing for busy days', 'video', 'mental_wellness', 'all', 'archived', { media: { name: 'breathing.mp4', size: 31_000_000, type: 'video/mp4' } }),
    extra('c_hydration_myths', 'Hydration myths, explained', 'article', 'nutrition', 'all', 'rejected'),
    extra('c_faq_estimates', 'FAQ: How are cycle estimates calculated?', 'faq', 'cycle', 'reproductive', 'draft', { language: 'हिन्दी (Hindi)', author: 'Priya Nair' }),
    extra('c_bone_movement', 'Bone-friendly movement after 50', 'article', 'life_stages', 'menopause', 'compliance_review', {
      version: 2,
      topic: 'Menopause',
      body: 'Strength and balance work can be part of an active life after 50.\n\n## Key points\n- Start gently and build up over weeks\n- Include balance practice\n- Ask your healthcare professional what is right for you\n\n> Sample draft content for the demo CMS.',
      versions: [
        {
          version: 1,
          title: 'Bone-friendly movement after 50',
          description: 'Sample article for the life stages library.',
          body: 'Strength work prevents bone loss after 50.\n\n## Key points\n- Lift heavy three times a week\n- Include balance practice\n\n> Sample draft content for the demo CMS.',
          savedAt: hoursAgoISO(24 * 12),
          savedBy: 'Daniel Okafor',
          note: 'Returned: avoid treatment claims; add a professional signpost.',
        },
      ],
    }),
    extra('c_info_plate', 'Infographic: The balanced plate', 'infographic', 'nutrition', 'all', 'published', { media: { name: 'balanced-plate.png', size: 980_000, type: 'image/png' } }),
  ];
}

/** Demo staff persona for each role on the offline-demo role picker (the demo Admin holds every privileged permission). */
export const PERSONA: Record<StaffRole, { name: string; email: string }> = {
  end_user: { name: 'Aisha Kapoor', email: 'aisha@example.com' },
  content_manager: { name: 'Priya Nair', email: 'priya.nair@healthx.example' },
  medical_content_reviewer: { name: 'Dr. Meera Iyer (sample)', email: 'meera.iyer@healthx.example' },
  admin: { name: 'Sam Rivera', email: 'sam.rivera@healthx.example' },
};

/**
 * Seeded staff in the four SRS roles. Mapped from the former seven roles on 2026-10-26:
 * Sam Rivera (Super Admin) → Admin with every privileged permission; Neha Joshi, Tom Becker
 * (Support Agent) and Kenji Watanabe (Analyst) → Admin with none; Medical Reviewers → Medical
 * Content Reviewer. Account ids and everything else are unchanged.
 */
export function seedStaff(): StaffMember[] {
  const owner = [...PRIVILEGED_CAPABILITIES];
  return [
    { id: 'st_0', name: 'Sam Rivera', email: 'sam.rivera@healthx.example', role: 'admin', privileges: owner, mfaEnabled: true, status: 'active', lastLogin: hoursAgoISO(1) },
    { id: 'st_1', name: 'Alex Morgan', email: 'alex.morgan@healthx.example', role: 'admin', privileges: [], mfaEnabled: true, status: 'active', lastLogin: hoursAgoISO(3) },
    { id: 'st_6', name: 'Ritu Sharma', email: 'ritu.sharma@healthx.example', role: 'admin', privileges: [], mfaEnabled: true, status: 'active', lastLogin: hoursAgoISO(30) },
    { id: 'st_2', name: 'Priya Nair', email: 'priya.nair@healthx.example', role: 'content_manager', privileges: [], mfaEnabled: true, status: 'active', lastLogin: hoursAgoISO(5) },
    { id: 'st_3', name: 'Daniel Okafor', email: 'daniel.okafor@healthx.example', role: 'content_manager', privileges: [], mfaEnabled: true, status: 'active', lastLogin: hoursAgoISO(26) },
    { id: 'st_4', name: 'Dr. Meera Iyer (sample)', email: 'meera.iyer@healthx.example', role: 'medical_content_reviewer', privileges: [], mfaEnabled: true, status: 'active', lastLogin: hoursAgoISO(9) },
    { id: 'st_5', name: 'Dr. Sarah Thompson (sample)', email: 'sarah.thompson@healthx.example', role: 'medical_content_reviewer', privileges: [], mfaEnabled: true, status: 'active', lastLogin: hoursAgoISO(52) },
    { id: 'st_8', name: 'Neha Joshi', email: 'neha.joshi@healthx.example', role: 'admin', privileges: [], mfaEnabled: true, status: 'active', lastLogin: hoursAgoISO(2) },
    { id: 'st_9', name: 'Tom Becker', email: 'tom.becker@healthx.example', role: 'admin', privileges: [], mfaEnabled: false, status: 'active', lastLogin: hoursAgoISO(20) },
    { id: 'st_10', name: 'Kenji Watanabe', email: 'kenji.watanabe@healthx.example', role: 'admin', privileges: [], mfaEnabled: true, status: 'active', lastLogin: hoursAgoISO(28) },
    { id: 'st_7', name: 'Jordan Lee', email: 'jordan.lee@healthx.example', role: 'content_manager', privileges: [], mfaEnabled: false, status: 'invited', lastLogin: null },
  ];
}

const now = () => new Date().toISOString();

export function seedFlags(): FeatureFlag[] {
  const f = (key: string, name: string, description: string, phase: FeatureFlag['phase'], dev: [boolean, number], staging: [boolean, number], prod: [boolean, number], by = 'Alex Morgan', h = 48): FeatureFlag => ({
    key,
    name,
    description,
    phase,
    env: { dev: { enabled: dev[0], rollout: dev[1] }, staging: { enabled: staging[0], rollout: staging[1] }, prod: { enabled: prod[0], rollout: prod[1] } },
    lastChangedBy: by,
    lastChangedAt: hoursAgoISO(h),
  });
  return [
    f('ai_coach', 'AI wellness coach', 'Simulated coach chat with diagnosis/emergency guardrails (§34).', '2', [true, 100], [true, 100], [false, 0], 'Alex Morgan', 20),
    f('nutrition', 'Nutrition tracking', 'Macros dashboard and meal logging (§28).', '2', [true, 100], [true, 50], [false, 0]),
    f('sleep', 'Sleep module', 'Bedtime, wake, quality and night waking (§30).', '2', [true, 100], [true, 100], [true, 10], 'Alex Morgan', 6),
    f('health_integrations', 'Apple Health & Health Connect', 'Import steps, sleep and workouts (§43–§44).', '2', [true, 100], [false, 0], [false, 0]),
    f('advanced_insights', 'Advanced insights', 'Mood + cycle correlation and irregular-cycle detection (§17, §19).', '2', [true, 100], [true, 100], [false, 0]),
    f('premium', 'Premium subscription', 'Paywall and entitlements (§49).', '2', [true, 100], [true, 100], [false, 0]),
    f('fertility', 'Fertility awareness', 'BBT, cervical mucus and ovulation-test logging (§20–§21).', '3', [true, 100], [false, 0], [false, 0]),
    f('pregnancy', 'Pregnancy wellness mode', 'Pregnancy week, education and reminders (§22–§23).', '3', [true, 50], [false, 0], [false, 0]),
    f('menopause', 'Perimenopause & menopause modes', 'Hot-flash logging and life-stage dashboards (§24–§25).', '3', [true, 100], [false, 0], [false, 0]),
    f('wearables', 'Wearables', 'Third-party wearable connectors (§30, §63).', '3', [false, 0], [false, 0], [false, 0]),
    f('ai_personalization', 'AI personalisation', 'Consent-based personalised suggestions (§35).', '3', [false, 0], [false, 0], [false, 0]),
    f('community', 'Community', 'Moderated communities (§51).', 'Future', [false, 0], [false, 0], [false, 0]),
    f('business_integration', 'HealthX Business link', 'Aggregate-only employer wellness metrics (§50).', 'Future', [false, 0], [false, 0], [false, 0]),
  ];
}

export function seedAudit(): AuditEntry[] {
  const e = (h: number, actor: string, role: AuditEntry['role'], action: string, target: string, detail?: string): AuditEntry => ({
    id: `au_seed_${h}_${action.replace(/\W/g, '')}`,
    at: hoursAgoISO(h),
    actor,
    role,
    action,
    target,
    ip: `10.0.${(h * 7) % 255}.${(h * 13) % 255}`,
    detail,
  });
  return [
    e(2, 'Alex Morgan', 'admin', 'staff.login', 'Alex Morgan', 'MFA verified'),
    e(4, 'Priya Nair', 'content_manager', 'content.submit_review', 'Infographic: Your cycle at a glance'),
    e(6, 'Alex Morgan', 'admin', 'flag.update', 'sleep', 'prod rollout 0% → 10%'),
    e(9, 'Dr. Meera Iyer (sample)', 'medical_content_reviewer', 'content.request_changes', 'Program: 4-week strength foundations'),
    e(14, 'Ritu Sharma', 'admin', 'content.compliance_approve', 'Podcast: Sleep, stress and your cycle'),
    e(20, 'Alex Morgan', 'admin', 'flag.update', 'ai_coach', 'staging enabled'),
    e(26, 'Daniel Okafor', 'content_manager', 'content.schedule', 'Iron-rich vegetarian meal ideas'),
    e(31, 'Alex Morgan', 'admin', 'user.export_processed', 'usr_0012', 'Export link sent to user (simulated)'),
    e(40, 'Alex Morgan', 'admin', 'config.update', 'Wellness score weights', 'No change (review)'),
    e(52, 'Dr. Sarah Thompson (sample)', 'medical_content_reviewer', 'content.reject', 'Hydration myths, explained'),
    e(60, 'Alex Morgan', 'admin', 'user.deactivate', 'usr_0031', 'Requested by user via support'),
    e(75, 'Alex Morgan', 'admin', 'staff.invite', 'jordan.lee@healthx.example', 'Role: Content Manager'),
    e(90, 'system', 'system', 'content.publish_scheduled', 'Infographic: The balanced plate'),
    e(120, 'Alex Morgan', 'admin', 'subscription.grant_comp', 'usr_0007', '30 days · beta tester'),
    e(150, 'Ritu Sharma', 'admin', 'content.archive', 'Video: Breathing for busy days'),
  ];
}

export function seedRules(): InsightRule[] {
  return [
    { id: 'sleep_energy_3d', name: 'Sleep consistency suggestion', condition: 'sleep < target AND energy = low FOR 3 days (§37)', phase: 1, enabled: true },
    { id: 'activity_energy', name: 'Movement and energy pattern', condition: 'avg energy on workout days − other days ≥ 0.8 over 30 days (§36)', phase: 1, enabled: true },
    { id: 'activity_consistency', name: 'Activity consistency', condition: '≥ 2 workouts in the last 7 days (§66)', phase: 1, enabled: true },
    { id: 'hydration_week', name: 'Hydration on track', condition: 'water goal met on ≥ 4 of last 7 days', phase: 1, enabled: true },
    { id: 'pre_period_energy', name: 'Pre-period energy pattern', condition: 'lower energy in 3 days before period across recent cycles (§17)', phase: 2, enabled: true },
    { id: 'cycle_variation', name: 'Cycle-length variation', condition: 'recent cycle-length spread > threshold (§19, D-09)', phase: 2, enabled: true },
  ];
}

// ---------- analytics (simulated aggregates, §53–§54) ----------
export interface DayMetric {
  date: ISODate;
  label: string;
  newUsers: number;
  dau: number;
  checkins: number;
  onboarding: number;
}

export function analyticsSeries(days = 30, today: ISODate = todayISO()): DayMetric[] {
  const r = makeRng(777);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, -(days - 1 - i));
    const trend = i / days;
    const weekend = [0, 6].includes(new Date(`${date}T12:00:00`).getDay());
    const newUsers = Math.round(140 + trend * 90 + r.int(-25, 25));
    const dau = Math.round(2200 + trend * 650 + (weekend ? -180 : 0) + r.int(-90, 90));
    return {
      date,
      label: formatDate(date, 'short'),
      newUsers,
      dau,
      checkins: Math.round(dau * (0.62 + r.next() * 0.08)),
      onboarding: Math.round(newUsers * (0.74 + r.next() * 0.1)),
    };
  });
}

export const RETENTION_COHORTS = [
  { cohort: 'Wk -8', d7: 58, d30: 41, d90: 29 },
  { cohort: 'Wk -7', d7: 61, d30: 43, d90: 31 },
  { cohort: 'Wk -6', d7: 57, d30: 40, d90: 0 },
  { cohort: 'Wk -5', d7: 63, d30: 45, d90: 0 },
  { cohort: 'Wk -4', d7: 64, d30: 46, d90: 0 },
  { cohort: 'Wk -3', d7: 62, d30: 0, d90: 0 },
  { cohort: 'Wk -2', d7: 66, d30: 0, d90: 0 },
];

/** §53 catalogue with allowed (non-health) properties — mirrors plan 02 §G7. */
export const EVENT_CATALOGUE: { event: string; module: string; props: string; count7d: number }[] = [
  { event: 'user_registered', module: 'auth', props: 'auth method', count7d: 1342 },
  { event: 'onboarding_completed', module: 'onboarding', props: 'goal count', count7d: 1051 },
  { event: 'period_logged', module: 'period', props: 'none', count7d: 8420 },
  { event: 'symptom_logged', module: 'symptoms', props: 'none', count7d: 15233 },
  { event: 'mood_logged', module: 'mood', props: 'none', count7d: 12980 },
  { event: 'cycle_completed', module: 'cycle', props: 'none', count7d: 2105 },
  { event: 'workout_started', module: 'fitness', props: 'workout category', count7d: 6402 },
  { event: 'workout_completed', module: 'fitness', props: 'category, duration bucket', count7d: 5288 },
  { event: 'water_logged', module: 'hydration', props: 'none', count7d: 40112 },
  { event: 'content_viewed', module: 'content', props: 'content id, category', count7d: 9877 },
  { event: 'ai_question_asked', module: 'ai (Phase 2)', props: 'none — never question text', count7d: 0 },
  { event: 'goal_created', module: 'goals (Phase 2)', props: 'goal type', count7d: 0 },
  { event: 'goal_completed', module: 'goals (Phase 2)', props: 'goal type', count7d: 0 },
  { event: 'subscription_started', module: 'subscriptions (Phase 2)', props: 'plan, trial flag', count7d: 0 },
  { event: 'subscription_cancelled', module: 'subscriptions (Phase 2)', props: 'plan', count7d: 0 },
];

export const MRR_SERIES = [
  { label: 'May', mrr: 0, subs: 0 },
  { label: 'Jun', mrr: 0, subs: 0 },
  { label: 'Jul', mrr: 18400, subs: 92 },
  { label: 'Aug', mrr: 31200, subs: 156 },
  { label: 'Sep', mrr: 44800, subs: 224 },
  { label: 'Oct', mrr: 58600, subs: 293 },
];

export const nowIso = now;

export const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'infographic', label: 'Infographic' },
  { value: 'faq', label: 'FAQ' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'program', label: 'Program' },
];

// ---------- support requests [ADD — support queue isn't in the SRS] ----------
export type SupportType = 'data_export' | 'account_deletion' | 'login_help' | 'subscription_issue' | 'verification';
export type SupportStatus = 'open' | 'in_progress' | 'resolved';

/** SLA hours are placeholders until legal/ops set them (export/deletion timing is D-20). */
export const SUPPORT_TYPES: Record<SupportType, { label: string; slaHours: number; srs: string }> = {
  data_export: { label: 'Data export', slaHours: 72, srs: '§42' },
  account_deletion: { label: 'Account deletion', slaHours: 72, srs: '§42' },
  login_help: { label: 'Login help', slaHours: 24, srs: '§48' },
  subscription_issue: { label: 'Subscription issue', slaHours: 48, srs: '§49' },
  verification: { label: 'Email verification', slaHours: 24, srs: '[ADD A-02]' },
};

export interface SupportRequest {
  id: string;
  type: SupportType;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  createdAt: string;
  status: SupportStatus;
  assignee: string | null;
  priority: 'low' | 'normal' | 'high';
  channel: 'in_app' | 'email';
  notes: { at: string; by: string; text: string }[];
}

const SUBJECTS: Record<SupportType, string[]> = {
  data_export: ['Please send me a copy of my data', 'Export request from Privacy Center', 'Need my data for a new device'],
  account_deletion: ['Please delete my account', 'Deletion requested in app', 'Close my account and remove data'],
  login_help: ['Magic link not arriving', 'Can’t sign in with Apple', 'Locked out after password attempts'],
  subscription_issue: ['Charged twice this month', 'Premium not unlocked after purchase', 'How do I cancel Premium?'],
  verification: ['Verification email expired', 'Didn’t receive verification email'],
};

export function seedSupport(users: AdminUser[]): SupportRequest[] {
  const r = makeRng(9090);
  const types = Object.keys(SUPPORT_TYPES) as SupportType[];
  const agents = ['Neha Joshi', 'Tom Becker', null];
  return Array.from({ length: 38 }, (_, i) => {
    const u = users[(i * 7) % users.length];
    const type = types[i % types.length];
    const ageH = i % 4 === 0 ? r.int(80, 150) : r.int(1, 40);
    const status: SupportStatus = ageH > 80 ? 'resolved' : r.chance(0.35) ? 'in_progress' : 'open';
    const assignee = status === 'open' ? (r.chance(0.4) ? r.pick(agents) : null) : r.pick(['Neha Joshi', 'Tom Becker']);
    return {
      id: `SUP-${1000 + i}`,
      type,
      userId: u.id,
      userName: u.name,
      userEmail: u.email,
      subject: r.pick(SUBJECTS[type]),
      createdAt: hoursAgoISO(ageH),
      status,
      assignee,
      priority: type === 'account_deletion' || type === 'subscription_issue' ? (r.chance(0.5) ? 'high' : 'normal') : r.chance(0.2) ? 'low' : 'normal',
      channel: r.chance(0.6) ? 'in_app' : 'email',
      notes: status === 'resolved' ? [{ at: hoursAgoISO(Math.max(1, ageH - 20)), by: assignee ?? 'Neha Joshi', text: 'Resolved and user notified.' }] : [],
    };
  });
}

// ---------- notification templates & campaigns (§41) ----------
export interface NotificationTemplate {
  key: NotificationType;
  label: string;
  title: string;
  body: string;
  /** [ADD A-08] lock-screen-safe wording. */
  discreetBody: string;
  /** Health-related copy must be approved by a Medical Reviewer before going live (D-40). */
  healthRelated: boolean;
  status: 'live' | 'pending_review';
  proposed?: { title: string; body: string; by: string; at: string };
  lastReviewedBy: string;
  lastReviewedAt: string;
  version: number;
}

export function seedTemplates(): NotificationTemplate[] {
  return NOTIFICATION_TYPES.map((n) => ({
    key: n.key,
    label: n.label,
    title: n.label,
    body: n.example,
    discreetBody: 'You have a new HealthX reminder.',
    healthRelated: n.key !== 'content',
    status: n.key === 'hydration' ? 'pending_review' : 'live',
    proposed:
      n.key === 'hydration'
        ? { title: 'Hydration', body: 'A glass of water now keeps you on track for today’s goal.', by: 'Priya Nair', at: hoursAgoISO(5) }
        : undefined,
    lastReviewedBy: 'Dr. Meera Iyer (sample)',
    lastReviewedAt: hoursAgoISO(24 * 12),
    version: 1,
  }));
}

/** Campaigns may target ONLY these non-sensitive attributes. */
export interface CampaignSegment {
  plan: 'any' | 'free' | 'premium';
  countries: string[];
  language: string;
  lastActive: 'any' | '7d' | '30d' | 'inactive_30d';
  appVersion: 'any' | '1.2+' | '1.3+';
}

export interface Campaign {
  id: string;
  name: string;
  title: string;
  body: string;
  segment: CampaignSegment;
  schedule: string | null;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  createdBy: string;
  createdAt: string;
  reach: number;
  delivered?: number;
  opened?: number;
  /** How it was sent: in-app inbox delivery works without a push provider. */
  channel?: 'in_app' | 'push';
  sentAt?: string;
}

export const ANY_SEGMENT: CampaignSegment = { plan: 'any', countries: [], language: 'any', lastActive: 'any', appVersion: 'any' };

export function seedCampaigns(): Campaign[] {
  return [
    {
      id: 'cmp_1',
      name: 'New article: Skin and your cycle',
      title: 'New in Learn',
      body: 'A new wellness article is ready for you.',
      segment: { ...ANY_SEGMENT, lastActive: '30d' },
      schedule: `${addDays(todayISO(), -9)}T10:00`,
      status: 'sent',
      createdBy: 'Alex Morgan',
      createdAt: hoursAgoISO(24 * 10),
      reach: 18420,
      delivered: 17890,
      opened: 4210,
    },
    {
      id: 'cmp_2',
      name: 'Hydration week',
      title: 'Hydration week',
      body: 'Small sips add up — try logging water this week.',
      segment: { ...ANY_SEGMENT, countries: ['India'] },
      schedule: `${addDays(todayISO(), -3)}T09:00`,
      status: 'sent',
      createdBy: 'Ritu Sharma',
      createdAt: hoursAgoISO(24 * 4),
      reach: 9800,
      delivered: 9612,
      opened: 2390,
    },
    {
      id: 'cmp_3',
      name: 'Premium preview (Phase 2)',
      title: 'Something new is coming',
      body: 'Premium features are on the way. Stay tuned.',
      segment: { ...ANY_SEGMENT, plan: 'free', lastActive: '7d' },
      schedule: `${addDays(todayISO(), 5)}T18:00`,
      status: 'scheduled',
      createdBy: 'Alex Morgan',
      createdAt: hoursAgoISO(30),
      reach: 7120,
    },
    {
      id: 'cmp_4',
      name: 'App update 1.3',
      title: 'Update available',
      body: 'Update HealthX for the latest improvements.',
      segment: { ...ANY_SEGMENT, appVersion: '1.2+' },
      schedule: `${addDays(todayISO(), -1)}T12:00`,
      status: 'cancelled',
      createdBy: 'Sam Rivera',
      createdAt: hoursAgoISO(60),
      reach: 5400,
    },
  ];
}

/** Aggregate delivery stats per notification type, last 7 days (simulated). */
export const DELIVERY_STATS: { key: NotificationType; sent: number; delivered: number; opened: number; optOut: number }[] = [
  { key: 'cycle', sent: 21840, delivered: 98.4, opened: 31.2, optOut: 0.4 },
  { key: 'habit', sent: 48210, delivered: 98.9, opened: 27.5, optOut: 0.6 },
  { key: 'hydration', sent: 63105, delivered: 99.1, opened: 18.3, optOut: 1.1 },
  { key: 'workout', sent: 12480, delivered: 98.7, opened: 22.9, optOut: 0.5 },
  { key: 'content', sent: 9050, delivered: 97.8, opened: 15.6, optOut: 0.9 },
  { key: 'report', sent: 14320, delivered: 99.0, opened: 41.7, optOut: 0.2 },
];

/** Words that health copy may not contain (G2 prohibited claims — reviewer-maintained list). */
export const PROHIBITED_TERMS = ['diagnos', 'cure', 'guarantee', 'confirmed ovulation', 'safe day', 'contracepti', 'prescription', 'pcos', 'endometriosis', 'infertil'];

export function prohibitedTermsIn(text: string): string[] {
  const t = text.toLowerCase();
  return PROHIBITED_TERMS.filter((w) => t.includes(w));
}

// ---------- refunds (simulated, §49 Phase 2) ----------
export interface Refund {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  reason: string;
  at: string;
  by: string;
}

export function seedRefunds(users: AdminUser[]): Refund[] {
  const premium = users.filter((u) => u.plan === 'premium');
  const reasons = ['Duplicate charge', 'Purchased by mistake'];
  return premium.slice(0, 2).map((u, i) => ({
    id: `rf_${i + 1}`,
    userId: u.id,
    userName: u.name,
    amount: 199,
    reason: reasons[i],
    at: hoursAgoISO(i === 0 ? 48 : 24 * 9),
    by: i === 0 ? 'Alex Morgan' : 'Ritu Sharma',
  }));
}

// ---------- admin settings ----------
export interface AdminSettings {
  mfaRequired: true;
  sessionTimeoutMin: 5 | 15 | 30;
  passwordMinLength: number;
  retention: { auditMonths: number | null; deletedBackupDays: number | null; supportMonths: number | null; analyticsMonths: number | null };
  privacy: { discreetDefault: boolean; analyticsOptInOnly: true; aiPersonalisationDefaultOff: true };
  environment: 'development' | 'staging' | 'production';
  showEnvBanner: boolean;
}

export const DEFAULT_SETTINGS: AdminSettings = {
  mfaRequired: true,
  sessionTimeoutMin: 15,
  passwordMinLength: 12,
  retention: { auditMonths: null, deletedBackupDays: null, supportMonths: null, analyticsMonths: null },
  privacy: { discreetDefault: false, analyticsOptInOnly: true, aiPersonalisationDefaultOff: true },
  environment: 'staging',
  showEnvBanner: true,
};

// ---------- privacy requests (§42 export / deletion / consent withdrawal) ----------
export type PrivacyType = 'export' | 'deletion' | 'consent_withdrawal';
export type PrivacyStatus = 'new' | 'in_progress' | 'completed';
export type ConsentKey = 'analytics' | 'ai' | 'integrations' | 'notifications';

/** Response windows are placeholders until legal sets them per launch market (D-20). */
export const PRIVACY_TYPES: Record<PrivacyType, { label: string; days: number; srs: string }> = {
  export: { label: 'Export data', days: 7, srs: '§42' },
  deletion: { label: 'Delete account', days: 7, srs: '§42' },
  consent_withdrawal: { label: 'Withdraw consent', days: 7, srs: '§42' },
};
export const CONSENT_LABELS: Record<ConsentKey, string> = {
  analytics: 'Product analytics',
  ai: 'AI personalisation',
  integrations: 'Health integrations',
  notifications: 'Notifications',
};

export interface PrivacyRequest {
  id: string;
  userId: string;
  type: PrivacyType;
  consent?: ConsentKey;
  requestedAt: string;
  dueDate: ISODate;
  status: PrivacyStatus;
  assignee: string | null;
  channel: 'privacy_center' | 'email' | 'support';
  completedAt?: string;
  log: { at: string; by: string; text: string }[];
}

export function seedPrivacyRequests(users: AdminUser[]): PrivacyRequest[] {
  const r = makeRng(2219);
  const plan: [PrivacyType, PrivacyStatus, number][] = [
    ['deletion', 'in_progress', 5],
    ['export', 'new', 3],
    ['deletion', 'new', 2],
    ['consent_withdrawal', 'in_progress', 2],
    ['export', 'completed', 2],
    ['export', 'new', 1],
    ['consent_withdrawal', 'new', 0],
    ['deletion', 'completed', 9],
    ['export', 'completed', 12],
    ['consent_withdrawal', 'completed', 15],
    ['export', 'completed', 21],
    ['deletion', 'completed', 26],
  ];
  const consents: ConsentKey[] = ['analytics', 'ai', 'integrations', 'notifications'];
  const done: Record<PrivacyType, string> = {
    export: 'Export generated; secure download link emailed (expires in 7 days).',
    deletion: 'Account and data deleted across database, storage and analytics identifiers.',
    consent_withdrawal: 'Consent withdrawn and the related processing stopped.',
  };
  return plan.map(([type, status, ageDays], i) => {
    const u = users[(i * 5 + 3) % users.length];
    const requestedAt = hoursAgoISO(ageDays * 24 + r.int(1, 10));
    const by = r.pick(['Neha Joshi', 'Alex Morgan', 'Tom Becker']);
    const log: PrivacyRequest['log'] = [{ at: requestedAt, by: 'system', text: 'Request received from a signed-in session (identity verified).' }];
    if (status !== 'new') log.push({ at: hoursAgoISO(Math.max(1, ageDays * 24 - 6)), by, text: 'Started processing.' });
    if (status === 'completed') log.push({ at: hoursAgoISO(Math.max(1, ageDays * 24 - 30)), by, text: done[type] });
    return {
      id: `PR-${2223 - i}`,
      userId: u.id,
      type,
      consent: type === 'consent_withdrawal' ? consents[i % consents.length] : undefined,
      requestedAt,
      dueDate: addDays(requestedAt.slice(0, 10), PRIVACY_TYPES[type].days),
      status,
      assignee: status === 'new' ? null : by,
      channel: i % 3 === 0 ? 'email' : i % 3 === 1 ? 'privacy_center' : 'support',
      completedAt: status === 'completed' ? hoursAgoISO(Math.max(1, ageDays * 24 - 30)) : undefined,
      log,
    };
  });
}

// ---------- media library (§39) ----------
export type MediaKind = 'image' | 'audio' | 'video';
export interface MediaAsset {
  id: string;
  name: string;
  kind: MediaKind;
  mime: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  alt?: string;
  duration?: string;
}

export const MEDIA_UPLOAD_RULES: Record<MediaKind, { types: string[]; max: number; label: string }> = {
  image: { types: ['image/jpeg', 'image/png', 'image/webp'], max: 5_000_000, label: 'JPG, PNG or WebP · max 5 MB' },
  audio: { types: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a'], max: 50_000_000, label: 'MP3 or M4A · max 50 MB' },
  video: { types: ['video/mp4', 'video/webm'], max: 200_000_000, label: 'MP4 or WebM · max 200 MB' },
};

export const mediaKindOf = (mime: string): MediaKind => (mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'image');

export function seedMedia(content: ContentItem[]): MediaAsset[] {
  const fromContent = [...new Map(content.filter((c) => c.media).map((c) => [c.media!.name, c.media!])).values()];
  const extras: (MediaFile & { duration?: string })[] = [
    { name: 'sos_sleep.mp3', size: 9_400_000, type: 'audio/mpeg', duration: '10:00' },
    { name: 'tension_routine.mp4', size: 148_000_000, type: 'video/mp4', duration: '12:04' },
    { name: 'sitali_breathing.jpg', size: 380_000, type: 'image/jpeg' },
    { name: 'hormones_faq.png', size: 195_000, type: 'image/png' },
    { name: 'strength_40.mp4', size: 210_000_000, type: 'video/mp4', duration: '18:20' },
    { name: 'spring-banner.png', size: 640_000, type: 'image/png' },
  ];
  const people = ['Priya Nair', 'Daniel Okafor', 'Alex Morgan'];
  return [...fromContent, ...extras].map((m, i) => {
    const kind = mediaKindOf(m.type);
    return {
      id: `md_${i + 1}`,
      name: m.name,
      kind,
      mime: m.type,
      size: m.size,
      uploadedAt: hoursAgoISO(24 * (3 + ((i * 7) % 40))),
      uploadedBy: people[i % people.length],
      alt: kind === 'image' ? `Illustration: ${m.name.replace(/[-_]/g, ' ').replace(/\.\w+$/, '')}` : undefined,
      duration: (m as { duration?: string }).duration,
    };
  });
}

// ---------- categories, life stages & tags (§38) ----------
export interface TaxonomyCategory {
  key: string;
  label: string;
  subs: string[];
  builtIn: boolean;
}
export interface Taxonomy {
  categories: TaxonomyCategory[];
  tags: string[];
}

export function seedTaxonomy(): Taxonomy {
  return {
    categories: CONTENT_CATEGORIES.map((c) => ({ key: c.key, label: c.label, subs: [...c.topics], builtIn: true })),
    tags: ['Quick Help', 'FAQ', 'Beginner', 'Sleep', 'Pain', 'Yoga', 'Breathing', 'Hormones', 'Bone health'],
  };
}

// ---------- staff account (My account) ----------
export interface StaffAccount {
  language: string;
  timezone: string;
  reviewAlerts: boolean;
  weeklyDigest: boolean;
  passwordChangedAt: string;
  backupCodes: string[];
  sessions: { id: string; device: string; location: string; lastActive: string; current: boolean }[];
}

export function newBackupCodes(seed = Date.now()): string[] {
  const r = makeRng(seed % 100000);
  return Array.from({ length: 8 }, () => `${r.int(1000, 9999)}-${r.int(1000, 9999)}`);
}

export function defaultAccount(): StaffAccount {
  return {
    language: 'English',
    timezone: 'Asia/Kolkata',
    reviewAlerts: true,
    weeklyDigest: false,
    passwordChangedAt: hoursAgoISO(24 * 42),
    backupCodes: newBackupCodes(4242),
    sessions: [
      { id: 'ses_current', device: 'Chrome · Windows', location: 'This device', lastActive: hoursAgoISO(0), current: true },
      { id: 'ses_ipad', device: 'Safari · iPad', location: 'Mumbai, IN (approx.)', lastActive: hoursAgoISO(20), current: false },
      { id: 'ses_mac', device: 'Edge · macOS', location: 'Pune, IN (approx.)', lastActive: hoursAgoISO(76), current: false },
    ],
  };
}

/** Deterministic, simulated aggregate view counts (no per-user data). */
export function contentViews7d(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 300 + (h % 2100);
}
