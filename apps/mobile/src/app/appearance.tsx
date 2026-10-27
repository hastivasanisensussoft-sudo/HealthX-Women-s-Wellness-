/**
 * Settings → Appearance: accent themes (free + premium) and light / dark / system mode,
 * with live mini previews. Applying saves the choice and restarts the app so every
 * screen picks it up (themes are applied at start-up by lib/themeBoot).
 */
import { canUseTheme, resolveTheme, THEMES, type ThemeDef, type ThemeId, type ThemeMode } from '@healthx/shared';
import { router } from 'expo-router';
import { Check, Crown, Laptop, Lock, Moon, Sun, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Appearance as RNAppearance, DevSettings, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useStore } from '@/lib/store';
import { brandText, colors, font, palette } from '@/lib/theme';
import { readThemePrefs, writeThemePrefs } from '@/lib/themeBoot';

const MODES: { value: ThemeMode; label: string; hint: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', hint: 'Bright and airy', icon: Sun },
  { value: 'dark', label: 'Dark', hint: 'Gentle at night', icon: Moon },
  { value: 'system', label: 'System', hint: 'Follows your phone', icon: Laptop },
];

const darkFor = (m: ThemeMode) => m === 'dark' || (m === 'system' && RNAppearance.getColorScheme() === 'dark');

/** Miniature app screen painted with a theme's colours. */
function MiniApp({ id, dark }: { id: ThemeId; dark: boolean }) {
  const r = resolveTheme(id, dark);
  const g = r.bg.green;
  return (
    <View style={[styles.mini, { backgroundColor: r.surface.canvas, borderColor: r.bg.ink[100] }]} accessible={false}>
      <View style={[styles.miniHead, { backgroundColor: g[900] }]}>
        <View style={[styles.miniLogo, { backgroundColor: '#FFFFFF' }]} />
        <View style={[styles.miniBar, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
      </View>
      <View style={{ padding: 8, gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {[g[50], r.bg.rose[50], r.bg.sky[50]].map((c, i) => (
            <View key={i} style={[styles.miniTile, { backgroundColor: c }]} />
          ))}
        </View>
        <View style={[styles.miniCard, { backgroundColor: r.surface.white }]}>
          <View style={[styles.miniRing, { borderColor: g[500] }]} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={[styles.miniLine, { backgroundColor: r.bg.ink[200], width: '80%' }]} />
            <View style={[styles.miniLine, { backgroundColor: r.bg.ink[100], width: '50%' }]} />
          </View>
        </View>
        <View style={[styles.miniBtn, { backgroundColor: themeBrand(id)[700] }]} />
      </View>
    </View>
  );
}
const themeBrand = (id: ThemeId) => (THEMES.find((t) => t.id === id) ?? THEMES[0]).brand;

function reloadApp() {
  if (Platform.OS === 'web') (globalThis as unknown as { location?: { reload(): void } }).location?.reload();
  else DevSettings.reload();
}

export default function AppearanceScreen() {
  const { state } = useStore();
  const saved = readThemePrefs();
  const [theme, setTheme] = useState<ThemeId>(saved.theme);
  const [mode, setMode] = useState<ThemeMode>(saved.mode);
  const plan = state.profile.plan;
  const changed = theme !== saved.theme || mode !== saved.mode;
  const dark = darkFor(mode);

  const apply = () => {
    const go = () => {
      writeThemePrefs({ theme, mode });
      reloadApp();
    };
    if (Platform.OS === 'web') go();
    else Alert.alert('Apply appearance?', 'HealthX restarts for a moment to apply the new theme. Your data stays as it is. If it doesn’t restart by itself, close and reopen the app.', [{ text: 'Not now', style: 'cancel' }, { text: 'Apply', onPress: go }]);
  };

  return (
    <Screen
      back
      eyebrow="Settings"
      title="Appearance"
      footer={
        changed ? (
          <Button label="Apply appearance" icon={Check} onPress={apply} full />
        ) : null
      }>
      <AppText variant="body" muted style={{ marginTop: 4 }}>
        Choose the colours and mode that feel right for you. Cycle and tracking colours keep their meaning in every theme.
      </AppText>

      <SectionHeader eyebrow="Mode" title="Light or dark" />
      <View style={styles.modes} accessibilityRole="radiogroup">
        {MODES.map((m) => {
          const on = mode === m.value;
          return (
            <Pressable key={m.value} accessibilityRole="radio" aria-checked={on} accessibilityLabel={`${m.label} mode`} onPress={() => setMode(m.value)} style={[styles.modeCard, on && styles.selected]}>
              <MiniApp id={theme} dark={darkFor(m.value)} />
              <View style={styles.modeRow}>
                <m.icon size={16} color={brandText} />
                <AppText variant="bodyBold" style={{ fontFamily: font.display }}>
                  {m.label}
                </AppText>
              </View>
              <AppText variant="caption" muted>
                {m.hint}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader eyebrow="Accent colour" title="Themes" />
      <View style={{ gap: 12 }}>
        {THEMES.map((t: ThemeDef) => {
          const allowed = canUseTheme(t, plan);
          const on = theme === t.id;
          return (
            <Card key={t.id} style={[styles.themeCard, on && styles.selected]}>
              <View style={{ width: 118 }}>
                <MiniApp id={t.id} dark={dark} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.nameRow}>
                  <AppText variant="h3" style={{ fontFamily: font.display }}>
                    {t.name}
                  </AppText>
                  <View style={[styles.badge, { backgroundColor: t.premium ? palette.butter[100] : palette.green[50] }]}>
                    {t.premium ? <Crown size={11} color={palette.butter[600]} /> : null}
                    <AppText variant="caption" color={t.premium ? colors.text : brandText}>
                      {t.premium ? 'Premium' : 'Free'}
                    </AppText>
                  </View>
                </View>
                <AppText variant="small" muted>
                  {t.description}
                </AppText>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {on ? (
                    <View style={styles.inUse}>
                      <Check size={14} color={brandText} />
                      <AppText variant="smallMedium" color={brandText}>
                        {t.id === saved.theme ? 'In use' : 'Selected'}
                      </AppText>
                    </View>
                  ) : allowed ? (
                    <Button label={`Use ${t.name}`} size="sm" variant="soft" onPress={() => setTheme(t.id)} accessibilityHint="Selects this theme. Apply it with the button at the bottom." />
                  ) : (
                    <Button label="Unlock with Premium" size="sm" variant="soft" icon={Lock} onPress={() => router.push('/premium')} accessibilityHint={`${t.name} is a Premium theme`} />
                  )}
                </View>
              </View>
            </Card>
          );
        })}
      </View>

      <Card tone="mint" style={{ marginTop: 18, gap: 6 }}>
        <AppText variant="bodyBold">Good to know</AppText>
        <AppText variant="small" muted>
          • The choice is saved on this device; the web app has its own Appearance setting.
        </AppText>
        <AppText variant="small" muted>
          • System mode checks your phone’s light or dark setting each time HealthX starts.
        </AppText>
        <AppText variant="small" muted>
          • Premium themes unlock with the Premium plan or the free trial. No real payment is taken in this demo.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', gap: 10 },
  modeCard: { flex: 1, gap: 6, padding: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  selected: { borderWidth: 2, borderColor: palette.green[600] },
  themeCard: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  inUse: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: palette.green[50] },
  mini: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  miniHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 7 },
  miniLogo: { width: 12, height: 12, borderRadius: 4 },
  miniBar: { height: 5, width: 40, borderRadius: 3 },
  miniTile: { flex: 1, height: 18, borderRadius: 7 },
  miniCard: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6, borderRadius: 9 },
  miniRing: { width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
  miniLine: { height: 4, borderRadius: 2 },
  miniBtn: { height: 12, width: 44, borderRadius: 6 },
});
