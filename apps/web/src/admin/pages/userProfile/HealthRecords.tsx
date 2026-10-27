/**
 * A person's health records as the mobile app holds them, shown to an Admin during an audited,
 * reason-stated, 30-minute access window (A-15). Read-only: staff never edit a person's records.
 * Estimates keep their "*" label and nothing here is presented as a diagnosis (§12, §67).
 */
import type { ReactNode } from 'react';
import { BookOpen, CalendarHeart, Droplets, Dumbbell, Flower2, Gauge, HeartPulse, ListChecks, Moon, Salad, ShieldCheck, Smile, Sprout, UserRound } from 'lucide-react';
import {
  computeCycleState,
  computeInsights,
  FLOWS,
  formatDate,
  GOALS,
  MOODS,
  PHASES,
  SEVERITIES,
  SYMPTOM_CATEGORIES,
  pregnancyEstimate,
  stageDashboard,
  waterOn,
  wellnessScore,
  addDays,
  type AppState,
} from '@healthx/shared';
import { Badge, Card, CardHeader, Notice } from '@/components/ui';
import { articleTitle } from '../../appActivity';

const label = <K extends string>(list: { key: K; label: string }[], k: K | undefined) => (k ? (list.find((x) => x.key === k)?.label ?? k) : '—');
const LIFE: Record<AppState['profile']['mode'], string> = { cycle: 'Cycle tracking', pregnancy: 'Pregnancy wellness (Phase 3 preview)', perimenopause: 'Perimenopause (Phase 3 preview)', menopause: 'Menopause (Phase 3 preview)' };
const MAX_ROWS = 12;

function Section({ id, title, subtitle, icon, children, count }: { id: string; title: string; subtitle?: string; icon: ReactNode; children: ReactNode; count?: number }) {
  return (
    <Card id={id} className="card-pad scroll-mt-28">
      <CardHeader title={title} subtitle={subtitle} icon={icon} action={count !== undefined ? <Badge tone="gray">{count} records</Badge> : undefined} />
      {children}
    </Card>
  );
}

/** Small read-only table (latest rows first). */
function MiniTable({ headers, rows, empty = 'Nothing logged.' }: { headers: string[]; rows: ReactNode[][]; empty?: string }) {
  if (!rows.length) return <p className="py-3 text-sm text-ink-500">{empty}</p>;
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500">
            {headers.map((h) => (
              <th key={h} className="px-2 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-ink-100 last:border-b-0">
              {r.map((c, j) => (
                <td key={j} className="px-2 py-2 align-top text-ink-700">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 border-b border-ink-100 py-2">
          <dt className="text-ink-500">{k}</dt>
          <dd className="text-right font-semibold text-ink-800">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const newestFirst = <T extends { date: string }>(xs: T[]) => [...xs].sort((a, b) => b.date.localeCompare(a.date));
const est = (v: ReactNode) => (
  <span>
    {v}
    <span className="text-ink-400">*</span>
  </span>
);

export function HealthRecords({ record: s }: { record: AppState }) {
  const cs = computeCycleState(s.periods, s.cycleProfile, s.today);
  const symptomLabel = (id: string) => s.symptomDefs.find((d) => d.id === id)?.label ?? id;
  const symptomCat = (id: string) => label(SYMPTOM_CATEGORIES, s.symptomDefs.find((d) => d.id === id)?.category);
  const flowSummary = (p: AppState['periods'][number]) => {
    const flows = Object.values(p.flowByDay);
    return flows.length ? [...new Set(flows)].map((f) => label(FLOWS, f)).join(', ') : '—';
  };
  const score = wellnessScore(s);
  const insights = computeInsights(s, { includeDismissed: true });
  const days14 = Array.from({ length: 14 }, (_, i) => addDays(s.today, -i));
  const lifeSymptoms = s.symptomLogs.filter((l) => s.symptomDefs.find((d) => d.id === l.symptomId)?.category === 'life_stage');
  const preg = pregnancyEstimate(s);
  const stage = stageDashboard(s);
  const appointments = s.reminders.filter((r) => r.type === 'appointment');

  return (
    <div className="space-y-5">
      <Notice tone="safety" title="Read-only · estimates are marked *">
        These are the person’s own logs as the app stores them. Predictions are calendar estimates, not confirmation of ovulation, and nothing here is a diagnosis. The Wellness Score is an engagement metric, not a medical score.
      </Notice>

      <Section id="hr-profile" title="Profile & goals" subtitle="What they told us in onboarding and their profile" icon={<UserRound className="h-5 w-5" />}>
        <Facts
          items={[
            ['Date of birth', s.profile.dob ? formatDate(s.profile.dob) : '—'],
            ['Height', s.profile.heightCm ? `${s.profile.heightCm} cm` : '—'],
            ['Weight', s.profile.weightKg ? `${s.profile.weightKg} kg` : '—'],
            ['Activity level', s.profile.activityLevel ?? '—'],
            ['Life-stage mode', LIFE[s.profile.mode]],
            ['Units', s.profile.units],
          ]}
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {s.profile.goals.length ? s.profile.goals.map((g) => <Badge key={g} tone="mint">{label(GOALS, g)}</Badge>) : <span className="text-sm text-ink-500">No goals selected.</span>}
        </div>
      </Section>

      <Section id="hr-cycle" title="Cycle & period" subtitle="SRS §10–§13, §18 — the app never assumes a 28-day cycle" icon={<CalendarHeart className="h-5 w-5" />} count={s.periods.length}>
        <Facts
          items={[
            ['Cycle day', cs.cycleDay ?? '—'],
            ['Estimated phase', cs.phase ? est(PHASES[cs.phase].label) : '—'],
            ['Next period', cs.nextPeriodStart ? est(`around ${formatDate(cs.nextPeriodStart)}`) : '—'],
            ['Average cycle', cs.avgCycleLength ? `${cs.avgCycleLength} days (${cs.lengthSource})` : '—'],
            ['Average period', cs.avgPeriodLength ? `${cs.avgPeriodLength} days` : '—'],
            ['Regularity (as entered)', s.cycleProfile.regularity.replace('_', ' ')],
            ['Prediction confidence', cs.confidence],
            ['Completed cycles', cs.completedCycles],
          ]}
        />
        <div className="mt-4">
          <MiniTable
            headers={['Start', 'End', 'Length', 'Flow', 'Notes']}
            rows={[...s.periods]
              .sort((a, b) => b.start.localeCompare(a.start))
              .slice(0, MAX_ROWS)
              .map((p) => [formatDate(p.start), p.end ? formatDate(p.end) : 'Ongoing', cs.cycles.find((c) => c.periodId === p.id)?.length ? `${cs.cycles.find((c) => c.periodId === p.id)?.length} d cycle` : '—', flowSummary(p), p.notes ?? '—'])}
          />
        </div>
      </Section>

      <Section id="hr-symptoms" title="Symptoms" subtitle="§14–§15, including custom symptoms" icon={<HeartPulse className="h-5 w-5" />} count={s.symptomLogs.length}>
        <MiniTable headers={['Date', 'Symptom', 'Category', 'Severity', 'Notes']} rows={newestFirst(s.symptomLogs).slice(0, MAX_ROWS).map((l) => [formatDate(l.date), symptomLabel(l.symptomId), symptomCat(l.symptomId), label(SEVERITIES, l.severity), l.notes ?? '—'])} />
        {s.symptomDefs.some((d) => d.custom) && (
          <p className="mt-3 text-xs text-ink-500">
            Custom symptoms:{' '}
            {s.symptomDefs
              .filter((d) => d.custom)
              .map((d) => d.label)
              .join(', ')}
          </p>
        )}
      </Section>

      <Section id="hr-mood" title="Mood, energy & check-ins" subtitle="§16, §32 — energy and stress on a 1–10 scale" icon={<Smile className="h-5 w-5" />} count={s.checkIns.length}>
        <MiniTable
          headers={['Date', 'Mood', 'Energy', 'Stress', 'Anxiety', 'Sleep', 'Note']}
          rows={newestFirst(s.checkIns)
            .slice(0, MAX_ROWS)
            .map((c) => [formatDate(c.date), label(MOODS, c.mood), `${c.energy}/10`, c.stress !== undefined ? `${c.stress}/10` : '—', c.anxiety !== undefined ? `${c.anxiety}/10` : '—', c.sleepHours !== undefined ? `${c.sleepHours} h` : '—', c.note ?? '—'])}
        />
      </Section>

      <Section id="hr-fertility" title="Fertility awareness" subtitle="§20–§21 — observations as logged; not contraception, not confirmation of ovulation" icon={<Flower2 className="h-5 w-5" />} count={s.fertility.length}>
        <Facts items={[['Fertile window', cs.fertileWindow ? est(`${formatDate(cs.fertileWindow.start)} – ${formatDate(cs.fertileWindow.end)}`) : '—'], ['Ovulation (calendar estimate)', cs.estimatedOvulation ? est(formatDate(cs.estimatedOvulation)) : '—']]} />
        <div className="mt-4">
          <MiniTable headers={['Date', 'Basal temp.', 'Cervical mucus', 'Ovulation test']} rows={newestFirst(s.fertility).slice(0, MAX_ROWS).map((f) => [formatDate(f.date), f.bbtCelsius !== undefined ? `${f.bbtCelsius.toFixed(2)} °C` : '—', f.mucus?.replace('_', ' ') ?? '—', f.ovulationTest?.replace('_', ' ') ?? '—'])} />
        </div>
      </Section>

      <Section id="hr-life" title="Life stage & pregnancy wellness" subtitle="§22–§25 (Phase 3 preview in the app)" icon={<Sprout className="h-5 w-5" />} count={lifeSymptoms.length}>
        <Facts
          items={[
            ['Current mode', LIFE[s.profile.mode]],
            ['Life-stage symptom logs', lifeSymptoms.length],
            ...(s.profile.mode === 'pregnancy'
              ? ([
                  ['Pregnancy week (from last period)', preg ? est(`Week ${preg.weeks} + ${preg.days} d`) : 'No last-period date'],
                  ['Estimated due date', preg ? est(formatDate(preg.dueDate)) : '—'],
                ] as [string, ReactNode][])
              : []),
            ...(s.profile.mode === 'perimenopause' || s.profile.mode === 'menopause'
              ? ([
                  ['Sleep · last 7 days', stage.sleep.pct === null ? '—' : `${stage.sleep.pct}% of target`],
                  ['Energy · last 7 days', stage.energy.pct === null ? '—' : `${stage.energy.pct}%`],
                  ['Mood · last 7 days', stage.mood.pct === null ? '—' : `${stage.mood.pct}%`],
                  ['Activity · last 7 days', stage.activity.pct === null ? '—' : `${stage.activity.pct}% of days at step target`],
                ] as [string, ReactNode][])
              : []),
          ]}
        />
        {appointments.length ? (
          <div className="mt-4">
            <MiniTable headers={['Appointment', 'Date', 'Time', 'Reminder']} rows={appointments.map((r) => [r.title, r.date ? formatDate(r.date) : '—', r.time, r.enabled ? 'On' : 'Off'])} />
          </div>
        ) : null}
        <p className="mt-3 text-xs text-ink-500">Weight history, questions for a provider and any profile photo the person took stay on their phone and are not visible here.</p>
        <div className="mt-4">
          <MiniTable headers={['Date', 'Symptom', 'Severity']} rows={newestFirst(lifeSymptoms).slice(0, MAX_ROWS).map((l) => [formatDate(l.date), symptomLabel(l.symptomId), label(SEVERITIES, l.severity)])} empty="No hot-flash, night-sweat or other life-stage logs." />
        </div>
      </Section>

      <Section id="hr-fitness" title="Fitness & steps" subtitle="§26–§27" icon={<Dumbbell className="h-5 w-5" />} count={s.sessions.length}>
        <MiniTable headers={['Date', 'Workout', 'Category', 'Minutes', 'Status']} rows={newestFirst(s.sessions).slice(0, MAX_ROWS).map((w) => [formatDate(w.date), w.title, w.category, w.durationMin, w.status])} />
        <p className="mt-3 text-xs text-ink-500">
          Steps, last 7 days: {days14.slice(0, 7).map((d) => (s.activity.find((a) => a.date === d)?.steps ?? 0).toLocaleString('en-US')).join(' · ')} (target {s.stepTarget.toLocaleString('en-US')})
        </p>
      </Section>

      <Section id="hr-nutrition" title="Nutrition" subtitle="§28 — logged meals; no individual treatment advice" icon={<Salad className="h-5 w-5" />} count={s.meals.length}>
        <MiniTable headers={['Date', 'Meal', 'Food', 'kcal', 'Protein', 'Carbs', 'Fat', 'Fibre']} rows={newestFirst(s.meals).slice(0, MAX_ROWS).map((m) => [formatDate(m.date), m.meal, m.name, m.kcal, `${m.protein} g`, `${m.carbs} g`, `${m.fat} g`, `${m.fiber} g`])} />
      </Section>

      <Section id="hr-hydration" title="Hydration" subtitle="§29" icon={<Droplets className="h-5 w-5" />} count={s.water.length}>
        <MiniTable headers={['Date', 'Total', 'Goal', '']} rows={days14.slice(0, 10).map((d) => {
          const ml = waterOn(s, d);
          return [formatDate(d), `${(ml / 1000).toFixed(1)} L`, `${(s.waterTargetMl / 1000).toFixed(1)} L`, ml >= s.waterTargetMl ? <Badge key="m" tone="sky">Goal met</Badge> : '—'];
        })} />
      </Section>

      <Section id="hr-sleep" title="Sleep" subtitle="§30" icon={<Moon className="h-5 w-5" />} count={s.sleep.length}>
        <MiniTable headers={['Night ending', 'Bedtime', 'Wake', 'Duration', 'Quality', 'Wakings', 'Source']} rows={newestFirst(s.sleep).slice(0, MAX_ROWS).map((l) => [formatDate(l.date), l.bedtime, l.wake, `${Math.floor(l.durationMin / 60)}h ${l.durationMin % 60}m`, `${l.quality}/5`, l.wakings, l.source.replace('_', ' ')])} />
      </Section>

      <Section id="hr-habits" title="Habits, goals & daily plan" subtitle="§33, §52" icon={<ListChecks className="h-5 w-5" />}>
        <div className="grid gap-4 lg:grid-cols-2">
          <MiniTable headers={['Habit', 'Category', 'Done (30 days)']} rows={s.habits.map((h) => [h.title, h.category, s.habitCompletions.filter((c) => c.habitId === h.id && c.date > addDays(s.today, -30)).length])} empty="No habits." />
          <MiniTable headers={['Goal', 'Target', 'Status']} rows={s.goals.map((g) => [g.title, `${g.target} ${g.unit} / ${g.period === 'daily' ? 'day' : 'week'}`, g.status])} empty="No goals." />
        </div>
        <p className="mt-3 text-xs text-ink-500">
          Today’s plan: {s.plan.items.length ? s.plan.items.map((i) => `${i.done ? '✓' : '○'} ${i.title}`).join(' · ') : 'not created yet'}
        </p>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section id="hr-score" title="Wellness Score & insights" subtitle="An engagement metric and observed patterns — not a medical score" icon={<Gauge className="h-5 w-5" />}>
          <Facts items={[['Wellness Score today', score.score === null ? '—' : `${score.score}/100`], ['Insights showing', insights.length]]} />
          <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
            {insights.slice(0, 4).map((i) => (
              <li key={i.id}>• {i.title}</li>
            ))}
          </ul>
        </Section>
        <Section id="hr-content" title="Learn & consent" subtitle="Reading, bookmarks, reminders and choices" icon={<BookOpen className="h-5 w-5" />}>
          <p className="text-sm text-ink-600">
            <b className="text-ink-800">Read:</b> {s.readArticles.length ? s.readArticles.map(articleTitle).join(', ') : 'nothing yet'}
          </p>
          <p className="mt-2 text-sm text-ink-600">
            <b className="text-ink-800">Saved:</b> {s.bookmarks.length ? s.bookmarks.map(articleTitle).join(', ') : 'nothing yet'}
          </p>
          <p className="mt-2 text-sm text-ink-600">
            <b className="text-ink-800">Reminders:</b> {s.reminders.length ? s.reminders.map((r) => `${r.title} ${r.time}${r.enabled ? '' : ' (off)'}`).join(', ') : 'none'}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {s.consents.map((c) => (
              <Badge key={c.id} tone={c.granted ? 'green' : 'gray'} icon={<ShieldCheck className="h-3 w-3" />}>
                {c.label}: {c.granted ? 'on' : 'off'}
              </Badge>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
