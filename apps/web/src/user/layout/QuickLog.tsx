import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { CalendarHeart, ChartColumn, Droplets, Dumbbell, House, Moon, Plus, Salad, Smile, Sparkles, Stethoscope, UserRound, Wind } from 'lucide-react';
import { useAppState, useDispatch } from '@/store/AppStore';
import { LogPeriodModal } from '@/user/components/LogPeriodModal';
import { LogWorkoutModal } from '@/user/components/LogWorkoutModal';
import { IconTile, Modal, useToast } from '@/components/ui';
import { cn, formatMl } from '@/lib/utils';

/** Quick-log sheet (Mira "+" button): the most common logs in one tap. */
export function QuickLogSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const nav = useNavigate();
  const [period, setPeriod] = useState(false);
  const [workout, setWorkout] = useState(false);
  const go = (to: string) => {
    onClose();
    nav(to);
  };
  const today = state.checkIns.some((c) => c.date === state.today);
  return (
    <>
      <Modal open={open} onClose={onClose} title="Quick log" description="What would you like to add for today?" size="md">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <IconTile
            tone="rose"
            icon={<CalendarHeart className="h-5 w-5" />}
            label="Period"
            hint="Log or update"
            onClick={() => {
              onClose();
              setPeriod(true);
            }}
          />
          <IconTile tone="lavender" icon={<Smile className="h-5 w-5" />} label="Check-in" hint={today ? 'Edit today’s' : 'Under 30 seconds'} onClick={() => go('/app/check-in')} />
          <IconTile tone="peach" icon={<Stethoscope className="h-5 w-5" />} label="Symptoms" hint="Cramps, headache…" onClick={() => go('/app/symptoms')} />
          <IconTile
            tone="sky"
            icon={<Droplets className="h-5 w-5" />}
            label="Water"
            hint="Add 250 ml"
            onClick={() => {
              dispatch({ type: 'ADD_WATER', ml: 250 });
              toast.success('Added 250 ml of water', `${formatMl(state.waterTargetMl)} is today’s target`);
              onClose();
            }}
          />
          <IconTile
            tone="green"
            icon={<Dumbbell className="h-5 w-5" />}
            label="Workout"
            hint="Log a session"
            onClick={() => {
              onClose();
              setWorkout(true);
            }}
          />
          <IconTile tone="indigo" icon={<Moon className="h-5 w-5" />} label="Sleep" hint="Last night" onClick={() => go('/app/sleep')} />
          <IconTile tone="butter" icon={<Salad className="h-5 w-5" />} label="Meal" hint="Breakfast, lunch…" onClick={() => go('/app/nutrition')} />
          <IconTile tone="lavender" icon={<Sparkles className="h-5 w-5" />} label="Mood" hint="How you feel" onClick={() => go('/app/mood')} />
          <IconTile tone="green" icon={<Wind className="h-5 w-5" />} label="Breathe" hint="1-minute reset" onClick={() => go('/app/stress')} />
        </div>
      </Modal>
      <LogPeriodModal open={period} onClose={() => setPeriod(false)} />
      <LogWorkoutModal open={workout} onClose={() => setWorkout(false)} />
    </>
  );
}

/** Floating quick-log button (desktop). */
export function QuickLogFab({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Quick log"
      title="Quick log"
      className="group fixed bottom-6 right-6 z-30 hidden h-14 w-14 items-center justify-center rounded-full bg-green-800 text-white shadow-[0_18px_36px_-14px_rgb(var(--c-green-950)/0.9)] ring-4 ring-canvas transition hover:-translate-y-0.5 hover:bg-green-900 lg:flex"
    >
      <Plus className="h-6 w-6 transition group-hover:rotate-90" />
    </button>
  );
}

const TABS = [
  { to: '/app', label: 'Home', icon: House, end: true },
  { to: '/app/cycle', label: 'Cycle', icon: CalendarHeart, end: false },
  { to: '/app/insights/weekly', label: 'Insights', icon: ChartColumn, end: false },
  { to: '/app/profile', label: 'Profile', icon: UserRound, end: false },
];

/** Bottom tab bar for phones and small tablets, with a centre "+" (Mira / mobile app pattern). */
export function MobileTabBar({ onQuickLog }: { onQuickLog: () => void }) {
  const tab = (t: (typeof TABS)[number]) => (
    <NavLink
      key={t.to}
      to={t.to}
      end={t.end}
      className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold transition', isActive ? 'text-green-800' : 'text-ink-400 hover:text-ink-700')}
    >
      {({ isActive }) => (
        <>
          <span className={cn('flex h-8 w-12 items-center justify-center rounded-full transition', isActive && 'bg-green-100')}>
            <t.icon className="h-5 w-5" strokeWidth={isActive ? 2.3 : 2} />
          </span>
          {t.label}
        </>
      )}
    </NavLink>
  );
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 pb-[max(env(safe-area-inset-bottom),6px)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-xl items-end px-2 pt-1.5">
        {TABS.slice(0, 2).map(tab)}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={onQuickLog}
            aria-label="Quick log"
            className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-green-800 text-white shadow-[0_14px_30px_-10px_rgb(var(--c-green-950)/0.8)] ring-4 ring-white transition active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
        {TABS.slice(2).map(tab)}
      </div>
    </nav>
  );
}
