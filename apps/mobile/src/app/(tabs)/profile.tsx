/** Profile (mockup M31; Mira arch portrait with leaves): identity header, plan badge, stats, goals and grouped menu cards. */
import { GOALS, cycleStateOf, diffDays, formatDate, checkInStreak } from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Award, Bell, CalendarHeart, Cake, ChevronRight, Crown, Flame, Flower2, Globe, HeartPulse, Info, LogOut, MessageCircleQuestion, Palette, Pencil, Settings, Shield, Sparkles, Sprout, UsersRound } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { PhaseBadge, Pill } from '@/components/Badges';
import { Button, IconButton } from '@/components/Button';
import { GroupHeader, LeafPair, MenuCard, MenuRow, StatCardB, ON_DARK } from '@/components/b-kit';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useStore } from '@/lib/store';
import { colors, font, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const MODE_LABEL = { cycle: 'Cycle tracking', pregnancy: 'Pregnancy wellness', perimenopause: 'Perimenopause', menopause: 'Menopause' } as const;

export default function ProfileTab() {
  const { state, auth } = useStore();
  const toast = useToast();
  const p = state.profile;
  const cs = cycleStateOf(state);
  const age = p.dob ? Math.floor(diffDays(p.dob, state.today) / 365.25) : null;
  const premium = p.plan === 'premium';
  const connected = state.connections.filter((c) => c.connected).length;

  return (
    <Screen tabBarSpace padded={false}>
      {/* Identity header: arch portrait with leaves */}
      <View style={styles.head}>
        <LinearGradient colors={[palette.green[50], palette.rose[50], colors.surface]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.headBar}>
          <AppText variant="overline" color={palette.green[700]}>
            Your profile
          </AppText>
          <IconButton icon={Settings} label="Settings" onPress={() => router.push('/settings')} />
        </View>
        <View style={styles.archWrap}>
          <LeafPair size={150} style={{ left: -38, top: -18 }} />
          {p.avatar ? (
            <Photo photo={p.avatar} shape="arch" radius={26} position="top" style={styles.arch} alt={`${p.name || 'Your'} profile photo`} />
          ) : (
            <View style={[styles.arch, styles.archFallback]}>
              <AppText style={styles.initial}>{(p.name || '?').charAt(0)}</AppText>
            </View>
          )}
          <View style={[styles.planBadge, premium && { backgroundColor: palette.butter[400] }]}>
            {premium ? <Crown size={12} color={palette.green[950]} /> : <Sprout size={12} color="#fff" />}
            <AppText variant="caption" color={premium ? palette.green[950] : '#fff'} style={{ fontFamily: font.bold }}>
              {premium ? 'Premium' : 'Free plan'}
            </AppText>
          </View>
        </View>
        <AppText variant="display" center style={{ marginTop: 14 }}>
          {p.name || 'Your name'}
        </AppText>
        <AppText variant="small" muted center>
          {p.email}
        </AppText>
        <View style={styles.pills}>
          <Pill label={MODE_LABEL[p.mode]} tone="lavender" />
          <Pill label={`Member since ${formatDate(p.memberSince, 'short')}`} tone="ink" />
        </View>
        <Button label="Edit profile" icon={Pencil} variant="secondary" size="sm" onPress={() => router.push('/profile-edit')} style={{ marginTop: 14, alignSelf: 'center' }} />
      </View>

      <View style={styles.body}>
        <View style={styles.stats}>
          <StatCardB icon={CalendarHeart} tone="rose" label="Cycles" value={String(cs.completedCycles)} sub="logged" />
          <StatCardB icon={Flame} tone="peach" label="Streak" value={`${checkInStreak(state)} d`} sub="check-ins" />
          <StatCardB icon={Cake} tone="lavender" label="Age" value={age ? String(age) : '—'} sub="years" />
        </View>

        {/* Plan */}
        <Pressable accessibilityRole="button" accessibilityLabel={premium ? 'Subscription: Premium active (demo)' : 'Subscription: try Premium'} onPress={() => router.push('/premium')} style={({ pressed }) => [styles.plan, pressed && { opacity: 0.94 }]}>
          <LinearGradient colors={[palette.green[800], palette.green[950]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.planIcon}>
            <Sparkles size={20} color={palette.green[950]} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <AppText variant="h3" color="#fff">
                {premium ? 'Premium · active (demo)' : 'Try HealthX Premium'}
              </AppText>
              <PhaseBadge phase={2} />
            </View>
            <AppText variant="small" color={ON_DARK.text} style={{ marginTop: 2 }}>
              {premium ? 'Advanced insights, reports & coach' : '7-day free trial · advanced insights & reports'}
            </AppText>
          </View>
          <ChevronRight size={18} color={ON_DARK.text} />
        </Pressable>

        <GroupHeader eyebrow="What matters to you" title="Your goals" action="Edit" onAction={() => router.push('/profile-edit')} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {p.goals.length ? (
            p.goals.map((g) => <Pill key={g} label={GOALS.find((x) => x.key === g)?.label ?? g} tone="green" style={styles.goal} />)
          ) : (
            <AppText variant="small" muted>
              No goals selected
            </AppText>
          )}
        </View>

        <GroupHeader eyebrow="Account" title="Account & preferences" />
        <MenuCard>
          <MenuRow icon={Palette} tone="lavender" title="Appearance" subtitle="Theme, accent colour & dark mode" onPress={() => router.push('/appearance' as never)} />
          <MenuRow icon={Globe} title="Preferences" subtitle={`${p.units === 'metric' ? 'Metric' : 'Imperial'} · ${p.language} · ${p.timezone}`} onPress={() => router.push('/preferences')} />
          <MenuRow icon={Bell} tone="sky" title="Notifications & reminders" subtitle={`${state.reminders.filter((r) => r.enabled).length} reminders on`} onPress={() => router.push('/notification-settings')} />
          <MenuRow icon={Flower2} tone="lavender" title="Life stage" subtitle={MODE_LABEL[p.mode]} right={<PhaseBadge phase={3} />} onPress={() => router.push('/life-stages')} />
          <MenuRow icon={Crown} tone="butter" title="Subscription" subtitle={premium ? 'Premium · active (demo)' : 'Free plan · see Premium'} right={<PhaseBadge phase={2} />} onPress={() => router.push('/premium')} last />
        </MenuCard>

        <GroupHeader eyebrow="Connected" title="Connected & community" />
        <MenuCard>
          <MenuRow icon={HeartPulse} tone="rose" title="Health integrations" subtitle={connected ? `${connected} connected` : 'Apple Health · Health Connect'} right={<PhaseBadge phase={2} />} onPress={() => router.push('/integrations')} />
          <MenuRow icon={Award} tone="butter" title="Achievements" subtitle={`${state.badges.filter((b) => b.earnedAt).length} of ${state.badges.length} badges`} onPress={() => router.push('/achievements')} />
          <MenuRow icon={UsersRound} tone="lavender" title="Community" subtitle="Moderated groups · preview" right={<PhaseBadge phase={4} />} onPress={() => router.push('/community')} last />
        </MenuCard>

        <GroupHeader eyebrow="Your data" title="Privacy & support" />
        <MenuCard>
          <MenuRow icon={Shield} title="Privacy & data" subtitle="Consents, export, delete account" onPress={() => router.push('/privacy')} />
          <MenuRow icon={Sprout} tone="green" title="Wellness library" subtitle="Articles, audio & video" onPress={() => router.push('/learn')} />
          <MenuRow icon={MessageCircleQuestion} tone="sky" title="Help & most asked questions" onPress={() => router.push('/learn/faq')} />
          <MenuRow icon={Settings} tone="indigo" title="Settings" subtitle="Connection, demo data, about" onPress={() => router.push('/settings')} />
          <MenuRow icon={Info} tone="peach" title="About HealthX" subtitle="Wellness app · not a medical device" onPress={() => router.push('/settings')} last />
        </MenuCard>

        <Button
          label="Sign out"
          icon={LogOut}
          variant="ghost"
          onPress={async () => {
            await auth.logout();
            toast('Signed out', 'info');
            router.replace('/welcome');
          }}
          style={{ marginTop: 18, alignSelf: 'center' }}
        />
        <AppText variant="caption" muted center style={{ marginTop: 4 }}>
          HealthX Women’s Wellness · version 0.1.0
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden', alignItems: 'stretch' },
  headBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  archWrap: { alignSelf: 'center', marginTop: 8, width: 132, height: 164 },
  arch: { width: 132, height: 164, borderWidth: 4, borderColor: colors.surface, ...shadow.lift },
  archFallback: { borderTopLeftRadius: 999, borderTopRightRadius: 999, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, backgroundColor: palette.green[700], alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: font.displayBold, fontSize: 52, lineHeight: 60, color: '#fff' },
  planBadge: { position: 'absolute', bottom: -10, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: palette.green[700], borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 2, borderColor: colors.surface },
  pills: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' },
  body: { paddingHorizontal: 20 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 18 },
  plan: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 24, overflow: 'hidden' },
  planIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: palette.butter[400], alignItems: 'center', justifyContent: 'center' },
  goal: { paddingHorizontal: 12, paddingVertical: 6 },
});
