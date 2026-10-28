/**
 * Subscriptions & Premium (SRS §49; mockup M41; P2-15). The 7-day free trial is granted (and ended) by
 * the server. Paid plans go through `lib/billing`: signed in, they report that store billing isn't
 * connected yet; in the offline demo a mock store sheet lets every purchase state be tried (success,
 * cancelled, pending, failed), with the plan, renewal date and receipts remembered on this phone.
 * Pricing is undecided (D-13). Downgrading keeps every log and only locks the Premium views.
 */
import { PREMIUM_FEATURES, diffDays, formatDate, hasPremium, toISODate, type PremiumFeature } from '@healthx/shared';
import { CalendarClock, Check, Crown, ExternalLink, Minus, Receipt, ShoppingBag, Sparkles, Star } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { BackendNote, PhaseBadge, Pill } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { GroupHeader, HeroPanel, LeafPair, ON_DARK } from '@/components/b-kit';
import { OUTCOME_TEXT, PLANS, demoSubscription, openStoreSubscriptions, type DemoSubscription, type PlanKey, type PurchaseOutcome } from '@/lib/billing';
import { DEVICE_ONLY_NOTE } from '@/lib/deviceData';
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
const STORE = Platform.OS === 'ios' ? 'App Store' : Platform.OS === 'android' ? 'Google Play' : 'your app store';

export default function Premium() {
  const { state, account, mode } = useStore();
  const toast = useToast();
  const [plan, setPlan] = useState<PlanKey>('yearly');
  const [busy, setBusy] = useState<'trial' | 'restore' | 'cancel' | 'buy' | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [storeSheet, setStoreSheet] = useState(false);
  const [outcome, setOutcome] = useState<Exclude<PurchaseOutcome, 'success'> | null>(null);
  const trial = useDeviceData<{ endsAt: string } | null>('trial', null);
  const sub = useDeviceData<DemoSubscription | null>('subscription', null);
  const premium = hasPremium(state.profile.plan);
  // The server's trial end as a local calendar day. A remembered end that has passed is ignored (the server ends the trial itself).
  const endDay = premium && trial.value ? toISODate(new Date(trial.value.endsAt)) : null;
  const endsAt = endDay && endDay >= state.today ? endDay : null;
  const daysLeft = endsAt ? diffDays(state.today, endsAt) : null;
  // A demo store subscription only counts while Premium is on (cancelling switches the plan back to Free).
  const paid = premium && !endsAt && sub.value ? sub.value : null;
  const chosen = PLANS.find((p) => p.key === plan)!;

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

  /** Paid plans: only the offline demo has a (mock) store; signed in, billing isn't connected yet. */
  const subscribe = () => {
    setOutcome(null);
    if (mode !== 'offline') return setOutcome('unavailable');
    setStoreSheet(true);
  };
  const finishDemoPurchase = async (result: PurchaseOutcome) => {
    setStoreSheet(false);
    if (result !== 'success') return setOutcome(result);
    setBusy('buy');
    try {
      await account.startTrial(); // the offline demo grants Premium the same way
      trial.set(null);
      sub.set((prev) => demoSubscription(plan, state.today, prev));
      toast(`Premium is on — ${chosen.title.toLowerCase()} plan (demo store, nothing charged)`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    setOutcome(null);
    await new Promise((r) => setTimeout(r, 600));
    try {
      if (mode !== 'offline') return toast('Store billing isn’t connected yet, so there are no purchases to restore.', 'info');
      if (!sub.value) return toast('No purchases found for this account.', 'info');
      if (premium) return toast('Your purchase is already active.', 'info');
      await account.startTrial();
      sub.set((prev) => (prev ? { ...prev, startedAt: state.today, renewsAt: demoSubscription(prev.plan, state.today).renewsAt } : prev));
      toast('Purchase restored — Premium is on');
    } finally {
      setBusy(null);
    }
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
  const manageInStore = async () => {
    if (!(await openStoreSubscriptions())) toast(`Manage store subscriptions in ${STORE} on your phone.`, 'info');
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
            <Pill label={endsAt ? 'Free trial active' : paid ? `${PLANS.find((p) => p.key === paid.plan)?.title} plan` : 'Active (demo)'} tone="butter" style={{ marginTop: 12 }} />
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
                {endsAt
                  ? `Trial ends ${formatDate(endsAt, 'long')} · ${daysLeft === 0 ? 'last day' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}`
                  : paid
                    ? `${PLANS.find((p) => p.key === paid.plan)?.title} plan · renews ${formatDate(paid.renewsAt, 'long')}`
                    : 'Premium is on'}
              </AppText>
            </View>
            <AppText variant="small" muted>
              {endsAt
                ? 'When the trial ends you move back to Free automatically. Nothing renews and nothing is charged — store billing isn’t connected in this build.'
                : paid
                  ? `Bought through the demo store — nothing was charged. With store billing, renewals and cancellations are handled in ${STORE}.`
                  : 'In this build Premium has no renewal or charge. When store billing is added, renewal dates and receipts will show here.'}
            </AppText>
            {Platform.OS !== 'web' ? <Button label={`Manage in ${STORE}`} icon={ExternalLink} variant="soft" full onPress={manageInStore} /> : null}
            <Button label="Cancel Premium" variant="secondary" full onPress={() => setConfirmCancel(true)} />
          </Card>
          {paid?.receipts.length ? (
            <>
              <GroupHeader eyebrow="Demo store" title="Billing history" />
              <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
                {paid.receipts.map((r, i) => (
                  <View key={`${r.date}-${i}`} style={[styles.receipt, i < paid.receipts.length - 1 && styles.border]}>
                    <Receipt size={16} color={palette.green[700]} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="smallMedium">HealthX Premium · {PLANS.find((p) => p.key === r.plan)?.title}</AppText>
                      <AppText variant="caption" muted>
                        {formatDate(r.date, 'long')}
                      </AppText>
                    </View>
                    <AppText variant="smallMedium">{r.amount}</AppText>
                  </View>
                ))}
              </Card>
              <AppText variant="caption" muted style={{ marginTop: 6 }}>
                Example receipts from the demo store — no payment was taken. {DEVICE_ONLY_NOTE}
              </AppText>
            </>
          ) : null}
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
          <Button label={`Subscribe · ${chosen.price}`} icon={ShoppingBag} variant="secondary" full loading={busy === 'buy'} onPress={subscribe} style={{ marginTop: 10 }} />
          {outcome ? (
            <View style={[styles.outcome, outcome === 'failed' && styles.outcomeError]} accessibilityRole="alert">
              <AppText variant="small" style={{ flex: 1 }}>
                {OUTCOME_TEXT[outcome]}
              </AppText>
              {outcome === 'failed' ? <Button label="Try again" size="sm" variant="soft" onPress={subscribe} /> : null}
            </View>
          ) : null}
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
      <BackendNote style={{ marginTop: 14 }} text="Real purchases need App Store / Google Play billing with server-side receipt validation, renewal and restore (D-13). The offline demo uses a mock store." />

      {/* Mock store confirmation (offline demo only) — stands in for the App Store / Google Play sheet. */}
      <Sheet
        visible={storeSheet}
        onClose={() => void finishDemoPurchase('cancelled')}
        eyebrow="Demo store"
        title={`HealthX Premium · ${chosen.title}`}
        subtitle={`${chosen.price}. This is the offline demo's mock store — nothing is charged.`}
        footer={
          <View style={{ gap: 8 }}>
            <Button label="Confirm purchase" full onPress={() => void finishDemoPurchase('success')} />
            <Button label="Cancel" variant="ghost" full onPress={() => void finishDemoPurchase('cancelled')} />
          </View>
        }>
        <View style={{ gap: 8 }}>
          <AppText variant="small" muted>
            Try the other outcomes a real store can return:
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Simulate pending" size="sm" variant="soft" style={{ flex: 1 }} onPress={() => void finishDemoPurchase('pending')} />
            <Button label="Simulate failure" size="sm" variant="soft" style={{ flex: 1 }} onPress={() => void finishDemoPurchase('failed')} />
          </View>
        </View>
      </Sheet>

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
          {paid ? (
            <AppText variant="caption" muted style={{ marginTop: 6 }}>
              With store billing, a paid plan is cancelled in {STORE} and stays active until the end of the period you paid for.
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
  outcome: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 14, borderRadius: 18, backgroundColor: palette.lavender[50], borderWidth: 1, borderColor: palette.lavender[100] },
  outcomeError: { backgroundColor: colors.dangerSoft, borderColor: palette.rose[200] },
  receipt: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  cmpHead: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 6, paddingHorizontal: 16 },
  cmpRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 16 },
  col: { width: 52, alignItems: 'center', textAlign: 'center' },
  premCol: { height: 26, borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: palette.green[100], justifyContent: 'center' },
  premCell: { alignSelf: 'stretch', justifyContent: 'center', backgroundColor: palette.green[50], marginVertical: -11 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
});
