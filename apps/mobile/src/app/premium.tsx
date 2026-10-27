/**
 * Subscriptions (SRS §49; mockup M41) — Phase 2. The 7-day free trial is granted (and ended) by the server;
 * paid plans, renewal and receipts need store billing. Pricing is undecided (D-13). The trial end date is
 * remembered on this phone from the server's reply.
 */
import { PREMIUM_FEATURES, diffDays, formatDate, hasPremium, toISODate, type PremiumFeature } from '@healthx/shared';
import { CalendarClock, Check, Crown, Minus, Sparkles, Star } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackendNote, PhaseBadge, Pill } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { GroupHeader, HeroPanel, LeafPair, ON_DARK } from '@/components/b-kit';
import { errorMessage, useStore } from '@/lib/store';
import { useDeviceData } from '@/lib/useDeviceData';
import { brandText, colors, font, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const PREMIUM_ORDER: PremiumFeature[] = ['advanced_insights', 'advanced_reports', 'advanced_cycle_history', 'coach', 'nutrition', 'programs', 'themes'];
const ROWS: { label: string; free: boolean }[] = [
  { label: 'Period & symptom tracking', free: true },
  { label: 'Basic wellness tracking & weekly summary', free: true },
  { label: 'Educational library', free: true },
  { label: 'Privacy controls', free: true },
  ...PREMIUM_ORDER.map((k) => ({ label: PREMIUM_FEATURES[k].label, free: false })),
];

/** EXAMPLE prices only — set per market at launch (D-13). */
const PLANS = [
  { key: 'yearly', title: 'Yearly', price: '₹1,799 / year', note: 'about ₹150 / month · save 40%', tag: 'Best value' },
  { key: 'monthly', title: 'Monthly', price: '₹249 / month', note: 'cancel anytime', tag: null },
] as const;

export default function Premium() {
  const { state, account } = useStore();
  const toast = useToast();
  const [plan, setPlan] = useState<'yearly' | 'monthly'>('yearly');
  const [busy, setBusy] = useState<'trial' | 'restore' | 'cancel' | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const trial = useDeviceData<{ endsAt: string } | null>('trial', null);
  const premium = hasPremium(state.profile.plan);
  // The server's trial end as a local calendar day. A remembered end that has passed is ignored (the server ends the trial itself).
  const endDay = premium && trial.value ? toISODate(new Date(trial.value.endsAt)) : null;
  const endsAt = endDay && endDay >= state.today ? endDay : null;
  const daysLeft = endsAt ? diffDays(state.today, endsAt) : null;

  const startTrial = async () => {
    setBusy('trial');
    try {
      const r = await account.startTrial();
      trial.set(r.trialEndsAt ? { endsAt: r.trialEndsAt } : null);
      toast(`7-day free trial started — ${plan} plan chosen (no charge in this build)`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };
  const restore = async () => {
    setBusy('restore');
    await new Promise((r) => setTimeout(r, 500));
    setBusy(null);
    toast('Store billing isn’t connected yet, so there are no purchases to restore.', 'info');
  };
  const cancel = async () => {
    setBusy('cancel');
    try {
      await account.cancelSubscription();
      trial.set(null);
      setConfirmCancel(false);
      toast('Back on the free plan — your data is kept', 'info');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen back right={<PhaseBadge phase={2} />}>
      <HeroPanel style={{ marginTop: 6, paddingRight: 0, paddingBottom: 0, flexDirection: 'row' }}>
        <View style={{ flex: 1, paddingBottom: 20 }}>
          <View style={styles.star}>
            <Star size={22} color={palette.green[900]} fill={palette.green[900]} />
          </View>
          <AppText variant="overline" color={palette.butter[400]} style={{ marginTop: 12 }}>
            HealthX Premium
          </AppText>
          <AppText variant="title" color="#fff" style={{ marginTop: 2 }}>
            Deeper insights for your wellness
          </AppText>
          {premium ? (
            <Pill label={endsAt ? 'Free trial active' : 'Active (demo)'} tone="butter" style={{ marginTop: 12 }} />
          ) : (
            <AppText variant="small" color={ON_DARK.text} style={{ marginTop: 6 }}>
              Try everything free for 7 days.
            </AppText>
          )}
        </View>
        <View style={styles.archWrap}>
          <LeafPair size={96} style={{ left: -26, top: 6 }} />
          <Photo photo="portrait-indian" shape="arch" radius={0} position="top" style={styles.arch} />
        </View>
      </HeroPanel>

      {premium ? (
        <>
          <GroupHeader eyebrow="Your plan" title="Manage subscription" />
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <CalendarClock size={18} color={palette.green[700]} />
              <AppText variant="bodyMedium" style={{ flex: 1 }}>
                {endsAt ? `Trial ends ${formatDate(endsAt, 'long')} · ${daysLeft === 0 ? 'last day' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}` : 'Premium is on'}
              </AppText>
            </View>
            <AppText variant="small" muted>
              {endsAt
                ? 'When the trial ends you move back to Free automatically. Nothing renews and nothing is charged — store billing isn’t connected in this build.'
                : 'In this build Premium has no renewal or charge. When store billing is added, renewal dates and receipts will show here.'}
            </AppText>
            <Button label="Cancel Premium" variant="secondary" full onPress={() => setConfirmCancel(true)} />
          </Card>
        </>
      ) : (
        <>
          <GroupHeader eyebrow="Trial first, no charge" title="Choose a plan" />
          <View style={styles.plans} accessibilityRole="radiogroup">
            {PLANS.map((p) => {
              const on = plan === p.key;
              return (
                <Pressable key={p.key} accessibilityRole="radio" aria-selected={on} accessibilityLabel={`${p.title}, ${p.price}`} onPress={() => setPlan(p.key)} style={[styles.plan, on && styles.planOn]}>
                  <View style={styles.planTop}>
                    <View style={[styles.radio, on && styles.radioOn]}>{on ? <Check size={12} color="#fff" /> : null}</View>
                    {p.tag ? (
                      <View style={styles.tag}>
                        <AppText variant="caption" color={palette.green[950]} style={{ fontFamily: font.bold, fontSize: 11 }}>
                          {p.tag}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  <AppText variant="overline" color={on ? palette.green[700] : colors.textSubtle} style={{ marginTop: 12 }}>
                    {p.title}
                  </AppText>
                  <AppText style={styles.price}>{p.price}</AppText>
                  <AppText variant="caption" muted>
                    {p.note}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <Button label="Start 7-day free trial" icon={Sparkles} full size="lg" loading={busy === 'trial'} onPress={startTrial} style={{ marginTop: 16 }} />
          <AppText variant="caption" muted center style={{ marginTop: 8, fontStyle: 'italic' }}>
            Cancel anytime. Example prices — final pricing is set per market (D-13).
          </AppText>
        </>
      )}

      <GroupHeader eyebrow="Compare" title="What’s included" />
      <Card padded={false}>
        <View style={styles.cmpHead}>
          <View style={{ flex: 1 }} />
          <AppText variant="overline" color={colors.textSubtle} style={styles.col}>
            Free
          </AppText>
          <View style={[styles.col, styles.premCol]} accessible accessibilityLabel="Premium">
            <Crown size={13} color={brandText} />
          </View>
        </View>
        {ROWS.map((r, i) => (
          <View key={r.label} style={[styles.cmpRow, i < ROWS.length - 1 && styles.border]}>
            <AppText variant="small" style={{ flex: 1 }}>
              {r.label}
            </AppText>
            <View style={styles.col}>{r.free ? <Check size={16} color={palette.green[700]} /> : <Minus size={16} color={palette.ink[300]} />}</View>
            <View style={[styles.col, styles.premCell]}>
              <Check size={16} color={palette.green[700]} />
            </View>
          </View>
        ))}
      </Card>
      <AppText variant="caption" muted style={{ marginTop: 6 }}>
        Premium column: everything in Free, plus the extras.
      </AppText>

      <Button label="Restore purchases" variant="ghost" size="sm" loading={busy === 'restore'} onPress={restore} style={{ alignSelf: 'center', marginTop: 12 }} />
      <AppText variant="caption" muted center style={{ marginTop: 6 }}>
        Downgrading never deletes your data. Core tracking stays free.
      </AppText>
      <BackendNote style={{ marginTop: 14 }} text="Real purchases need App Store / Google Play billing, receipt validation, renewal and restore purchases (Phase 2)." />

      <Sheet
        visible={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        eyebrow="Premium"
        title="Switch back to Free?"
        subtitle="Premium features lock straight away. Everything you’ve logged is kept, and core tracking stays free."
        footer={
          <View style={{ gap: 8 }}>
            <Button label="Switch to Free" variant="danger" full loading={busy === 'cancel'} onPress={cancel} />
            <Button label="Keep Premium" variant="ghost" full onPress={() => setConfirmCancel(false)} />
          </View>
        }>
        <View style={{ gap: 6 }}>
          {PREMIUM_ORDER.map((k) => (
            <View key={k} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Minus size={14} color={palette.ink[400]} />
              <AppText variant="small">{PREMIUM_FEATURES[k].label}</AppText>
            </View>
          ))}
          {endsAt ? (
            <AppText variant="caption" muted style={{ marginTop: 6 }}>
              The free trial is once per account, so it can’t be restarted after you cancel.
            </AppText>
          ) : null}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  star: { width: 46, height: 46, borderRadius: 23, backgroundColor: palette.butter[400], alignItems: 'center', justifyContent: 'center' },
  archWrap: { width: 128, alignSelf: 'flex-end', paddingTop: 30, paddingRight: 14 },
  arch: { width: 110, height: 168, marginLeft: 4, borderTopLeftRadius: 999, borderTopRightRadius: 999 },
  plans: { flexDirection: 'row', gap: 10 },
  plan: { flex: 1, padding: 14, borderRadius: 24, borderWidth: 1.5, borderColor: palette.ink[100], backgroundColor: colors.surface, minHeight: 150, ...shadow.card },
  planOn: { borderWidth: 2, borderColor: palette.green[700], backgroundColor: palette.green[50] },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: palette.green[300], alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: palette.green[700], borderColor: palette.green[700] },
  tag: { backgroundColor: palette.butter[400], borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  price: { fontFamily: font.display, fontSize: 21, lineHeight: 27, color: colors.text, marginTop: 2 },
  cmpHead: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 6, paddingHorizontal: 16 },
  cmpRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 16 },
  col: { width: 52, alignItems: 'center', textAlign: 'center' },
  premCol: { height: 26, borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: palette.green[100], justifyContent: 'center' },
  premCell: { alignSelf: 'stretch', justifyContent: 'center', backgroundColor: palette.green[50], marginVertical: -11 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
});
