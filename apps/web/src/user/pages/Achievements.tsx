import { useState } from 'react';
import { Flame, HeartHandshake, Medal, Sparkles, Trophy } from 'lucide-react';
import { habitDone, lastNDays, streak } from '@healthx/shared';
import { useAppState } from '@/store/AppStore';
import { ButtonLink, Card, CardHeader, EmptyState, Notice, PageHeader, PhaseBadge, RouteTabs, SectionTitle, Segmented } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { GOALS_TABS } from '@/user/layout/sectionTabs';
import { BadgeCard } from '@/user/components/wellness-ui/Badges';
import { HeroHeading, HeroPanel, HeroStat } from '@/user/components/wellness-ui/Hero';

type Filter = 'all' | 'earned' | 'progress';

/** Streaks & badges (SRS §35 gamification, mockup M43) — everyday habits only. */
export default function Achievements() {
  const state = useAppState();
  const [filter, setFilter] = useState<Filter>('all');
  const checkInStreak = streak(state, (d) => state.checkIns.some((c) => c.date === d));
  const earned = state.badges.filter((b) => b.earnedAt);
  const habitStreaks = state.habits
    .map((h) => ({ h, n: streak(state, (d) => habitDone(state, h.id, d)) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  const last14 = lastNDays(state.today, 14);
  const shown = state.badges.map((b, i) => ({ b, i })).filter(({ b }) => (filter === 'all' ? true : filter === 'earned' ? !!b.earnedAt : !b.earnedAt));
  const next = state.badges.filter((b) => !b.earnedAt).sort((a, b) => b.progress - a.progress)[0];

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Achievements"
          badge={<PhaseBadge phase={2} />}
          subtitle="Streaks and badges that celebrate everyday wellness habits."
          breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Goals & Habits', to: '/app/goals' }, { label: 'Achievements' }]}
        />
        <RouteTabs tabs={GOALS_TABS} label="Goals & habits pages" className="!mb-0" />
      </div>

      {/* ---------- Hero: streak ---------- */}
      <HeroPanel tone="forest" label="Your streak">
        <div className="grid items-center gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
              <span aria-hidden className="blob absolute inset-0 bg-white/10" />
              <span aria-hidden className="absolute inset-4 animate-pulse-soft rounded-full bg-butter-300/20" />
              <span className="relative flex h-24 w-24 flex-col items-center justify-center rounded-full bg-gradient-to-br from-butter-300 to-peach-300 text-green-950 shadow-lift">
                <Flame className="h-6 w-6" />
                <span className="num text-[32px] leading-none">{checkInStreak}</span>
              </span>
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <HeroHeading dark eyebrow="Check-in streak" title={`${checkInStreak}-day wellness streak`} sub={checkInStreak > 0 ? 'Check in tomorrow to keep it going.' : 'Complete today’s check-in to start a streak.'} />
              <div className="mt-4 flex justify-center gap-1.5 sm:justify-start" aria-label="Check-ins over the last 14 days" role="img">
                {last14.map((d) => (
                  <span key={d} className={cn('h-7 w-3 rounded-full', state.checkIns.some((c) => c.date === d) ? 'bg-butter-300' : 'bg-white/15')} />
                ))}
              </div>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/60">Last 14 days</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <HeroStat dark dense label="Badges earned" value={`${earned.length}/${state.badges.length}`} icon={<Medal className="h-4 w-4" />} />
            <HeroStat dark dense label="Best habit streak" value={habitStreaks[0]?.n ?? 0} unit="days" icon={<Trophy className="h-4 w-4" />} hint={habitStreaks[0]?.h.title} />
            {next && (
              <div className="glass-dark col-span-2 flex items-center gap-3 rounded-3xl p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-butter-300">
                  <Icon name={next.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/70">Next up</p>
                  <p className="truncate font-semibold text-white">{next.title}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-butter-300" style={{ width: `${Math.round(next.progress * 100)}%` }} />
                  </div>
                </div>
                <span className="num text-lg text-white">{Math.round(next.progress * 100)}%</span>
              </div>
            )}
          </div>
        </div>
      </HeroPanel>

      {/* ---------- Badge gallery + habit streaks ---------- */}
      <div className="grid gap-6 xl:grid-cols-12">
        <section className="xl:col-span-8">
          <SectionTitle
            eyebrow="Badge gallery"
            title="Badges"
            subtitle={`${earned.length} of ${state.badges.length} earned`}
            action={
              <Segmented
                size="sm"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'earned', label: 'Earned' },
                  { value: 'progress', label: 'In progress' },
                ]}
              />
            }
          />
          {shown.length === 0 ? (
            <Card>
              <EmptyState icon={<Sparkles className="h-6 w-6" />} title={filter === 'earned' ? 'No badges yet' : 'All badges earned'} body={filter === 'earned' ? 'Keep checking in and ticking off habits — your first badge is close.' : 'You’ve collected every badge. Wonderful consistency!'} />
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {shown.map(({ b, i }) => (
                <BadgeCard key={b.id} badge={b} index={i} />
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6 xl:col-span-4">
          <Card className="card-pad">
            <CardHeader title="Habit streaks" subtitle="Days in a row" icon={<Flame className="h-5 w-5" />} />
            {habitStreaks.length === 0 ? (
              <EmptyState compact icon={<Flame className="h-5 w-5" />} title="No habits yet" action={<ButtonLink to="/app/habits" size="sm">Add a habit</ButtonLink>} />
            ) : (
              <ul className="space-y-3">
                {habitStreaks.map(({ h, n }) => {
                  const max = Math.max(7, habitStreaks[0].n);
                  return (
                    <li key={h.id} className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                        <Icon name={h.icon} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-semibold text-ink-800">{h.title}</span>
                          <span className="inline-flex shrink-0 items-center gap-1 font-bold text-peach-600">
                            <Flame className="h-3.5 w-3.5" /> {n}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-peach-50">
                          <div className="h-full rounded-full bg-gradient-to-r from-butter-300 to-peach-400" style={{ width: `${(n / max) * 100}%` }} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <ButtonLink to="/app/habits" variant="secondary" size="sm" className="mt-5 w-full">
              Open habits
            </ButtonLink>
          </Card>
          <div className="relative overflow-hidden rounded-3xl bg-lavender-50 p-5 ring-1 ring-inset ring-lavender-100">
            <span aria-hidden className="leaf absolute -right-6 -top-6 h-20 w-20 bg-rose-100" />
            <HeartHandshake className="relative h-6 w-6 text-lavender-600" />
            <p className="relative mt-3 font-display text-[16px] font-semibold text-ink-900">Celebrating care, not outcomes</p>
            <p className="relative mt-1 text-sm leading-relaxed text-ink-600">Badges reward showing up for everyday habits — water, movement, rest and check-ins.</p>
          </div>
        </div>
      </div>

      <Notice tone="green">We never turn cycle, fertility or other reproductive events into badges.</Notice>
    </div>
  );
}
