/** Building blocks for the app-activity views (timeline rows, category tiles, data-source badges). */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BadgeCheck,
  Bell,
  BookOpen,
  Bot,
  CalendarHeart,
  CreditCard,
  Droplets,
  Dumbbell,
  Flower2,
  HeartPulse,
  Lightbulb,
  ListChecks,
  LogIn,
  Moon,
  Plug,
  Salad,
  ShieldCheck,
  Smartphone,
  Smile,
  Sprout,
  Target,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { ACTIVITY_CATEGORIES, timeAgo, type ActivityCategory, type ActivityEvent, type ActivitySource } from '@healthx/shared';
import { Badge, toneClass, type BadgeTone, type Tone } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from './helpers';

const CATEGORY_UI: Record<ActivityCategory, { icon: LucideIcon; tone: Tone }> = {
  account: { icon: LogIn, tone: 'green' },
  onboarding: { icon: BadgeCheck, tone: 'green' },
  profile: { icon: UserRound, tone: 'green' },
  cycle: { icon: CalendarHeart, tone: 'rose' },
  symptoms: { icon: HeartPulse, tone: 'rose' },
  mood: { icon: Smile, tone: 'lavender' },
  fertility: { icon: Flower2, tone: 'lavender' },
  life_stage: { icon: Sprout, tone: 'peach' },
  fitness: { icon: Dumbbell, tone: 'green' },
  nutrition: { icon: Salad, tone: 'butter' },
  hydration: { icon: Droplets, tone: 'sky' },
  sleep: { icon: Moon, tone: 'indigo' },
  habits: { icon: ListChecks, tone: 'green' },
  goals: { icon: Target, tone: 'peach' },
  plan: { icon: ListChecks, tone: 'butter' },
  insights: { icon: Lightbulb, tone: 'butter' },
  content: { icon: BookOpen, tone: 'sky' },
  coach: { icon: Bot, tone: 'lavender' },
  notifications: { icon: Bell, tone: 'peach' },
  privacy: { icon: ShieldCheck, tone: 'green' },
  integrations: { icon: Plug, tone: 'sky' },
  subscription: { icon: CreditCard, tone: 'butter' },
  community: { icon: Users, tone: 'lavender' },
  app: { icon: Smartphone, tone: 'indigo' },
};

const SOURCE: Record<ActivitySource, { label: string; tone: BadgeTone }> = {
  mobile: { label: 'Mobile app', tone: 'sky' },
  web: { label: 'Web', tone: 'gray' },
  server: { label: 'Server', tone: 'gray' },
  seed: { label: 'Seeded history', tone: 'gray' },
};

export function SourceBadge({ source }: { source: ActivitySource }) {
  return <Badge tone={SOURCE[source].tone}>{SOURCE[source].label}</Badge>;
}

/** "Live" when the numbers come from the API; "Simulated" in the offline demo. */
export function DataSourceBadge({ apiMode }: { apiMode: boolean }) {
  return apiMode ? (
    <Badge tone="mint" icon={<Activity className="h-3 w-3" />}>
      Live · recorded from the mobile app
    </Badge>
  ) : (
    <Badge tone="butter">Simulated data</Badge>
  );
}

export function CategoryIcon({ category, size = 'md' }: { category: ActivityCategory; size?: 'sm' | 'md' }) {
  const ui = CATEGORY_UI[category];
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-full', toneClass(ui.tone), size === 'sm' ? 'h-8 w-8' : 'h-10 w-10')}>
      <ui.icon className={size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
    </span>
  );
}

/** Newest-first activity rows. With `users`, each row names and links the person (Admin views only). */
export function ActivityList({ events, showUser, empty }: { events: (ActivityEvent & { userName?: string })[]; showUser?: boolean; empty?: ReactNode }) {
  if (!events.length) return <p className="px-1 py-6 text-center text-sm text-ink-500">{empty ?? 'No activity recorded yet.'}</p>;
  return (
    <ol className="divide-y divide-ink-100">
      {events.map((e) => (
        <li key={e.id} className="flex items-start gap-3 py-3">
          <CategoryIcon category={e.category} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900">
              {showUser && e.userName && (
                <>
                  <Link to={`/admin/users/${encodeURIComponent(e.userId)}`} className="text-green-800 hover:underline">
                    {e.userName}
                  </Link>{' '}
                  <span className="font-normal text-ink-500">·</span>{' '}
                </>
              )}
              {e.label}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
              <span title={formatDateTime(e.at)}>{timeAgo(e.at)}</span>
              <span aria-hidden>·</span>
              <span>{ACTIVITY_CATEGORIES[e.category].label}</span>
              <span aria-hidden>·</span>
              <span className="font-mono text-[11px] text-ink-400">{e.event}</span>
              {e.detail && <span className="rounded-full bg-ink-100 px-2 py-0.5 font-mono text-[10.5px] text-ink-600">{e.detail}</span>}
            </p>
          </div>
          <SourceBadge source={e.source} />
        </li>
      ))}
    </ol>
  );
}

/** Event counts per module, largest first (counts only — never values). */
export function CategoryBars({ byCategory, limit = 10 }: { byCategory: Record<ActivityCategory, number>; limit?: number }) {
  const rows = (Object.entries(byCategory) as [ActivityCategory, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, limit);
  const max = Math.max(1, ...rows.map(([, n]) => n));
  if (!rows.length) return <p className="py-6 text-center text-sm text-ink-500">No activity in this period.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map(([k, n]) => (
        <li key={k} className="flex items-center gap-3">
          <CategoryIcon category={k} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-semibold text-ink-800">{ACTIVITY_CATEGORIES[k].label}</span>
              <span className="tabular-nums text-ink-600">{n.toLocaleString('en-US')}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100" aria-hidden>
              <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.max(4, (n / max) * 100)}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
