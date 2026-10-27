import { useEffect, useMemo } from 'react';
import { Check, Crown, Eye, Laptop, Lock, Moon, Palette, Sparkles, Sun } from 'lucide-react';
import { canUseTheme, themeById, THEMES, type ThemeDef, type ThemeMode } from '@healthx/shared';
import { useAppState } from '@/store/AppStore';
import { LogoMark } from '@/components/brand/Brand';
import { Badge, Button, ButtonLink, Card, CardHeader, ChipToggle, Notice, PageHeader, ProgressBar, ProgressRing, SectionTitle, useToast } from '@/components/ui';
import { isDarkFor, themeCss } from '@/theme/engine';
import { useTheme } from '@/theme/themeContext';
import { cn } from '@/lib/utils';

const MODES: { value: ThemeMode; label: string; hint: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', hint: 'Bright and airy', icon: Sun },
  { value: 'dark', label: 'Dark', hint: 'Easy on the eyes at night', icon: Moon },
  { value: 'system', label: 'System', hint: 'Follows your device', icon: Laptop },
];

/** Miniature app screen rendered with real classes inside a scoped theme. */
function MiniApp({ scope }: { scope: string }) {
  return (
    <div data-preview={scope} className="overflow-hidden rounded-2xl bg-canvas ring-1 ring-ink-100" aria-hidden>
      <div className="bg-forest flex items-center gap-2 px-3 py-2.5">
        <LogoMark className="h-6 w-6" />
        <span className="h-2 w-16 rounded-full bg-white/40" />
        <span className="ml-auto h-5 w-5 rounded-full bg-white/25" />
      </div>
      <div className="space-y-2 p-3">
        <div className="grid grid-cols-3 gap-1.5">
          <span className="h-9 rounded-xl bg-green-50 ring-1 ring-inset ring-green-100" />
          <span className="h-9 rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-100" />
          <span className="h-9 rounded-xl bg-sky-50 ring-1 ring-inset ring-sky-100" />
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-soft">
          <ProgressRing value={0.68} size={34} stroke={5} />
          <div className="flex-1 space-y-1">
            <span className="block h-2 w-3/4 rounded-full bg-ink-200" />
            <span className="block h-2 w-1/2 rounded-full bg-ink-100" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex h-7 items-center rounded-full bg-green-700 px-3 text-[11px] font-semibold text-white">Check in</span>
          <span className="text-[11px] font-semibold text-green-700">See all</span>
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ t, current, plan, dark, onApply, onPreview, previewing }: { t: ThemeDef; current: boolean; plan: 'free' | 'premium'; dark: boolean; onApply: () => void; onPreview: () => void; previewing: boolean }) {
  const allowed = canUseTheme(t, plan);
  return (
    <Card className={cn('card-pad flex flex-col gap-4 transition', current && 'ring-2 ring-green-600', previewing && 'ring-2 ring-butter-400')}>
      <MiniApp scope={`${t.id}-${dark ? 'dark' : 'light'}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex gap-1" aria-hidden>
              {[700, 400, 100].map((s) => (
                <span key={s} className="h-3.5 w-3.5 rounded-full ring-1 ring-black/5" style={{ background: (t.brand as Record<number, string>)[s] }} />
              ))}
            </span>
            <p className="font-display text-[17px] font-semibold text-ink-900">{t.name}</p>
          </div>
          <p className="mt-1 text-sm text-ink-500">{t.description}</p>
        </div>
        {t.premium ? (
          <Badge tone="butter" icon={<Crown className="h-3 w-3" />}>
            Premium
          </Badge>
        ) : (
          <Badge tone="mint">Free</Badge>
        )}
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        {current ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-green-50 px-4 text-sm font-semibold text-green-800 ring-1 ring-inset ring-green-200">
            <Check className="h-4 w-4" /> In use
          </span>
        ) : allowed ? (
          <Button size="sm" onClick={onApply} aria-label={`Use the ${t.name} theme`}>
            Use theme
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" leftIcon={<Eye className="h-4 w-4" />} onClick={onPreview} aria-label={`Preview the ${t.name} theme`}>
              {previewing ? 'Previewing' : 'Preview'}
            </Button>
            <ButtonLink to="/app/subscription" size="sm" variant="butter" leftIcon={<Lock className="h-4 w-4" />}>
              Unlock
            </ButtonLink>
          </>
        )}
      </div>
    </Card>
  );
}

/** Settings → Appearance: accent themes (free + premium), light/dark/system mode, live previews. */
export default function Appearance() {
  const { profile } = useAppState();
  const { prefs, active, dark, previewing, setTheme, setMode, preview } = useTheme();
  const toast = useToast();
  const plan = profile.plan;

  // A premium preview ends when you leave this page.
  useEffect(() => () => preview(null), [preview]);

  const previewCss = useMemo(() => {
    const css: string[] = [];
    for (const t of THEMES) for (const d of [false, true]) css.push(themeCss(t.id, d, `[data-preview="${t.id}-${d ? 'dark' : 'light'}"]`));
    return css.join('\n');
  }, []);

  const apply = (t: ThemeDef) => {
    setTheme(t.id);
    toast.success(`${t.name} theme on`, 'Every page now uses it. You can change it any time.');
  };

  return (
    <div className="space-y-8">
      <style>{previewCss}</style>
      <PageHeader
        eyebrow="Settings"
        title="Appearance & theme"
        subtitle="Choose the colours and mode that feel right for you. Cycle and tracking colours keep their meaning in every theme."
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Settings', to: '/app/settings' }, { label: 'Appearance' }]}
      />

      {previewing && (
        <div role="status" className="sticky top-[84px] z-10 flex flex-col gap-3 rounded-3xl bg-butter-100 p-4 ring-1 ring-butter-200 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold text-green-950">
            <Eye className="h-4 w-4" /> Previewing {themeById(previewing).name} — a Premium theme. It switches back when you leave this page.
          </p>
          <div className="flex gap-2">
            <ButtonLink to="/app/subscription" size="sm" variant="primary" leftIcon={<Crown className="h-4 w-4" />}>
              Unlock with Premium
            </ButtonLink>
            <Button size="sm" variant="outline" onClick={() => preview(null)}>
              Stop preview
            </Button>
          </div>
        </div>
      )}

      <section>
        <SectionTitle eyebrow="Mode" title="Light or dark" subtitle="Dark mode is gentler for late-night logging." />
        <div role="radiogroup" aria-label="Colour mode" className="grid gap-4 sm:grid-cols-3">
          {MODES.map((m) => {
            const on = prefs.mode === m.value;
            const d = isDarkFor({ ...prefs, mode: m.value });
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setMode(m.value)}
                className={cn('card card-pad flex flex-col gap-3 text-left transition hover:-translate-y-0.5', on && 'ring-2 ring-green-600')}
              >
                <MiniApp scope={`${active.theme}-${d ? 'dark' : 'light'}`} />
                <span className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-700">
                      <m.icon className="h-[18px] w-[18px]" />
                    </span>
                    <span>
                      <span className="block font-display text-[16px] font-semibold text-ink-900">{m.label}</span>
                      <span className="block text-xs text-ink-500">{m.hint}</span>
                    </span>
                  </span>
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border-2', on ? 'border-green-700 bg-green-700 text-white' : 'border-ink-300')}>{on && <Check className="h-3.5 w-3.5" />}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Accent colour"
          title="Themes"
          subtitle={plan === 'premium' ? 'All themes are included with Premium.' : 'Three themes are free. Premium themes can be previewed before you upgrade.'}
          action={plan === 'free' ? <Badge tone="butter" icon={<Sparkles className="h-3 w-3" />}>Premium unlocks 3 more</Badge> : undefined}
        />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {THEMES.map((t) => (
            <ThemeCard key={t.id} t={t} plan={plan} dark={dark} current={prefs.theme === t.id && !previewing} previewing={previewing === t.id} onApply={() => apply(t)} onPreview={() => preview(previewing === t.id ? null : t.id)} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="card-pad lg:col-span-7">
          <CardHeader title="How it looks" subtitle="A few real components in your current theme" icon={<Palette className="h-5 w-5" />} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Primary</Button>
            <Button size="sm" variant="secondary">Secondary</Button>
            <Button size="sm" variant="outline">Outline</Button>
            <Button size="sm" variant="butter">Highlight</Button>
            <Button size="sm" variant="rose">Log period</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="green">Brand</Badge>
            <Badge tone="rose">Period</Badge>
            <Badge tone="sky">Hydration</Badge>
            <Badge tone="lavender">Mood</Badge>
            <Badge tone="peach">Energy</Badge>
            <Badge tone="indigo">Sleep</Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ChipToggle selected onClick={() => undefined}>
              Selected chip
            </ChipToggle>
            <ChipToggle selected={false} onClick={() => undefined}>
              Chip
            </ChipToggle>
          </div>
          <div className="mt-5 space-y-2">
            <ProgressBar value={0.7} label="Sample progress" />
            <ProgressBar value={0.45} color="bg-sky-500" track="bg-sky-100" label="Sample hydration progress" />
          </div>
        </Card>
        <Card className="card-pad lg:col-span-5">
          <CardHeader title="About themes" subtitle="Good to know" />
          <ul className="space-y-3 text-sm text-ink-600">
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-700" /> Your choice applies to every page, including the website and the Web Admin on this device.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-700" /> Period, fertile-window, hydration, sleep and mood colours never change, so charts always mean the same thing.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-700" /> The setting is saved in this browser. The mobile app has its own Appearance setting.
            </li>
          </ul>
          <Notice tone="info" className="mt-4" title="Premium is simulated">
            Premium themes unlock with the Premium plan or the free trial. No real payment is taken in this demo.
          </Notice>
        </Card>
      </section>
    </div>
  );
}
