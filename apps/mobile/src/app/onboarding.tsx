/**
 * Onboarding (SRS §8, §10, §61; mockup M06–M10):
 * 1 Welcome → 2 Goals → 3 About you → 4 Consent → 5 Cycle information → notification permission.
 */
import {
  COPY,
  COUNTRIES,
  GOALS,
  LANGUAGES,
  TIMEZONES,
  addDays,
  computeCycleState,
  diffDays,
  formatDate,
  type ActivityLevel,
  type CycleProfile,
  type GoalKey,
  type ISODate,
  type NotificationPrefs,
  type PhotoKey,
  type Regularity,
} from '@healthx/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Bell, CalendarDays, Camera, Check, ChevronRight, CircleAlert, Droplet, HeartHandshake, ImagePlus, Lock, Repeat, ShieldCheck, SlidersHorizontal, Sparkles } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ArchPortrait, Leaf, Sparkle } from '@/components/Art';
import { BackendNote, Disclaimer, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { MonthCalendar } from '@/components/cycle/Calendar';
import { CheckBox, Chip, Segmented, SelectField, Stepper, TextField, ToggleRow } from '@/components/Inputs';
import { StepHeader } from '@/components/Kit';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { DEVICE_ONLY_NOTE } from '@/lib/deviceData';
import { KeyIcon } from '@/lib/icons';
import { requestReminderPermission } from '@/lib/localReminders';
import { PICK_MESSAGES, useProfilePhoto, type PhotoSource } from '@/lib/profilePhoto';
import { useStore } from '@/lib/store';
import { brandText, colors, font, onDark, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

// Steps: welcome · goals · about you · consent · cycle, then notification permission.
// Consent comes before any cycle (health) data is asked for — same order as the web app.
const TOTAL = 5;
const AVATARS: PhotoKey[] = ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4'];
const ACTIVITY: { key: ActivityLevel; label: string }[] = [
  { key: 'sedentary', label: 'Low' },
  { key: 'light', label: 'Light' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'active', label: 'Active' },
];
const REMINDERS: { key: 'cycle' | 'habit' | 'hydration'; label: string }[] = [
  { key: 'cycle', label: 'Your estimated period may begin soon*' },
  { key: 'habit', label: 'Time for your daily check-in' },
  { key: 'hydration', label: 'Hydration reminders' },
];
const GOAL_TINTS = [palette.green, palette.rose, palette.lavender, palette.peach, palette.sky, palette.indigo] as const;

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

function StepTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <AppText variant="overline" color={palette.green[700]}>
        {eyebrow}
      </AppText>
      <AppText variant="display" style={{ marginTop: 4 }} accessibilityRole="header">
        {title}
      </AppText>
      {text ? (
        <AppText variant="body" color={palette.ink[600]} style={{ marginTop: 6 }}>
          {text}
        </AppText>
      ) : null}
    </View>
  );
}

function FieldGroup({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        {icon}
        <AppText variant="overline" color={brandText}>
          {label}
        </AppText>
      </View>
      {children}
    </View>
  );
}

function ErrorText({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <View style={styles.errorRow}>
      <CircleAlert size={14} color={colors.danger} />
      <AppText variant="caption" color={colors.danger} style={{ flex: 1, fontSize: 12.5 }}>
        {text}
      </AppText>
    </View>
  );
}

export default function Onboarding() {
  const { state, dispatch, mode } = useStore();
  const toast = useToast();
  const params = useLocalSearchParams<{ name?: string }>();
  const today = state.today;
  // 0 welcome · 1 goals · 2 about you · 3 consent · 4 cycle · 5 notification permission
  const [step, setStep] = useState(0);

  const [goals, setGoals] = useState<GoalKey[]>(['understand_cycle']);
  const [name, setName] = useState(params.name || state.profile.name || '');
  const [avatar, setAvatar] = useState<PhotoKey | undefined>(undefined);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const photo = useProfilePhoto();
  const [asking, setAsking] = useState(false);
  const [dob, setDob] = useState({ d: '', m: '', y: '' });
  const [country, setCountry] = useState('India');
  const [language, setLanguage] = useState('English');
  const autoTz = useMemo(() => detectTimezone(), []);
  const [timezone, setTimezone] = useState(autoTz);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');

  const [lastStart, setLastStart] = useState<ISODate | null>(null);
  const [lastUnknown, setLastUnknown] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [month, setMonth] = useState(today);
  const [cycleLen, setCycleLen] = useState<number | null>(29);
  const [periodLen, setPeriodLen] = useState<number | null>(5);
  const [regularity, setRegularity] = useState<Regularity>('regular');

  const [consents, setConsents] = useState<Record<string, boolean>>({
    health_processing: true,
    notifications: true,
    analytics: false,
    ai_personalization: false,
    health_integrations: false,
  });
  const [reminders, setReminders] = useState<Record<string, boolean>>({ cycle: true, habit: true, hydration: true });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const calState = useMemo(
    () => computeCycleState([], { lastPeriodStart: null, typicalCycleLength: null, typicalPeriodLength: null, regularity: 'not_sure' }, today),
    [today],
  );
  const skipCycle = goals.some((g) => g === 'menopause' || g === 'pregnancy_wellness');
  const tzOptions = useMemo(
    () => [{ key: autoTz, label: `${autoTz} (auto)` }, ...TIMEZONES.filter((t) => t !== autoTz).map((t) => ({ key: t, label: t }))],
    [autoTz],
  );

  const dobISO = (): ISODate | null => {
    const d = Number(dob.d);
    const m = Number(dob.m);
    const y = Number(dob.y);
    if (!d || !m || !y || y < 1900) return null;
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return iso;
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 1 && goals.length === 0) e.goals = 'Choose at least one goal — you can change these later.';
    if (step === 2) {
      if (name.trim().length < 2) e.name = 'Please enter your name.';
      const iso = dobISO();
      if (!iso) e.dob = 'Enter a valid date of birth.';
      else if (iso > today) e.dob = "Date of birth can't be in the future.";
      else if (diffDays(iso, today) < 18 * 365) e.dob = 'HealthX is for adults 18+ (demo rule).';
      if (height && (Number(height) < 120 || Number(height) > 220)) e.height = 'Use 120–220 cm.';
      if (weight && (Number(weight) < 30 || Number(weight) > 250)) e.weight = 'Use 30–250 kg.';
    }
    if (step === 4 && !skipCycle && !lastUnknown && !lastStart) e.last = 'Pick the first day of your last period, or choose “I don’t remember”.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const finish = (allowNotifications: boolean) => {
    const cycle: CycleProfile = {
      lastPeriodStart: lastUnknown ? null : lastStart,
      typicalCycleLength: cycleLen,
      typicalPeriodLength: periodLen,
      regularity,
    };
    dispatch({
      type: 'COMPLETE_ONBOARDING',
      name: name.trim(),
      dob: dobISO() ?? '1995-01-01',
      country,
      goals,
      cycle,
      consents: { ...consents, notifications: allowNotifications },
    });
    dispatch({
      type: 'UPDATE_PROFILE',
      patch: {
        language,
        timezone,
        avatar,
        activityLevel: activity,
        heightCm: height ? Number(height) : undefined,
        weightKg: weight ? Number(weight) : undefined,
      },
    });
    const prefs: NotificationPrefs = state.notificationPrefs;
    const types = { ...prefs.types };
    (Object.keys(types) as (keyof typeof types)[]).forEach((k) => {
      const chosen = k in reminders ? reminders[k] : types[k].enabled;
      types[k] = { ...types[k], enabled: allowNotifications && chosen };
    });
    dispatch({ type: 'UPDATE_NOTIFICATION_PREFS', prefs: { ...prefs, types } });
    toast(allowNotifications ? `Welcome to HealthX, ${name.trim().split(' ')[0]}! Reminders are on.` : `Welcome to HealthX, ${name.trim().split(' ')[0]}!`);
    router.replace('/home');
  };

  const next = () => {
    if (!validate()) return;
    setErrors({});
    setStep((s) => s + 1);
  };
  const back = () => {
    setErrors({});
    if (step === 0) router.back();
    else setStep((s) => s - 1);
  };
  const toggleGoal = (g: GoalKey) => setGoals((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));
  const num = (v: string) => v.replace(/[^\d]/g, '').slice(0, 3);
  const editDob = (patch: Partial<typeof dob>) => {
    setDob({ ...dob, ...patch });
    if (errors.dob)
      setErrors((e) => {
        const n = { ...e };
        delete n.dob;
        return n;
      });
  };

  // ── Notification permission (mockup M10) ─────────────────────────────
  if (step === 5) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', marginTop: 36 }}>
          <View style={styles.bellArt}>
            <View style={styles.bellOuter} />
            <Leaf size={64} color={palette.rose[200]} rotate={-20} style={{ left: 2, top: 10 }} />
            <Leaf size={50} color={palette.green[200]} rotate={80} style={{ right: 4, bottom: 16 }} />
            <Sparkle size={18} style={{ right: 24, top: 18 }} />
            <View style={styles.bellInner}>
              <Bell size={40} color={onDark.butter[300]} fill={onDark.butter[300]} />
            </View>
          </View>
          <AppText variant="overline" color={palette.green[700]} style={{ marginTop: 18 }}>
            Last step
          </AppText>
          <AppText variant="display" center style={{ marginTop: 6 }}>
            Gentle reminders that help
          </AppText>
          <AppText variant="body" color={palette.ink[600]} center style={{ marginTop: 6, maxWidth: 320 }}>
            You choose which ones — change anytime in Settings.
          </AppText>
        </View>
        <Card style={{ marginTop: 22, gap: 4 }} padded={false}>
          {REMINDERS.map((r, i) => (
            <CheckBox
              key={r.key}
              checked={!!reminders[r.key]}
              onPress={() => setReminders((x) => ({ ...x, [r.key]: !x[r.key] }))}
              label={r.label}
              style={[styles.reminderRow, i < REMINDERS.length - 1 && styles.rowBorder]}
            />
          ))}
        </Card>
        <AppText variant="caption" muted style={{ marginTop: 10 }}>
          * Estimate based on the information you provide. Lock-screen text never shows health details.
        </AppText>
        <Button
          label="Allow notifications"
          icon={Bell}
          size="lg"
          full
          loading={asking}
          style={{ marginTop: 22 }}
          onPress={async () => {
            // The phone's own permission prompt, only after the person chose to allow reminders.
            setAsking(true);
            await requestReminderPermission();
            setAsking(false);
            finish(true);
          }}
        />
        <Pressable accessibilityRole="button" onPress={() => finish(false)} style={({ pressed }) => [styles.notNow, pressed && { backgroundColor: palette.green[50] }]}>
          <AppText variant="bodyBold" color={palette.green[700]}>
            Not now
          </AppText>
        </Pressable>
        <BackendNote text="Your phone asks for permission next and shows these reminders itself. Server push (e.g. new content) needs the notification backend." />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          label={step === 0 ? 'Get started' : step === 3 ? 'Agree & continue' : 'Continue'}
          iconRight={step === 3 ? undefined : ChevronRight}
          icon={step === 3 ? ShieldCheck : undefined}
          size="lg"
          full
          onPress={next}
        />
      }>
      {step > 0 ? (
        <StepHeader
          step={step + 1}
          total={TOTAL}
          onBack={back}
          onSkip={
            step === 1
              ? () => setStep(2)
              : step === 4
                ? () => {
                    // Skipping saves "not known" — never an assumed 28/29-day cycle.
                    setLastUnknown(true);
                    setCycleLen(null);
                    setPeriodLen(null);
                    setRegularity('not_sure');
                    setStep(5);
                  }
                : undefined
          }
        />
      ) : (
        <StepHeader step={1} total={TOTAL} />
      )}

      {step === 0 && (
        <View>
          <View style={styles.welcomeArt}>
            <View style={styles.welcomeWash} />
            <ArchPortrait photo="south-asian-woman" width={176} height={212} plate={palette.butter[300]} leafColors={[palette.rose[300], palette.green[200]]} />
            <Sparkle size={18} color={palette.butter[400]} style={{ left: 40, top: 70 }} />
          </View>
          <AppText variant="overline" color={palette.green[700]} center>
            Hello{name.trim() ? `, ${name.trim().split(' ')[0]}` : ''}
          </AppText>
          <AppText variant="display" center style={{ marginTop: 6 }} accessibilityRole="header">
            Welcome to HealthX Women’s Wellness
          </AppText>
          <AppText variant="body" color={palette.ink[600]} center style={{ marginTop: 8 }}>
            A calm, private place to understand your cycle and everyday wellness — and to know when to talk to a professional.
          </AppText>
          <View style={{ gap: 10, marginTop: 22 }}>
            {[
              { icon: Sparkles, title: 'What HealthX does', text: 'Cycle tracking, symptoms, mood, energy, hydration, sleep, fitness and gentle insights — in one place.', tone: 'mint' as const, fg: palette.green[700] },
              { icon: ShieldCheck, title: 'Our privacy approach', text: 'We only ask for what we need. Your health data is encrypted and never shared with employers.', tone: 'lavender' as const, fg: palette.lavender[600] },
              { icon: HeartHandshake, title: 'Wellness, not diagnosis', text: COPY.notDiagnostic, tone: 'peach' as const, fg: palette.peach[600] },
            ].map((b) => (
              <Card key={b.title} tone={b.tone} style={styles.bullet}>
                <View style={styles.bulletIcon}>
                  <b.icon size={20} color={b.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="h3" style={{ fontFamily: font.display, fontSize: 16.5 }}>
                    {b.title}
                  </AppText>
                  <AppText variant="small" color={palette.ink[600]} style={{ marginTop: 2 }}>
                    {b.text}
                  </AppText>
                </View>
              </Card>
            ))}
          </View>
        </View>
      )}

      {step === 1 && (
        <View>
          <StepTitle eyebrow="Your focus" title="What are your goals?" text="Select all that apply — we’ll personalise your plan." />
          <View style={styles.goalGrid}>
            {GOALS.map((g, i) => {
              const on = goals.includes(g.key);
              const tint = GOAL_TINTS[i % GOAL_TINTS.length];
              return (
                <Pressable
                  key={g.key}
                  accessibilityRole="checkbox"
                  aria-checked={on}
                  accessibilityLabel={g.label}
                  onPress={() => toggleGoal(g.key)}
                  style={({ pressed }) => [styles.goal, on && styles.goalOn, pressed && { transform: [{ scale: 0.98 }] }]}>
                  <View style={[styles.goalIcon, { backgroundColor: on ? colors.surface : tint[50] }]}>
                    <KeyIcon name={g.icon} size={19} color={on ? palette.green[700] : tint[600]} />
                  </View>
                  <AppText style={[styles.goalLabel, on && { color: brandText }]} numberOfLines={2}>
                    {g.label}
                  </AppText>
                  <AppText variant="caption" color={palette.ink[500]} numberOfLines={2} style={{ marginTop: 2 }}>
                    {g.description}
                  </AppText>
                  {g.phase > 1 ? (
                    <View style={styles.goalPhase}>
                      <AppText variant="overline" color={palette.lavender[700]} style={{ fontSize: 9 }}>
                        Phase {g.phase}
                      </AppText>
                    </View>
                  ) : null}
                  <View style={[styles.goalCheck, on && styles.goalCheckOn]}>{on ? <Check size={12} color="#fff" strokeWidth={3} /> : null}</View>
                </Pressable>
              );
            })}
          </View>
          <ErrorText text={errors.goals} />
          {goals.some((g) => GOALS.find((x) => x.key === g)!.phase > 1) ? (
            <Disclaimer style={{ marginTop: 14 }} tone="lavender" text="Some goals belong to modules planned for later phases. We’ll save them and tailor content now; full features arrive later." />
          ) : null}
        </View>
      )}

      {step === 2 && (
        <View style={{ gap: 14 }}>
          <StepTitle eyebrow="A little about you" title="About you" />
          <View style={{ alignItems: 'center' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Choose a profile photo" onPress={() => setAvatarOpen(true)} style={styles.avatarWrap}>
              <View style={styles.avatarRing}>
                {photo.uri ? (
                  <Photo source={{ uri: photo.uri }} shape="circle" style={styles.avatarImg} />
                ) : avatar ? (
                  <Photo photo={avatar} shape="circle" style={styles.avatarImg} />
                ) : (
                  <View style={[styles.avatarImg, styles.avatarFallback]}>
                    <AppText style={styles.avatarInitial}>{(name.trim().charAt(0) || 'H').toUpperCase()}</AppText>
                  </View>
                )}
              </View>
              <View style={styles.camera}>
                <Camera size={14} color="#fff" />
              </View>
            </Pressable>
            <AppText variant="caption" color={palette.green[700]} style={{ marginTop: 8 }}>
              Tap to pick a photo
            </AppText>
          </View>
          <FieldGroup label="Basics">
            <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Your name" error={errors.name} />
            <View style={{ gap: 7 }}>
              <AppText variant="label" color={palette.ink[800]}>
                Date of birth
              </AppText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextField label="Day" value={dob.d} onChangeText={(d) => editDob({ d: d.replace(/\D/g, '') })} keyboardType="number-pad" placeholder="DD" maxLength={2} style={{ flex: 1 }} />
                <TextField label="Month" value={dob.m} onChangeText={(m) => editDob({ m: m.replace(/\D/g, '') })} keyboardType="number-pad" placeholder="MM" maxLength={2} style={{ flex: 1 }} />
                <TextField label="Year" value={dob.y} onChangeText={(y) => editDob({ y: y.replace(/\D/g, '') })} keyboardType="number-pad" placeholder="YYYY" maxLength={4} style={{ flex: 1.4 }} />
              </View>
              <ErrorText text={errors.dob} />
            </View>
          </FieldGroup>
          <FieldGroup label="Where you are">
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <SelectField label="Country" value={country} onChange={setCountry} options={COUNTRIES.map((c) => ({ key: c, label: c }))} style={{ flex: 1 }} />
              <SelectField label="Language" value={language} onChange={setLanguage} options={LANGUAGES.map((l) => ({ key: l, label: l }))} style={{ flex: 1 }} />
            </View>
            <SelectField label="Timezone" value={timezone} onChange={setTimezone} options={tzOptions} />
          </FieldGroup>
          <FieldGroup label="Optional" icon={<SlidersHorizontal size={13} color={brandText} />}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextField label="Height (cm)" value={height} onChangeText={(v) => setHeight(num(v))} keyboardType="number-pad" placeholder="160" error={errors.height} style={{ flex: 1 }} />
              <TextField label="Weight (kg)" value={weight} onChangeText={(v) => setWeight(num(v))} keyboardType="number-pad" placeholder="58" error={errors.weight} style={{ flex: 1 }} />
            </View>
            <View style={{ gap: 7 }}>
              <AppText variant="label" color={palette.ink[800]}>
                Activity level
              </AppText>
              <Segmented value={activity} onChange={setActivity} options={ACTIVITY} />
            </View>
          </FieldGroup>
        </View>
      )}

      {step === 4 && (
        <View style={{ gap: 14 }}>
          <StepTitle eyebrow="Your cycle" title="Tell us about your cycle" text="Every cycle is different — we never assume 28 days." />
          {skipCycle ? (
            <Disclaimer
              tone="lavender"
              text={
                goals.includes('pregnancy_wellness')
                  ? 'Because you chose pregnancy wellness, you can skip this step — or add the first day of your last period to estimate your pregnancy week. You can add cycle details any time.'
                  : 'Because you chose menopause, you can skip this step. You can add cycle details any time.'
              }
            />
          ) : null}
          <View style={styles.cycleCard}>
            <View style={styles.cycleHead}>
              <View style={[styles.cycleIcon, { backgroundColor: palette.rose[50] }]}>
                <Droplet size={18} color={palette.rose[500]} fill={palette.rose[200]} />
              </View>
              <AppText variant="h3" style={{ flex: 1 }}>
                When did your last period start?
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose the date your last period started"
              onPress={() => setDateOpen(true)}
              style={({ pressed }) => [styles.dateField, (pressed || dateOpen) && styles.dateFieldOn, !!errors.last && { borderColor: colors.danger }]}>
              <CalendarDays size={18} color={palette.rose[500]} />
              <AppText variant="bodyMedium" style={{ flex: 1 }} color={lastStart || lastUnknown ? colors.text : palette.ink[400]}>
                {lastUnknown ? 'I don’t remember' : lastStart ? formatDate(lastStart, 'long') : 'Select a date'}
              </AppText>
              <ChevronRight size={16} color={palette.green[700]} />
            </Pressable>
            <ErrorText text={errors.last} />
          </View>
          <View style={styles.cycleCard}>
            <View style={styles.cycleHead}>
              <View style={[styles.cycleIcon, { backgroundColor: palette.sky[50] }]}>
                <Repeat size={17} color={palette.sky[600]} />
              </View>
              <AppText variant="h3" style={{ flex: 1 }}>
                Typical cycle length
              </AppText>
              <Chip label="Not sure" selected={cycleLen === null} onPress={() => setCycleLen(cycleLen === null ? 29 : null)} />
            </View>
            {cycleLen !== null ? <Stepper label="cycle length" value={cycleLen} onChange={setCycleLen} min={15} max={60} format={(v) => `${v} days`} /> : null}
          </View>
          <View style={styles.cycleCard}>
            <View style={styles.cycleHead}>
              <View style={[styles.cycleIcon, { backgroundColor: palette.rose[50] }]}>
                <CalendarDays size={17} color={palette.rose[600]} />
              </View>
              <AppText variant="h3" style={{ flex: 1 }}>
                Typical period length
              </AppText>
              <Chip label="Not sure" selected={periodLen === null} onPress={() => setPeriodLen(periodLen === null ? 5 : null)} />
            </View>
            {periodLen !== null ? <Stepper label="period length" value={periodLen} onChange={setPeriodLen} min={1} max={12} format={(v) => `${v} days`} /> : null}
          </View>
          <View style={styles.cycleCard}>
            <AppText variant="h3">Is your cycle regular?</AppText>
            <Segmented
              value={regularity}
              onChange={setRegularity}
              options={[
                { key: 'regular', label: 'Yes' },
                { key: 'irregular', label: 'No' },
                { key: 'not_sure', label: 'Not sure' },
              ]}
            />
          </View>
          {mode === 'offline' ? <BackendNote text="Offline demo: saved on this device only, nothing is sent to a server." /> : null}
        </View>
      )}

      {step === 3 && (
        <View>
          <StepTitle eyebrow="Consent first" title="Your privacy, your choice" text="You can change these anytime in Privacy & Data." />
          <Card tone="mint" style={{ marginTop: 16 }}>
            <View style={styles.consentHead}>
              <View style={styles.consentIcon}>
                <Lock size={15} color={brandText} />
              </View>
              <AppText variant="h3" style={{ flex: 1 }}>
                Required
              </AppText>
              <AppText variant="overline" color={palette.green[700]}>
                Always on
              </AppText>
            </View>
            <ToggleRow title="Terms & Privacy Policy" value disabled onChange={() => undefined} />
            <ToggleRow title="Process my health data to run the app" subtitle="Needed to store and calculate from what you log." value disabled onChange={() => undefined} last />
          </Card>
          <Card style={{ marginTop: 12 }}>
            <View style={styles.consentHead}>
              <View style={[styles.consentIcon, { backgroundColor: palette.lavender[50] }]}>
                <SlidersHorizontal size={15} color={palette.lavender[600]} />
              </View>
              <AppText variant="h3" style={{ flex: 1 }}>
                Optional
              </AppText>
              <AppText variant="overline" color={palette.ink[500]}>
                Your call
              </AppText>
            </View>
            <ToggleRow
              title="AI personalisation"
              subtitle="Let the AI coach use your logs for suggestions."
              right={<PhaseBadge phase={2} />}
              value={consents.ai_personalization}
              onChange={(v) => setConsents({ ...consents, ai_personalization: v })}
            />
            <ToggleRow title="Product analytics" subtitle="Which screens and features you use — never your health values." value={consents.analytics} onChange={(v) => setConsents({ ...consents, analytics: v })} />
            <ToggleRow
              title="Health integrations"
              subtitle="Apple Health / Health Connect imports."
              right={<PhaseBadge phase={2} />}
              value={consents.health_integrations}
              onChange={(v) => setConsents({ ...consents, health_integrations: v })}
              last
            />
          </Card>
          <View style={styles.employer}>
            <ShieldCheck size={16} color={palette.green[700]} />
            <AppText variant="caption" color={brandText} style={{ flex: 1, fontSize: 12.5, lineHeight: 18 }}>
              {COPY.employerPrivacy} HealthX is a wellness app, not a medical device.
            </AppText>
          </View>
        </View>
      )}

      <Sheet visible={avatarOpen} onClose={() => setAvatarOpen(false)} title="Profile photo" subtitle="Use your own photo, a sample photo or your initial.">
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {(['camera', 'library'] as PhotoSource[]).map((src) => (
            <Button
              key={src}
              label={src === 'camera' ? 'Take photo' : 'Choose photo'}
              icon={src === 'camera' ? Camera : ImagePlus}
              variant="soft"
              style={{ flex: 1 }}
              onPress={async () => {
                const r = await photo.pick(src);
                if (r === 'saved') setAvatarOpen(false);
                else if (r !== 'cancelled') toast(PICK_MESSAGES[r], 'error');
              }}
            />
          ))}
        </View>
        <View style={styles.avatarGrid}>
          {AVATARS.map((a) => {
            const on = avatar === a;
            return (
              <Pressable
                key={a}
                accessibilityRole="radio"
                aria-selected={on}
                accessibilityLabel={`Sample photo ${a.slice(-1)}`}
                onPress={() => {
                  setAvatar(a);
                  photo.remove();
                  setAvatarOpen(false);
                }}
                style={[styles.avatarOption, on && styles.avatarOptionOn]}>
                <Photo photo={a} shape="circle" style={{ width: 66, height: 66 }} />
                {on ? (
                  <View style={styles.avatarTick}>
                    <Check size={11} color="#fff" strokeWidth={3} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <Button
          label="Use my initial"
          variant="secondary"
          full
          style={{ marginTop: 16 }}
          onPress={() => {
            setAvatar(undefined);
            photo.remove();
            setAvatarOpen(false);
          }}
        />
        <AppText variant="caption" muted center style={{ marginTop: 12 }}>
          Your own photo: {DEVICE_ONLY_NOTE.charAt(0).toLowerCase() + DEVICE_ONLY_NOTE.slice(1)}
        </AppText>
      </Sheet>

      <Sheet
        visible={dateOpen}
        onClose={() => setDateOpen(false)}
        eyebrow="Your cycle"
        title="Last period start"
        subtitle="Tap the first day of your most recent period."
        footer={<Button label="Done" full onPress={() => setDateOpen(false)} />}>
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          periods={lastStart ? [{ id: 'sel', start: lastStart, end: addDays(lastStart, (periodLen ?? 5) - 1) > today ? today : addDays(lastStart, (periodLen ?? 5) - 1), flowByDay: {} }] : []}
          state={calState}
          selected={lastStart}
          onSelect={(d) => {
            setLastStart(d);
            setLastUnknown(false);
            setErrors({});
          }}
          maxDate={today}
          showEstimates={false}
        />
        <Chip
          label="I don't remember"
          selected={lastUnknown}
          onPress={() => {
            setLastUnknown((u) => !u);
            setErrors({});
          }}
          style={{ marginTop: 12, alignSelf: 'flex-start' }}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  welcomeArt: { height: 268, alignItems: 'center', justifyContent: 'flex-end', marginBottom: 14 },
  welcomeWash: { position: 'absolute', bottom: 0, width: 260, height: 200, borderRadius: 130, backgroundColor: palette.green[50] },
  bullet: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  bulletIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  goal: { width: '47%', flexGrow: 1, minHeight: 128, borderRadius: 22, borderWidth: 1.5, borderColor: palette.ink[200], backgroundColor: colors.surface, padding: 14 },
  goalOn: { backgroundColor: palette.green[50], borderColor: palette.green[600], ...shadow.card },
  goalIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  goalLabel: { fontFamily: font.display, fontSize: 15.5, lineHeight: 20, color: colors.text },
  goalPhase: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: palette.lavender[50], borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  goalCheck: { position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: palette.ink[300], backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  goalCheckOn: { backgroundColor: palette.green[700], borderColor: palette.green[700] },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  group: { gap: 12, backgroundColor: palette.ink[50], borderRadius: 24, padding: 14, borderWidth: 1, borderColor: palette.ink[100] },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatarWrap: { width: 100, height: 100 },
  avatarRing: { width: 100, height: 100, borderRadius: 50, padding: 4, backgroundColor: palette.green[100] },
  avatarImg: { width: 92, height: 92, borderRadius: 46 },
  avatarFallback: { backgroundColor: palette.green[700], alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: font.displayBold, fontSize: 36, lineHeight: 42, color: '#fff' },
  camera: { position: 'absolute', right: 0, bottom: 2, width: 32, height: 32, borderRadius: 16, backgroundColor: palette.green[700], borderWidth: 3, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  avatarGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  avatarOption: { padding: 4, borderRadius: 40, borderWidth: 2.5, borderColor: 'transparent' },
  avatarOptionOn: { borderColor: palette.green[700] },
  avatarTick: { position: 'absolute', right: 0, bottom: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: palette.green[700], borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  cycleCard: { gap: 12, backgroundColor: colors.surface, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  cycleHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cycleIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dateField: { minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: palette.ink[200], backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  dateFieldOn: { borderColor: palette.green[500], backgroundColor: palette.green[50] },
  consentHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  consentIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  employer: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 14, backgroundColor: palette.green[50], borderRadius: 18, padding: 14 },
  bellArt: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  bellOuter: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: palette.green[50] },
  bellInner: { width: 92, height: 92, borderRadius: 46, backgroundColor: palette.green[700], alignItems: 'center', justifyContent: 'center', ...shadow.lift },
  reminderRow: { paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: palette.ink[100] },
  notNow: { alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 24, marginVertical: 6 },
});
