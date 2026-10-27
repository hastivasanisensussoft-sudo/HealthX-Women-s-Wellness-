import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  Bold,
  CalendarClock,
  Check,
  CircleAlert,
  FileText,
  GitBranch,
  Headphones,
  Heading2,
  History,
  ImagePlus,
  Italic,
  Link2,
  List,
  PenLine,
  PlayCircle,
  Plus,
  Quote,
  RotateCcw,
  Send,
  ShieldCheck,
  Smartphone,
  Tags,
  Trash2,
  Undo2,
  Upload,
  UserRoundCheck,
  X,
  XCircle,
} from 'lucide-react';
import { formatDate, LANGUAGES, LIFE_STAGES, todayISO, type ContentType, type LifeStage, type PhotoKey } from '@healthx/shared';
import { BackendBadge, Badge, Button, Card, CardHeader, Checkbox, ConfirmDialog, EmptyState, Field, Input, Modal, Notice, ProgressBar, Segmented, Select, Textarea, useToast } from '@/components/ui';
import { Photo } from '@/components/media/Photo';
import { cn } from '@/lib/utils';
import { useAccess, useAdmin } from '../adminState';
import { CONTENT_TYPES, SAFETY_CHECKLIST, STATUS_META, type ContentItem, type ContentVersion, type HistoryEntry, type MediaFile, type WorkflowStatus } from '../adminData';
import { AdminHeader, RoleBadge, StatusBadge } from '../components';
import { formatBytes, formatDateTime } from '../helpers';
import { MarkdownPreview } from '../markdown';
import { ROLE_META } from '../rbac';

type Errors = Partial<Record<'title' | 'description' | 'author' | 'body' | 'references' | 'schedule' | 'reviewer' | 'media' | 'comment' | 'safety', string>>;

const EDITABLE: WorkflowStatus[] = ['draft', 'changes_requested', 'rejected'];

const MEDIA_RULES: Record<ContentType, { accept: string; types: string[]; max: number; label: string }> = {
  article: { accept: 'image/jpeg,image/png,image/webp', types: ['image/jpeg', 'image/png', 'image/webp'], max: 5_000_000, label: 'JPG, PNG or WebP up to 5 MB' },
  infographic: { accept: 'image/jpeg,image/png,image/webp', types: ['image/jpeg', 'image/png', 'image/webp'], max: 5_000_000, label: 'JPG, PNG or WebP up to 5 MB' },
  faq: { accept: 'image/jpeg,image/png,image/webp', types: ['image/jpeg', 'image/png', 'image/webp'], max: 5_000_000, label: 'Optional image up to 5 MB' },
  program: { accept: 'image/jpeg,image/png,image/webp', types: ['image/jpeg', 'image/png', 'image/webp'], max: 5_000_000, label: 'Cover image up to 5 MB' },
  video: { accept: 'video/mp4,video/webm', types: ['video/mp4', 'video/webm'], max: 200_000_000, label: 'MP4 or WebM up to 200 MB' },
  podcast: { accept: 'audio/mpeg,audio/mp4,audio/x-m4a', types: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a'], max: 50_000_000, label: 'MP3 or M4A up to 50 MB' },
};

const STEPS: { key: string; label: string; match: WorkflowStatus[] }[] = [
  { key: 'draft', label: 'Draft', match: ['draft', 'changes_requested', 'rejected'] },
  { key: 'medical', label: 'Medical review', match: ['medical_review'] },
  { key: 'compliance', label: 'Compliance', match: ['compliance_review'] },
  { key: 'approved', label: 'Approved', match: ['approved', 'scheduled'] },
  { key: 'published', label: 'Published', match: ['published', 'archived'] },
];

/** Demo photos that ship with the app: image media named `<key>.jpg` is shown as its real thumbnail. */
const PHOTO_KEYS = new Set<string>([
  'hero-woman', 'woman-tea', 'yoga-home', 'healthy-food', 'water', 'sleep', 'journaling', 'meditation', 'walking-outdoors', 'mature-woman', 'senior-woman-active', 'pregnant-woman', 'friends-group',
  'doctor-consult', 'strength-training', 'stretching', 'nutrition-bowl', 'south-asian-woman', 'cozy-comfort', 'portrait-curly', 'portrait-indian', 'woman-running', 'pilates-mat', 'fresh-fruit',
  'herbal-tea', 'woman-reading', 'period-comfort', 'friends-yoga', 'nature-leaves',
]);
const mediaPhoto = (m: MediaFile | null): PhotoKey | null => {
  if (!m || !m.type.startsWith('image/')) return null;
  const key = m.name.replace(/\.[a-z0-9]+$/i, '');
  return PHOTO_KEYS.has(key) ? (key as PhotoKey) : null;
};

function blank(author: string): ContentItem {
  const today = todayISO();
  return {
    id: `c_${Date.now().toString(36)}`,
    title: '',
    description: '',
    type: 'article',
    category: 'cycle',
    lifeStage: 'all',
    language: 'English',
    author,
    medicalReviewer: '',
    reviewDate: null,
    references: [],
    publishedDate: null,
    updatedDate: today,
    scheduledFor: null,
    status: 'draft',
    version: 1,
    body: '',
    media: null,
    safetyChecks: Object.fromEntries(SAFETY_CHECKLIST.map((s) => [s.key, false])),
    history: [],
  };
}

/** Snapshot of the saved (outgoing) version, kept for the version-history diff. */
function snapshotOf(c: ContentItem): ContentVersion {
  const last = [...c.history].reverse().find((h) => h.version === c.version);
  return { version: c.version, title: c.title, description: c.description, body: c.body, savedAt: last?.at ?? new Date().toISOString(), savedBy: last?.actor ?? c.author, note: last?.action };
}

const MEDIA_LABEL: Partial<Record<ContentType, string>> = { video: 'video', podcast: 'audio' };

/** Numbered editor section: icon disc, mono step eyebrow, title and optional action. */
function Section({ n, title, subtitle, icon, action, children }: { n: string; title: string; subtitle?: ReactNode; icon: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="card-pad">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700 ring-1 ring-inset ring-green-100">{icon}</span>
          <div className="min-w-0">
            <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-green-700">{n}</p>
            <h2 className="font-display text-[18px] font-semibold leading-snug tracking-[-0.01em] text-ink-900">{title}</h2>
            {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

/** Writer → Medical → Compliance → Approved → Published progress band (§40). */
function WorkflowSteps({ status }: { status: WorkflowStatus }) {
  const idx = STEPS.findIndex((s) => s.match.includes(status));
  return (
    <ol aria-label="Workflow progress" className="card mb-6 grid grid-cols-5 gap-1 px-2 py-4 sm:px-5">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.key} aria-current={active ? 'step' : undefined} className="relative flex min-w-0 flex-col items-center gap-1.5 text-center">
            {i > 0 && <span aria-hidden className={cn('absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 rounded-full', i <= idx ? 'bg-green-500' : 'bg-ink-100')} />}
            <span
              className={cn(
                'relative z-[1] flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition',
                done ? 'bg-green-600 text-white' : active ? 'bg-green-800 text-white ring-4 ring-green-100' : 'bg-ink-100 text-ink-400',
              )}
            >
              {done || (active && status === 'published') ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn('text-[11px] font-semibold leading-tight sm:text-[13px]', active ? 'text-ink-900' : done ? 'text-ink-600' : 'text-ink-400')}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Phone-frame preview of the app's Library card + detail header (mockup "Mobile preview"). */
function MobilePreview({ draft }: { draft: ContentItem }) {
  const pill = draft.tags?.[0] ?? (draft.type === 'faq' ? 'FAQ' : CONTENT_TYPES.find((t) => t.value === draft.type)?.label ?? 'Article');
  const media = MEDIA_LABEL[draft.type];
  const photo = mediaPhoto(draft.media);
  return (
    <Card className="card-pad">
      <CardHeader title="Mobile preview" subtitle="How it appears in the app’s Library" icon={<Smartphone className="h-5 w-5" />} />
      <div className="mx-auto w-[252px] overflow-hidden rounded-[38px] border-[7px] border-green-950 bg-white px-3 pb-5 pt-3 shadow-lift" aria-label="Mobile preview">
        <div aria-hidden className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-ink-100" />
        <div className="mb-2.5 flex items-center justify-between font-display text-[13px] font-semibold text-green-950">
          <span aria-hidden>←</span>
          <span>Library</span>
          <span className="w-3" />
        </div>
        <div className="flex h-[108px] overflow-hidden rounded-[22px] bg-green-50 shadow-soft">
          <div className="flex min-w-0 flex-1 flex-col justify-between p-2.5">
            <span className="self-start rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-green-900 shadow-xs">{pill}</span>
            <span className="line-clamp-3 font-display text-[12.5px] font-semibold leading-tight text-green-950">{draft.title || 'Untitled content'}</span>
          </div>
          {photo ? (
            <Photo photo={photo} alt="" shape="none" className="w-[42%]" />
          ) : (
            <div className="flex w-[42%] items-center justify-center bg-gradient-to-br from-green-300 to-green-100 text-green-900">
              {media ? <PlayCircle className="h-8 w-8" /> : <FileText className="h-7 w-7" />}
            </div>
          )}
        </div>
        {media && (
          <div className="mt-2.5 flex h-24 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-green-800 to-green-950 text-[12px] font-bold text-white">
            <PlayCircle className="h-4 w-4" /> {draft.durationMin ? `${draft.durationMin} min ${media}` : media}
          </div>
        )}
        <p className="mt-2.5 text-[9.5px] italic text-green-700">
          {draft.medicalReviewer ? `Medically reviewed by ${draft.medicalReviewer}${draft.reviewDate ? ` · ${formatDate(draft.reviewDate, 'short')}` : ' · pending'}` : 'Medical review pending'}
        </p>
        <p className="mt-1 line-clamp-4 text-[11px] leading-snug text-ink-700">{draft.description || 'Short description appears here.'}</p>
        {!media && draft.durationMin ? <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-400">{draft.durationMin} min read</p> : null}
      </div>
    </Card>
  );
}

function validateFields(d: ContentItem): Errors {
  const e: Errors = {};
  if (d.title.trim().length < 5) e.title = 'Title must be at least 5 characters.';
  else if (d.title.length > 120) e.title = 'Keep the title under 120 characters.';
  if (d.description.trim().length < 10) e.description = 'Add a short description (at least 10 characters).';
  if (!d.author.trim()) e.author = 'Author is required.';
  if (d.body.trim().length < 40) e.body = 'Body must be at least 40 characters before review.';
  return e;
}

export default function ContentEditor() {
  const { id } = useParams();
  const isNew = !id;
  const { state, dispatch, audit, apiMode } = useAdmin();
  const { can, whoCan } = useAccess();
  const session = state.session!;
  const role = session.role;
  const toast = useToast();
  const nav = useNavigate();

  const saved = useMemo(() => (isNew ? null : state.content.find((c) => c.id === id) ?? null), [isNew, id, state.content]);
  const [draft, setDraft] = useState<ContentItem | null>(() => (isNew ? blank(can('edit_content') ? session.name : '') : saved));
  const [errors, setErrors] = useState<Errors>({});
  const [newVersion, setNewVersion] = useState(false);
  // Reviewers read the rendered body first; writers start in the Markdown editor.
  const [tab, setTab] = useState<'write' | 'preview'>(() => (isNew || (can('edit_content') && saved && EDITABLE.includes(saved.status)) ? 'write' : 'preview'));
  const [refInput, setRefInput] = useState('');
  const [upload, setUpload] = useState<{ name: string; progress: number } | null>(null);
  const [commentFor, setCommentFor] = useState<null | 'request_changes' | 'reject' | 'return'>(null);
  const [comment, setComment] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Re-sync when navigating between items.
  useEffect(() => {
    if (!isNew) setDraft(saved);
    setErrors({});
    setNewVersion(false);
    setTab(isNew || (can('edit_content') && saved && EDITABLE.includes(saved.status)) ? 'write' : 'preview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!draft) {
    return (
      <div className="card mx-auto mt-6 max-w-xl">
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Content not found"
          body="This item may have been removed."
          action={
            <Link to="/admin/content" className="text-sm font-semibold text-green-700 hover:underline">
              Back to library
            </Link>
          }
        />
      </div>
    );
  }

  const canEditFields = can('edit_content') && (isNew || EDITABLE.includes(draft.status) || newVersion);
  const isMedicalReviewer = can('medical_review') && draft.status === 'medical_review';
  const canEditRefs = canEditFields || isMedicalReviewer;
  const dirty = isNew ? true : JSON.stringify(draft) !== JSON.stringify(saved);
  const rules = MEDIA_RULES[draft.type];
  const words = draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0;

  const set = <K extends keyof ContentItem>(k: K, v: ContentItem[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  /**
   * Proposes the change. With the API the server decides whether the step is allowed (permissions,
   * separation of duties, safety checklist), writes author/reviewer/history, and its copy replaces ours.
   * A refusal is shown by the store and leaves the draft as it was.
   */
  const commit = async (item: ContentItem, action: string, auditAction: string, note?: string, toastTitle?: string, toastBody?: string) => {
    const entry: HistoryEntry = { at: new Date().toISOString(), actor: session.name, role, action, note, version: item.version };
    const next = { ...item, updatedDate: todayISO(), history: [...item.history, entry] };
    const result = await dispatch({ type: 'UPSERT_CONTENT', item: next });
    if (!result) return false;
    audit(auditAction, next.title || '(untitled)', note);
    setDraft(result.content.find((c) => c.id === next.id) ?? next);
    setErrors({});
    toast.success(toastTitle ?? action, toastBody);
    if (isNew) nav(`/admin/content/${next.id}`, { replace: true });
    return true;
  };

  // ---------- actions ----------
  const saveDraft = () => {
    if (draft.title.trim().length < 5) {
      setErrors({ title: 'Add a title (at least 5 characters) to save a draft.' });
      return;
    }
    if (newVersion) {
      const e = validateFields(draft);
      setErrors(e);
      if (Object.keys(e).length) return;
      void commit(
        {
          ...draft,
          version: draft.version + 1,
          versions: saved ? [...(saved.versions ?? []), snapshotOf(saved)] : draft.versions,
          status: 'medical_review',
          reviewDate: null,
          safetyChecks: Object.fromEntries(SAFETY_CHECKLIST.map((s) => [s.key, false])),
        },
        'Created new version & submitted for medical review',
        'content.new_version',
        undefined,
        `Version ${draft.version + 1} sent for review`,
        apiMode ? 'It’s hidden from the app until the new version is approved and published again.' : 'The current published version stays live until the new one is approved (demo behaviour).',
      ).then((ok) => ok && setNewVersion(false));
      return;
    }
    commit(draft, isNew ? 'Created draft' : 'Saved draft', isNew ? 'content.create' : 'content.save', undefined, 'Draft saved');
  };

  const submitForReview = () => {
    const e = validateFields(draft);
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error('Fix the highlighted fields', 'Required fields must be complete before medical review.');
      return;
    }
    commit({ ...draft, status: 'medical_review' }, 'Submitted for medical review', 'content.submit_review', undefined, 'Submitted for medical review');
  };

  const medicalApprove = () => {
    const e: Errors = {};
    if (!draft.references.length) e.references = 'Add at least one reference before approving (§40).';
    if (SAFETY_CHECKLIST.some((s) => !draft.safetyChecks[s.key])) e.safety = 'Complete every safety-wording check before approving.';
    if (draft.author.trim().toLowerCase() === session.name.trim().toLowerCase()) e.reviewer = 'Reviewers can’t approve content they authored [ADD A-13].';
    setErrors(e);
    if (Object.keys(e).length) return;
    commit({ ...draft, status: 'compliance_review', medicalReviewer: session.name, reviewDate: todayISO() }, 'Medical review approved', 'content.medical_approve', undefined, 'Medically approved', 'Sent to compliance review.');
  };

  const complianceApprove = () =>
    commit({ ...draft, status: 'approved' }, 'Compliance approved', 'content.compliance_approve', undefined, 'Compliance approved', 'Ready to publish or schedule.');

  const publishErrors = (): Errors => {
    const e: Errors = {};
    if (!draft.medicalReviewer) e.reviewer = 'A medical reviewer is required before publishing (§40).';
    if (!draft.reviewDate) e.reviewer = (e.reviewer ? e.reviewer + ' ' : '') + 'Review date is missing.';
    if (!draft.references.length) e.references = 'At least one reference is required before publishing (§40).';
    return e;
  };

  const publishNow = () => {
    const e = publishErrors();
    setErrors(e);
    if (Object.keys(e).length) return;
    commit({ ...draft, status: 'published', publishedDate: todayISO(), scheduledFor: null }, 'Published', 'content.publish', undefined, 'Published', 'Now visible in the app’s Learn section.');
  };

  const schedule = () => {
    const e = publishErrors();
    if (!scheduleAt) e.schedule = 'Choose a date and time.';
    else if (new Date(scheduleAt).getTime() <= Date.now() + 5 * 60_000) e.schedule = 'Schedule at least 5 minutes in the future.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setScheduleOpen(false);
    commit({ ...draft, status: 'scheduled', scheduledFor: scheduleAt }, 'Scheduled publication', 'content.schedule', scheduleAt.replace('T', ' '), 'Publication scheduled', `Goes live ${scheduleAt.replace('T', ' ')}.`);
  };

  const submitComment = () => {
    if (comment.trim().length < 10) {
      setErrors({ comment: 'Explain what needs to change (at least 10 characters).' });
      return;
    }
    const note = comment.trim();
    const sent =
      commentFor === 'request_changes'
        ? commit({ ...draft, status: 'changes_requested' }, 'Requested changes', 'content.request_changes', note, 'Changes requested', 'The author has been notified (simulated).')
        : commentFor === 'reject'
          ? commit({ ...draft, status: 'rejected' }, 'Rejected', 'content.reject', note, 'Content rejected')
          : commit({ ...draft, status: 'changes_requested' }, 'Returned by compliance', 'content.compliance_return', note, 'Returned to author');
    void sent.then((ok) => {
      if (!ok) return;
      setCommentFor(null);
      setComment('');
    });
  };

  // ---------- editor helpers ----------
  const wrap = (before: string, after = before, placeholder = 'text') => {
    const el = textRef.current;
    if (!el || !canEditFields) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const sel = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    set('body', next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  };
  const linePrefix = (prefix: string) => {
    const el = textRef.current;
    if (!el || !canEditFields) return;
    const { selectionStart: s, value } = el;
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    set('body', value.slice(0, lineStart) + prefix + value.slice(lineStart));
    requestAnimationFrame(() => el.focus());
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (!rules.types.includes(f.type)) {
      setErrors((x) => ({ ...x, media: `Unsupported file type (${f.type || 'unknown'}). Allowed: ${rules.label}.` }));
      return;
    }
    if (f.size > rules.max) {
      setErrors((x) => ({ ...x, media: `File is ${formatBytes(f.size)} — the limit is ${formatBytes(rules.max)}.` }));
      return;
    }
    setErrors((x) => ({ ...x, media: undefined }));
    setUpload({ name: f.name, progress: 0 });
    let p = 0;
    const t = window.setInterval(() => {
      p += 20;
      setUpload({ name: f.name, progress: p });
      if (p >= 100) {
        window.clearInterval(t);
        const media: MediaFile = { name: f.name, size: f.size, type: f.type };
        set('media', media);
        setUpload(null);
        toast.success('Media uploaded (simulated)', f.name);
      }
    }, 220);
  };

  const addRef = () => {
    const r = refInput.trim();
    if (r.length < 3) {
      setErrors((x) => ({ ...x, references: 'Enter a citation or URL (at least 3 characters).' }));
      return;
    }
    if (draft.references.includes(r)) {
      setErrors((x) => ({ ...x, references: 'That reference is already listed.' }));
      return;
    }
    set('references', [...draft.references, r]);
    setRefInput('');
    setErrors((x) => ({ ...x, references: undefined }));
  };

  const libraryMatches = state.media.filter((m) => rules.types.includes(m.mime));
  const medicalReviewers = state.staff.filter((m) => m.role === 'medical_content_reviewer');
  const checksDone = SAFETY_CHECKLIST.filter((s) => draft.safetyChecks[s.key]).length;
  const attachedPhoto = mediaPhoto(draft.media);

  // ---------- workflow panel ----------
  let actions: ReactNode = null;
  if (canEditFields) {
    actions = (
      <div className="space-y-2">
        {newVersion ? (
          <Button className="w-full" leftIcon={<Send className="h-4 w-4" />} onClick={saveDraft}>
            Submit version {draft.version + 1} for review
          </Button>
        ) : (
          <>
            <Button className="w-full" leftIcon={<Send className="h-4 w-4" />} onClick={submitForReview}>
              Submit for medical review
            </Button>
            <Button className="w-full" variant="outline" onClick={saveDraft} disabled={!dirty}>
              {isNew ? 'Create draft' : 'Save draft'}
            </Button>
          </>
        )}
        {newVersion && (
          <Button
            className="w-full"
            variant="ghost"
            leftIcon={<Undo2 className="h-4 w-4" />}
            onClick={() => {
              setNewVersion(false);
              setDraft(saved);
            }}
          >
            Discard new version
          </Button>
        )}
      </div>
    );
  } else if (isMedicalReviewer) {
    actions = (
      <div className="space-y-2">
        <Button className="w-full" leftIcon={<ShieldCheck className="h-4 w-4" />} onClick={medicalApprove}>
          Approve medically
        </Button>
        <Button className="w-full" variant="outline" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setCommentFor('request_changes')}>
          Request changes
        </Button>
        <Button className="w-full" variant="ghost" leftIcon={<XCircle className="h-4 w-4 text-danger" />} onClick={() => setCommentFor('reject')}>
          Reject
        </Button>
      </div>
    );
  } else if (draft.status === 'compliance_review' && can('compliance_review')) {
    actions = (
      <div className="space-y-2">
        <Button className="w-full" leftIcon={<Check className="h-4 w-4" />} onClick={complianceApprove}>
          Approve for publishing
        </Button>
        <Button className="w-full" variant="outline" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setCommentFor('return')}>
          Return to author
        </Button>
      </div>
    );
  } else if ((draft.status === 'approved' || draft.status === 'scheduled') && can('publish_content')) {
    actions = (
      <div className="space-y-2">
        <Button className="w-full" onClick={publishNow}>
          Publish now
        </Button>
        {draft.status === 'approved' ? (
          <Button className="w-full" variant="outline" leftIcon={<CalendarClock className="h-4 w-4" />} onClick={() => setScheduleOpen(true)}>
            Schedule…
          </Button>
        ) : (
          <Button className="w-full" variant="outline" onClick={() => commit({ ...draft, status: 'approved', scheduledFor: null }, 'Cancelled schedule', 'content.unschedule', undefined, 'Schedule cancelled')}>
            Cancel schedule
          </Button>
        )}
      </div>
    );
  } else if (draft.status === 'published' && (can('publish_content') || can('edit_content'))) {
    actions = (
      <div className="space-y-2">
        {can('edit_content') && (
          <Button
            className="w-full"
            variant="outline"
            leftIcon={<GitBranch className="h-4 w-4" />}
            onClick={() => {
              setNewVersion(true);
              setTab('write');
            }}
          >
            Edit as new version (v{draft.version + 1})
          </Button>
        )}
        {can('publish_content') && (
          <Button className="w-full" variant="ghost" leftIcon={<Archive className="h-4 w-4 text-danger" />} onClick={() => setConfirmArchive(true)}>
            Archive
          </Button>
        )}
      </div>
    );
  } else if (draft.status === 'archived' && can('edit_content')) {
    actions = (
      <Button className="w-full" variant="outline" onClick={() => commit({ ...draft, status: 'draft' }, 'Restored to draft', 'content.restore', undefined, 'Restored to draft')}>
        Restore to draft
      </Button>
    );
  } else {
    const waitingFor =
      draft.status === 'medical_review' ? 'medical_review' : draft.status === 'compliance_review' ? 'compliance_review' : draft.status === 'approved' || draft.status === 'scheduled' ? 'publish_content' : 'edit_content';
    actions = (
      <p className="rounded-2xl bg-ink-50 p-3.5 text-sm leading-relaxed text-ink-600">
        Next step needs: <strong className="text-ink-800">{whoCan(waitingFor)}</strong>. You’re signed in as {ROLE_META[role].label}.
      </p>
    );
  }

  const readOnly = !canEditFields;

  return (
    <>
      <AdminHeader
        eyebrow={false}
        breadcrumbs={[{ label: 'Content library', to: '/admin/content' }, { label: isNew ? 'New content' : draft.title || 'Untitled' }]}
        title={isNew ? 'New content' : draft.title || 'Untitled'}
        badge={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={draft.status} />
            <Badge tone="gray">v{draft.version}</Badge>
            {dirty && !isNew && <Badge tone="warning">Unsaved changes</Badge>}
          </span>
        }
        subtitle={`${STATUS_META[draft.status].label} · SRS status “${STATUS_META[draft.status].srs}” · last updated ${formatDate(draft.updatedDate)}`}
      />

      <WorkflowSteps status={draft.status} />

      {draft.status === 'changes_requested' || draft.status === 'rejected' ? (
        <Notice tone="warning" className="mb-6" title={draft.status === 'rejected' ? 'Rejected by medical review' : 'Changes requested'}>
          {[...draft.history].reverse().find((h) => h.note)?.note ?? 'See the workflow timeline for reviewer comments.'}
        </Notice>
      ) : null}
      {newVersion && (
        <Notice tone="info" className="mb-6" title={`Editing version ${draft.version + 1}`}>
          Changes to published content create a new version that must pass medical and compliance review again (§40).
        </Notice>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Editor pane */}
        <div className="min-w-0 space-y-6">
          <Section n="01 · Basics" title="Details" subtitle="SRS §39 content fields" icon={<FileText className="h-5 w-5" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" required htmlFor="c-title" error={errors.title} className="sm:col-span-2">
                <Input id="c-title" value={draft.title} onChange={(e) => set('title', e.target.value)} invalid={!!errors.title} disabled={readOnly} maxLength={140} placeholder="e.g. Comfort strategies for period cramps" />
              </Field>
              <Field label="Description" required htmlFor="c-desc" error={errors.description} className="sm:col-span-2" hint={`${draft.description.length}/240`}>
                <Textarea id="c-desc" value={draft.description} onChange={(e) => set('description', e.target.value.slice(0, 240))} invalid={!!errors.description} disabled={readOnly} className="min-h-[76px]" />
              </Field>
              <Field label="Type" htmlFor="c-type">
                <Select id="c-type" value={draft.type} disabled={readOnly} onChange={(e) => set('type', e.target.value as ContentType)}>
                  {CONTENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Duration (minutes)" htmlFor="c-dur" hint="Read, listen or watch time shown on the app card.">
                <Input
                  id="c-dur"
                  type="number"
                  min={1}
                  max={240}
                  value={draft.durationMin ?? ''}
                  disabled={readOnly}
                  onChange={(e) => set('durationMin', e.target.value === '' ? null : Math.max(1, Math.min(240, Math.round(Number(e.target.value)))))}
                />
              </Field>
              <Field label="Category" htmlFor="c-cat">
                <Select id="c-cat" value={draft.category} disabled={readOnly} onChange={(e) => setDraft((d) => (d ? { ...d, category: e.target.value, topic: undefined } : d))}>
                  {state.taxonomy.categories.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                  {!state.taxonomy.categories.some((c) => c.key === draft.category) && <option value={draft.category}>{draft.category}</option>}
                </Select>
              </Field>
              <Field label="Subcategory" htmlFor="c-sub">
                <Select id="c-sub" value={draft.topic ?? ''} disabled={readOnly} onChange={(e) => set('topic', e.target.value || undefined)}>
                  <option value="">None</option>
                  {(state.taxonomy.categories.find((c) => c.key === draft.category)?.subs ?? []).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Section>

          <Section
            n="02 · Body"
            title="Body"
            subtitle={
              <>
                Markdown · {words} words · ~{Math.max(1, Math.round(words / 200))} min read
              </>
            }
            icon={<PenLine className="h-5 w-5" />}
            action={
              <Segmented
                size="sm"
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'write', label: 'Write' },
                  { value: 'preview', label: 'Preview' },
                ]}
                className="2xl:hidden"
              />
            }
          >
            {canEditFields && (
              <div className={cn('mb-2 flex flex-wrap gap-1 rounded-full border border-ink-100 bg-ink-50 p-1', tab === 'preview' && 'hidden 2xl:flex')} role="toolbar" aria-label="Formatting">
                {[
                  { label: 'Heading', icon: Heading2, fn: () => linePrefix('## ') },
                  { label: 'Bold', icon: Bold, fn: () => wrap('**') },
                  { label: 'Italic', icon: Italic, fn: () => wrap('_') },
                  { label: 'Bulleted list', icon: List, fn: () => linePrefix('- ') },
                  { label: 'Quote', icon: Quote, fn: () => linePrefix('> ') },
                  { label: 'Link', icon: Link2, fn: () => wrap('[', '](https://)', 'link text') },
                ].map((b) => (
                  <button key={b.label} type="button" aria-label={b.label} title={b.label} onClick={b.fn} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition hover:bg-white hover:text-green-800 hover:shadow-xs">
                    <b.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-4 2xl:grid-cols-2">
              <div className={cn(tab === 'preview' && 'hidden 2xl:block')}>
                <Textarea
                  ref={textRef}
                  aria-label="Body (Markdown)"
                  value={draft.body}
                  onChange={(e) => set('body', e.target.value)}
                  invalid={!!errors.body}
                  disabled={readOnly}
                  className="font-mono text-[13px] leading-relaxed"
                  style={{ minHeight: 360 }}
                  placeholder={'## Heading\nWrite in plain, non-diagnostic language…'}
                />
                {errors.body && <p className="mt-1.5 text-sm font-medium text-danger">{errors.body}</p>}
              </div>
              <div className={cn('min-h-[360px] rounded-2xl border border-ink-100 bg-canvas p-5', tab === 'write' && 'hidden 2xl:block')}>
                <p className="eyebrow mb-3">Live preview</p>
                {draft.body.trim() ? <MarkdownPreview source={draft.body} /> : <p className="text-sm text-ink-400">Nothing to preview yet.</p>}
              </div>
            </div>
          </Section>

          <Section n="03 · Media" title="Media" subtitle={rules.label} icon={<ImagePlus className="h-5 w-5" />} action={<BackendBadge label="Upload simulated" />}>
            {draft.media ? (
              <div className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-canvas p-3">
                {attachedPhoto ? (
                  <Photo photo={attachedPhoto} alt={`Attached image ${draft.media.name}`} className="h-20 w-28 shrink-0 rounded-xl" />
                ) : (
                  <span className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-100 to-green-50 text-green-700">
                    {draft.media.type.startsWith('audio/') ? <Headphones className="h-7 w-7" /> : draft.media.type.startsWith('video/') ? <PlayCircle className="h-7 w-7" /> : <ImagePlus className="h-7 w-7" />}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-800">{draft.media.name}</span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-500">
                    {draft.media.type} · {formatBytes(draft.media.size)}
                  </span>
                </span>
                {canEditFields && (
                  <button aria-label="Remove media" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-danger-soft hover:text-danger" onClick={() => set('media', null)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : upload ? (
              <div className="rounded-2xl border border-ink-100 bg-canvas p-4">
                <p className="mb-2 truncate text-sm font-semibold text-ink-700">Uploading {upload.name}…</p>
                <ProgressBar value={upload.progress / 100} label="Upload progress" />
              </div>
            ) : canEditFields ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-green-300 bg-green-50/50 px-4 py-7 text-center transition hover:border-green-500 hover:bg-green-50">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-green-700 shadow-soft">
                    <Upload className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-ink-700">Drop a file or click to upload</span>
                  <span className="text-xs leading-relaxed text-ink-500">Type and size are validated; production stores files privately with signed URLs (§47).</span>
                  <input type="file" className="sr-only" accept={rules.accept} onChange={(e) => onFile(e.target.files?.[0])} />
                </label>
                {libraryMatches.length > 0 ? (
                  <Field label="…or choose from the media library" htmlFor="c-media-lib">
                    <Select
                      id="c-media-lib"
                      value=""
                      onChange={(e) => {
                        const m = state.media.find((x) => x.id === e.target.value);
                        if (m) set('media', { name: m.name, size: m.size, type: m.mime });
                      }}
                    >
                      <option value="">Select a file…</option>
                      {libraryMatches.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} · {formatBytes(m.size)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : (
                  <p className="text-sm text-ink-500">No matching files in the media library yet.</p>
                )}
              </div>
            ) : (
              <p className="rounded-2xl bg-ink-50 px-4 py-5 text-center text-sm text-ink-500">No media attached.</p>
            )}
            {errors.media && <p className="mt-2 text-sm font-medium text-danger">{errors.media}</p>}
          </Section>

          <Section n="04 · Audience & tags" title="Audience & tags" subtitle="Who sees it and where it appears in the Library" icon={<Tags className="h-5 w-5" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="label">Tags</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Tags">
                  {state.taxonomy.tags.map((t) => {
                    const on = draft.tags?.includes(t) ?? false;
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={on}
                        disabled={readOnly}
                        onClick={() => set('tags', on ? (draft.tags ?? []).filter((x) => x !== t) : [...(draft.tags ?? []), t])}
                        className={cn(
                          'inline-flex min-h-[38px] items-center rounded-full border px-3.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
                          on ? 'border-green-700 bg-green-700 text-white shadow-soft' : 'border-ink-200 bg-white text-ink-700 hover:border-green-400 hover:text-green-800',
                        )}
                      >
                        {on && <Check className="mr-1 h-3.5 w-3.5" />}
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Field label="Life stage" htmlFor="c-stage">
                <Select id="c-stage" value={draft.lifeStage} disabled={readOnly} onChange={(e) => set('lifeStage', e.target.value as LifeStage)}>
                  {LIFE_STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Language" htmlFor="c-lang">
                <Select id="c-lang" value={draft.language} disabled={readOnly} onChange={(e) => set('language', e.target.value)}>
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Section>

          <Section n="05 · Authorship & dates" title="Authorship & review" subtitle="Recorded on the content history (§39, §40)" icon={<UserRoundCheck className="h-5 w-5" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* With the API, author and reviewer are recorded by the server from the signed-in accounts. */}
              <Field label="Author" required htmlFor="c-author" error={errors.author} hint={apiMode ? 'Recorded by the server from the account that created it' : undefined}>
                <Input id="c-author" value={draft.author} disabled={readOnly || apiMode} invalid={!!errors.author} onChange={(e) => set('author', e.target.value)} />
              </Field>
              <Field label="Medical reviewer" htmlFor="c-reviewer" error={errors.reviewer} hint={draft.reviewDate ? `Reviewed ${formatDate(draft.reviewDate)}` : 'Set when a medical reviewer approves'}>
                <Select id="c-reviewer" value={draft.medicalReviewer} disabled={readOnly || apiMode} invalid={!!errors.reviewer} onChange={(e) => set('medicalReviewer', e.target.value)}>
                  <option value="">Not yet assigned</option>
                  {medicalReviewers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                  {draft.medicalReviewer && !medicalReviewers.some((m) => m.name === draft.medicalReviewer) && <option value={draft.medicalReviewer}>{draft.medicalReviewer}</option>}
                </Select>
              </Field>
              <Field label="Published date">
                <Input value={draft.publishedDate ? formatDate(draft.publishedDate) : 'Not published'} disabled readOnly />
              </Field>
              <Field label="Updated date">
                <Input value={formatDate(draft.updatedDate)} disabled readOnly />
              </Field>
            </div>
          </Section>

          <Section n="06 · References" title="References" subtitle="Required before approval and publishing (§40)" icon={<Link2 className="h-5 w-5" />}>
            {draft.references.length === 0 ? (
              <p className="mb-3 rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-500">No references yet.</p>
            ) : (
              <ol className="mb-3 space-y-2">
                {draft.references.map((r, i) => (
                  <li key={r} className="flex items-start justify-between gap-2 rounded-2xl bg-ink-50 px-3.5 py-2.5 text-sm text-ink-700">
                    <span className="flex min-w-0 gap-2.5 break-words">
                      <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs text-green-800 shadow-xs">{i + 1}</span>
                      <span className="min-w-0 pt-0.5">{r}</span>
                    </span>
                    {canEditRefs && (
                      <button aria-label={`Remove reference ${i + 1}`} className="shrink-0 rounded-full p-1.5 text-ink-400 hover:bg-white hover:text-danger" onClick={() => set('references', draft.references.filter((x) => x !== r))}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {canEditRefs && (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    value={refInput}
                    onChange={(e) => setRefInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addRef();
                      }
                    }}
                    placeholder="Citation or https:// link"
                    aria-label="New reference"
                    invalid={!!errors.references}
                  />
                </div>
                <Button variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={addRef}>
                  Add
                </Button>
              </div>
            )}
            {errors.references && <p className="mt-2 text-sm font-medium text-danger">{errors.references}</p>}
            {isMedicalReviewer && dirty && (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => commit(draft, 'Updated references & checklist', 'content.reviewer_update', undefined, 'Review notes saved')}>
                Save review notes
              </Button>
            )}
          </Section>
        </div>

        {/* Review side panel */}
        <aside aria-label="Review panel" className="min-w-0 xl:sticky xl:top-[96px] xl:self-start">
          <div className="scrollbar-thin space-y-6 xl:-m-1 xl:max-h-[calc(100vh-116px)] xl:overflow-y-auto xl:p-1">
            <Card className="card-pad">
              <CardHeader title="Workflow" subtitle="Writer → Medical → Compliance → Published (§40)" icon={<Send className="h-5 w-5" />} />
              <p className="-mt-1 mb-4 rounded-2xl bg-peach-50 px-3.5 py-2.5 text-xs leading-relaxed text-ink-600">
                Compliance approval is an <strong>Admin</strong> capability (decision D-08, option B) — there is no separate compliance role, and it must come from someone other than the medical reviewer.
              </p>
              {errors.reviewer && (
                <p className="mb-3 flex gap-2 rounded-2xl bg-danger-soft p-3 text-sm text-danger">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {errors.reviewer}
                </p>
              )}
              {actions}
            </Card>

            {(isMedicalReviewer || draft.status !== 'draft') && (
              <Card className="card-pad">
                <CardHeader title="Safety-wording checklist" subtitle="Medical reviewer (§6.3, §67)" icon={<ShieldCheck className="h-5 w-5" />} />
                <div className="-mt-1 mb-4">
                  <div className="mb-1.5 flex items-center justify-between font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">
                    <span>Review checklist</span>
                    <span className={checksDone === SAFETY_CHECKLIST.length ? 'text-green-700' : undefined}>
                      {checksDone}/{SAFETY_CHECKLIST.length}
                    </span>
                  </div>
                  <ProgressBar value={checksDone / SAFETY_CHECKLIST.length} height="h-2" label="Safety checks complete" />
                </div>
                <div className="space-y-2">
                  {SAFETY_CHECKLIST.map((s) => (
                    <div key={s.key} className={cn('rounded-2xl border px-3 py-2.5 transition', draft.safetyChecks[s.key] ? 'border-green-200 bg-green-50/60' : 'border-ink-100 bg-white')}>
                      <Checkbox
                        checked={!!draft.safetyChecks[s.key]}
                        disabled={!isMedicalReviewer}
                        onChange={(v) => set('safetyChecks', { ...draft.safetyChecks, [s.key]: v })}
                        label={
                          <span>
                            {s.label} <span className="font-mono text-[10.5px] text-ink-400">({s.srs})</span>
                          </span>
                        }
                      />
                    </div>
                  ))}
                </div>
                {errors.safety && <p className="mt-3 text-sm font-medium text-danger">{errors.safety}</p>}
              </Card>
            )}

            <MobilePreview draft={draft} />

            <Card className="card-pad">
              <CardHeader
                title="Version history & audit trail"
                subtitle={`${draft.history.length} events · ${(draft.versions?.length ?? 0) + 1} version${draft.versions?.length ? 's' : ''}`}
                icon={<History className="h-5 w-5" />}
                action={
                  !isNew && (
                    <Link to={`/admin/content/${draft.id}/versions`} className="text-sm font-semibold text-green-700 hover:underline">
                      Compare versions
                    </Link>
                  )
                }
              />
              {draft.history.length === 0 ? (
                <p className="rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-500">No history yet — create the draft to start the trail.</p>
              ) : (
                <ol className="relative ml-1.5 space-y-4 border-l-2 border-ink-100 pl-5">
                  {[...draft.history].reverse().map((h, i) => (
                    <li key={i} className="relative">
                      <span className={cn('absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white ring-2', i === 0 ? 'bg-green-600 ring-green-200' : 'bg-green-300 ring-green-50')} />
                      <p className="text-sm font-semibold text-ink-900">
                        {h.action} <span className="font-medium text-ink-400">· v{h.version}</span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
                        {h.actor} <RoleBadge role={h.role} />
                      </p>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-400">{formatDateTime(h.at)}</p>
                      {h.note && <p className="mt-1.5 rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-600">“{h.note}”</p>}
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </aside>
      </div>

      <Modal
        open={!!commentFor}
        onClose={() => {
          setCommentFor(null);
          setComment('');
        }}
        title={commentFor === 'reject' ? 'Reject content' : commentFor === 'return' ? 'Return to author' : 'Request changes'}
        description="Your comment is shared with the author and stored in the audit trail."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCommentFor(null)}>
              Cancel
            </Button>
            <Button variant={commentFor === 'reject' ? 'danger' : 'primary'} onClick={submitComment}>
              {commentFor === 'reject' ? 'Reject' : 'Send'}
            </Button>
          </>
        }
      >
        <Field label="Comment" required htmlFor="wf-comment" error={errors.comment}>
          <Textarea id="wf-comment" value={comment} onChange={(e) => setComment(e.target.value)} invalid={!!errors.comment} placeholder="e.g. Please add a signpost to a healthcare professional in the last paragraph." />
        </Field>
      </Modal>

      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Schedule publication"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={schedule}>Schedule</Button>
          </>
        }
      >
        <Field label="Publish at" required htmlFor="sched" error={errors.schedule} hint="Your local time. A background job publishes it (simulated).">
          <Input id="sched" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} invalid={!!errors.schedule} />
        </Field>
      </Modal>

      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() => commit({ ...draft, status: 'archived' }, 'Archived', 'content.archive', undefined, 'Content archived')}
        title="Archive this content?"
        body="It will be removed from the app’s Learn section. You can restore it to draft later."
        confirmLabel="Archive"
        danger
      />
    </>
  );
}
