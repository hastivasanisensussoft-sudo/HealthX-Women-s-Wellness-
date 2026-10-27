import { useState } from 'react';
import { ArrowRight, CircleHelp, ClipboardCheck, Clock, FileText, Headphones, Hourglass, Image as ImageIcon, ListChecks, Lock, PenLine, PlayCircle, ShieldCheck, type LucideIcon } from 'lucide-react';
import { diffDays, todayISO, type ContentType } from '@healthx/shared';
import { Avatar } from '@/components/brand/Brand';
import { Badge, ButtonLink, Card, CardSkeleton, EmptyState, Notice, Tabs, toneClass, type Tone } from '@/components/ui';
import { cn, useDemoLoading } from '@/lib/utils';
import { useAccess, useAdmin } from '../adminState';
import type { ContentItem, WorkflowStatus } from '../adminData';
import { AdminHeader, AdminHero, HeroStat, StatusBadge } from '../components';
import { formatDateTime } from '../helpers';
import type { Capability } from '../rbac';

type Queue = 'medical' | 'compliance' | 'changes';

const QUEUES: Record<Queue, { status: WorkflowStatus; label: string; cap: Capability; help: string }> = {
  medical: { status: 'medical_review', label: 'Medical review', cap: 'medical_review', help: 'Check accuracy, references and safety wording (§6.3).' },
  compliance: { status: 'compliance_review', label: 'Compliance review', cap: 'compliance_review', help: 'Final compliance check before publishing — held by Admins (§40, D-08 option B).' },
  changes: { status: 'changes_requested', label: 'Changes requested', cap: 'edit_content', help: 'Returned to authors with reviewer comments.' },
};

const TYPE_ICON: Record<ContentType, { icon: LucideIcon; tone: Tone }> = {
  article: { icon: FileText, tone: 'green' },
  video: { icon: PlayCircle, tone: 'peach' },
  infographic: { icon: ImageIcon, tone: 'sky' },
  faq: { icon: CircleHelp, tone: 'lavender' },
  podcast: { icon: Headphones, tone: 'indigo' },
  program: { icon: ListChecks, tone: 'rose' },
};

function submittedAt(c: ContentItem): string | undefined {
  return [...c.history].reverse().find((h) => /Submitted|Medical review approved|Requested changes|Returned/.test(h.action))?.at;
}

const ageOf = (c: ContentItem) => {
  const at = submittedAt(c);
  return at ? diffDays(at.slice(0, 10), todayISO()) : 0;
};

export default function Reviews() {
  const { state } = useAdmin();
  const { can, whoCan } = useAccess();
  const loading = useDemoLoading(400);
  const initial: Queue = can('medical_review') ? 'medical' : can('compliance_review') ? 'compliance' : 'changes';
  const [tab, setTab] = useState<Queue>(initial);
  const q = QUEUES[tab];
  const items = state.content.filter((c) => c.status === q.status);
  const mayAct = can(q.cap);
  const countOf = (k: Queue) => state.content.filter((c) => c.status === QUEUES[k].status).length;
  const oldest = items.reduce((m, c) => Math.max(m, ageOf(c)), 0);

  return (
    <>
      <AdminHeader title="Review queue" subtitle="Content moving through the §40 workflow: Writer → Medical Reviewer → Compliance → Published." />

      <AdminHero
        eyebrow="§40 review workflow"
        title={
          <>
            {items.length} {items.length === 1 ? 'item' : 'items'} in <span className="text-green-300">{q.label.toLowerCase()}</span>
          </>
        }
        aside={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
            <HeroStat label="Medical" value={countOf('medical')} hint="Accuracy & safety" icon={<ShieldCheck className="h-3.5 w-3.5" />} />
            <HeroStat label="Compliance" value={countOf('compliance')} hint="Admin sign-off" icon={<ClipboardCheck className="h-3.5 w-3.5" />} />
            <HeroStat label="Returned" value={countOf('changes')} hint="With authors" icon={<PenLine className="h-3.5 w-3.5" />} />
            <HeroStat label="Oldest" value={items.length ? `${oldest}d` : '—'} hint="In this queue" icon={<Hourglass className="h-3.5 w-3.5" />} />
          </div>
        }
      >
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-green-50/80">{q.help}</p>
      </AdminHero>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onChange={setTab} tabs={(Object.keys(QUEUES) as Queue[]).map((k) => ({ value: k, label: QUEUES[k].label, count: countOf(k) }))} />
        {!mayAct && (
          <Badge tone="gray" className="self-start !whitespace-normal lg:self-auto" icon={<Lock className="h-3 w-3" />}>
            View only — needs {whoCan(q.cap)}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={4} />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="Queue is empty" body="Nothing is waiting in this step right now." />
        </Card>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3" aria-label={`${q.label} queue`}>
          {items.map((c) => {
            const at = submittedAt(c);
            const age = ageOf(c);
            const ti = TYPE_ICON[c.type] ?? TYPE_ICON.article;
            return (
              <li key={c.id} className="card flex flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start gap-3">
                  <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', toneClass(ti.tone))}>
                    <ti.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-400">
                      {c.type === 'faq' ? 'FAQ' : c.type} · {c.category.replace('_', ' ')} · v{c.version}
                    </p>
                    <h3 className="mt-1 line-clamp-2 font-display text-[17px] font-semibold leading-snug tracking-[-0.01em] text-ink-900">{c.title}</h3>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-500">{c.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StatusBadge status={c.status} />
                  {age >= 3 && <Badge tone="warning">Waiting {age} days</Badge>}
                </div>
                <div className="mt-auto pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={c.author || '—'} size={32} />
                      <span className="min-w-0 leading-tight">
                        <span className="block truncate text-sm font-semibold text-ink-800">{c.author || '—'}</span>
                        {at && (
                          <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                            <Clock className="h-3 w-3" /> {formatDateTime(at)}
                          </span>
                        )}
                      </span>
                    </span>
                    <ButtonLink to={`/admin/content/${c.id}`} size="sm" variant={mayAct ? 'primary' : 'outline'} rightIcon={<ArrowRight className="h-4 w-4" />}>
                      {mayAct ? (tab === 'changes' ? 'Revise' : 'Start review') : 'View'}
                    </ButtonLink>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Notice tone="info" className="mt-6">
        Reviewers can’t approve content they authored [ADD A-13]. Every decision is written to the content history and the audit log.
      </Notice>
    </>
  );
}
