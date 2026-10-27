/** Bottom navigation (SRS §7 recommended): Home | Cycle | Wellness | Insights | Profile, plus a quick-log "+" (Mira reference). */
import { canUseTheme, DEFAULT_THEME, themeById } from '@healthx/shared';
import { Redirect, router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { CalendarHeart, ChartColumn, Droplets, Dumbbell, Heart, House, Moon, Plus, Salad, Smile, Sparkles, Stethoscope, UserRound, Wind, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { QuickTile } from '@/components/Tiles';
import { openVideo } from '@/components/Video';
import { useStore } from '@/lib/store';
import { brandText, colors, font, layout, palette } from '@/lib/theme';
import { THEME, readThemePrefs, writeThemePrefs } from '@/lib/themeBoot';
import { useToast } from '@/lib/toast';

const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  home: { icon: House, label: 'Home' },
  cycle: { icon: CalendarHeart, label: 'Cycle' },
  wellness: { icon: Heart, label: 'Wellness' },
  insights: { icon: ChartColumn, label: 'Insights' },
  profile: { icon: UserRound, label: 'Profile' },
};

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const meta = ICONS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const Icon = meta.icon;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              aria-selected={focused}
              accessibilityLabel={meta.label}
              onPress={() => {
                if (!focused) navigateToTab(route.key);
              }}
              style={styles.item}>
              <View style={[styles.iconWrap, focused && styles.iconActive]}>
                <Icon size={21} color={focused ? brandText : palette.ink[400]} strokeWidth={focused ? 2.4 : 2} fill={focused && route.name === 'wellness' ? brandText : 'none'} />
              </View>
              <AppText variant="caption" color={focused ? brandText : palette.ink[400]} style={{ fontSize: 11, fontFamily: focused ? font.bold : font.medium }}>
                {meta.label}
              </AppText>
            </Pressable>
          );
        })}
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
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    alignItems: 'center',
    shadowColor: '#0D4336',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  bar: { flexDirection: 'row', paddingTop: 10, paddingHorizontal: 8, width: '100%', maxWidth: 560 },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: palette.green[100] },
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
