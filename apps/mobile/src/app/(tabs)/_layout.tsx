/** Bottom navigation (SRS §7 recommended): Home | Cycle | Wellness | Insights | Profile, plus a quick-log "+" (Mira reference). */
import { canUseTheme, DEFAULT_THEME, themeById } from '@healthx/shared';
import { Redirect, router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { CalendarHeart, Droplets, Dumbbell, Moon, Plus, Salad, Smile, Sparkles, Stethoscope, Wind } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '@/components/Sheet';
import { TabBarShape, TabIcon, type TabName } from '@/components/TabBarArt';
import { AppText } from '@/components/Text';
import { QuickTile } from '@/components/Tiles';
import { openVideo } from '@/components/Video';
import { useStore } from '@/lib/store';
import { brandText, colors, font, layout, palette } from '@/lib/theme';
import { THEME, readThemePrefs, writeThemePrefs } from '@/lib/themeBoot';
import { useToast } from '@/lib/toast';

const LABELS: Record<TabName, string> = { home: 'Home', cycle: 'Cycle', wellness: 'Wellness', insights: 'Insights', profile: 'Profile' };
/** Floating bar: body height, how far its middle rises, and the gap to the screen sides. */
const BAR_H = 66;
const BAR_RISE = 12;
const BAR_SIDE = 12;

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const barWidth = Math.min(width - BAR_SIDE * 2, 560);
  return (
    // box-none: the space beside the floating bar still scrolls and taps through to the screen.
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={{ width: barWidth, height: BAR_H + BAR_RISE }}>
        <TabBarShape width={barWidth} height={BAR_H + BAR_RISE} rise={BAR_RISE} />
        <View style={styles.bar} accessibilityRole="tablist">
          {state.routes.map((route, index) => {
            if (!(route.name in LABELS)) return null;
            const name = route.name as TabName;
            const focused = state.index === index;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                aria-selected={focused}
                accessibilityLabel={LABELS[name]}
                onPress={() => {
                  if (!focused) navigateToTab(route.key);
                }}
                style={styles.item}>
                {/* The active tab is marked by its green icon, bold label and the line below; the middle icon sits a little higher, inside the bar's rise. */}
                <View style={[styles.bubble, name === 'wellness' && { transform: [{ translateY: -4 }] }]}>
                  <TabIcon name={name} active={focused} cutout={colors.surface} size={28} />
                </View>
                <AppText style={[styles.label, focused ? styles.labelOn : null]} numberOfLines={1}>
                  {LABELS[name]}
                </AppText>
                <View style={[styles.dash, focused && styles.dashOn]} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/** Quick-log sheet: the most common logs in one tap, from any tab. */
function QuickLog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const go = (path: string) => {
    onClose();
    router.push(path as never);
  };
  const checkedIn = state.checkIns.some((c) => c.date === state.today);
  return (
    <Sheet visible={visible} onClose={onClose} title="Quick log" subtitle="What would you like to add for today?">
      <View style={styles.grid}>
        <QuickTile tone="rose" icon={CalendarHeart} label="Period" hint="Log or update" onPress={() => go('/log-period')} style={styles.cell} />
        <QuickTile tone="lavender" icon={Smile} label="Check-in" hint={checkedIn ? 'Edit today’s' : 'Under 30 seconds'} onPress={() => go('/check-in')} style={styles.cell} />
        <QuickTile tone="peach" icon={Stethoscope} label="Symptoms" hint="Cramps, headache…" onPress={() => go('/symptoms')} style={styles.cell} />
        <QuickTile
          tone="sky"
          icon={Droplets}
          label="Water"
          hint="Add 250 ml"
          onPress={() => {
            dispatch({ type: 'ADD_WATER', ml: 250 });
            toast('Added 250 ml of water', 'success');
            onClose();
          }}
          style={styles.cell}
        />
        <QuickTile tone="green" icon={Dumbbell} label="Workout" hint="Log a session" onPress={() => go('/fitness')} style={styles.cell} />
        <QuickTile tone="indigo" icon={Moon} label="Sleep" hint="Last night" onPress={() => go('/sleep')} style={styles.cell} />
        <QuickTile tone="butter" icon={Salad} label="Meal" hint="Breakfast, lunch…" onPress={() => go('/nutrition')} style={styles.cell} />
        <QuickTile tone="lavender" icon={Sparkles} label="Mood" hint="How you feel" onPress={() => go('/mood')} style={styles.cell} />
        <QuickTile
          tone="green"
          icon={Wind}
          label="Breathe"
          hint="Guided video"
          onPress={() => {
            onClose();
            openVideo('breathing');
          }}
          style={styles.cell}
        />
      </View>
    </Sheet>
  );
}

/** A saved premium theme switches back to Evergreen (from the next start) when the plan no longer includes it. */
function usePremiumThemeGuard(ready: boolean, plan: 'free' | 'premium') {
  const toast = useToast();
  useEffect(() => {
    if (!ready) return;
    const t = themeById(readThemePrefs().theme);
    if (canUseTheme(t, plan)) return;
    writeThemePrefs({ ...THEME.prefs, theme: DEFAULT_THEME.theme });
    toast(`${t.name} is a Premium theme, so Evergreen returns the next time HealthX opens.`, 'info');
  }, [ready, plan, toast]);
}

export default function TabsLayout() {
  const { state, ready, signedOutRoute } = useStore();
  const insets = useSafeAreaInsets();
  const [quick, setQuick] = useState(false);
  usePremiumThemeGuard(ready && state.auth.signedIn, state.profile.plan);
  if (!ready) return null;
  if (!state.auth.signedIn) return <Redirect href={signedOutRoute} />;
  if (!state.auth.onboarded) return <Redirect href="/onboarding" />;
  return (
    <View style={{ flex: 1 }}>
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.surface } }}>
        <Tabs.Screen name="home" />
        <Tabs.Screen name="cycle" />
        <Tabs.Screen name="wellness" />
        <Tabs.Screen name="insights" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quick log"
        onPress={() => setQuick(true)}
        style={({ pressed }) => [styles.fab, { bottom: layout.tabBarHeight + Math.max(insets.bottom, 8) + 6 }, pressed && { transform: [{ scale: 0.94 }] }]}>
        <Plus size={26} color="#fff" />
      </Pressable>
      <QuickLog visible={quick} onClose={() => setQuick(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', pointerEvents: 'box-none' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: BAR_H, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  item: { flex: 1, height: BAR_H, alignItems: 'center', justifyContent: 'center' },
  bubble: { alignItems: 'center', justifyContent: 'center', width: 54, height: 36, borderRadius: 18 },
  label: { fontFamily: font.semibold, fontSize: 11.5, lineHeight: 15, color: colors.textMuted, marginTop: 3 },
  labelOn: { fontFamily: font.bold, color: brandText },
  dash: { width: 16, height: 4, borderRadius: 2, marginTop: 3 },
  dashOn: { backgroundColor: brandText },
  fab: {
    position: 'absolute',
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.green[800],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
    shadowColor: '#082D24',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '31%', flexGrow: 1 },
});
