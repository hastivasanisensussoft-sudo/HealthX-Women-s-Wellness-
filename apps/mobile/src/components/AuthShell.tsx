/**
 * Auth screens (mockup M03–M05; Mira reference): evergreen header with an arch portrait and leaves, then a
 * clean form card. With `art` (sign-up, product owner's mockup) the header instead has a serif headline
 * on the left — its part after " — " in light green — and the cut-out illustration at the right edge,
 * still, with butterflies, blossoms, leaves and sparkles animating around it.
 */
import type { PhotoKey } from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArchPortrait, ArtFigure, Leaf, Logo, Sparkle } from './Art';
import { BackendNote } from './Badges';
import { DecorLayer } from './Decor';
import { goBack } from './Screen';
import { AppText } from './Text';
import { useReducedMotion } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import { colors, font, onDark, palette } from '@/lib/theme';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  photo = 'portrait-curly',
  art,
  eyebrow = 'Cycle · Mood · Wellness',
  tagline = 'Your calm space for cycle & everyday wellness.',
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Arch portrait in the header (additive). */
  photo?: PhotoKey;
  /** A cut-out illustration instead of the photo, with the serif headline beside it (lib/welcomeArt). */
  art?: ImageSourcePropType;
  /** Mono label above the header tagline (additive; not shown with `art`). */
  eyebrow?: string;
  /** Short welcoming line in the header (additive). */
  tagline?: string;
}) {
  const insets = useSafeAreaInsets();
  const { mode } = useStore();
  const reduce = useReducedMotion();
  const [box, setBox] = useState({ w: 0, h: 0 });
  // The illustration (569 × 610) fills about two thirds of the header width, its feet under the card.
  const figW = box.w ? Math.min(Math.round(box.w * 0.66), 320) : 0;
  const figH = Math.round(figW * 1.07);
  const [lead, rest] = tagline.split(/\s—\s/);
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.green[900] }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.surface }}>
        <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <LinearGradient colors={[palette.green[700], palette.green[900], palette.green[950]]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Leaf size={160} color={palette.green[300]} rotate={-30} style={{ left: -50, bottom: 10, opacity: 0.13 }} />
          {art ? null : <Sparkle size={14} color={onDark.butter[300]} twinkle style={{ left: '46%', top: insets.top + 74 }} />}
          <View style={styles.inner}>
            <View style={styles.top}>
              <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} hitSlop={8} style={({ pressed }) => [styles.back, pressed && { backgroundColor: 'rgba(255,255,255,0.24)' }]}>
                <ChevronLeft size={22} color="#fff" />
              </Pressable>
              <Logo size={24} light />
              <View style={{ width: 44 }} />
            </View>
            {art ? (
              <View onLayout={(e) => setBox({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })} style={[styles.artHero, { minHeight: figH || 250 }]}>
                {box.w ? <DecorLayer theme="garden" front={false} width={box.w} height={box.h} active still={reduce} /> : null}
                {figW ? (
                  <View style={[styles.artFigure, { width: figW, height: figH }]}>
                    <ArtFigure source={art} height={figH} glow="rgba(255,255,255,0.07)" />
                  </View>
                ) : null}
                {box.w ? <DecorLayer theme="garden" front width={box.w} height={box.h} active still={reduce} /> : null}
                <View style={styles.artCopy}>
                  <AppText style={styles.serif}>
                    {/* A non-breaking space keeps the dash with the word before it. */}
                    {rest ? `${lead} —\n` : lead}
                    {rest ? <AppText style={[styles.serif, { color: onDark.green[200] }]}>{rest}</AppText> : null}
                  </AppText>
                  <View style={[styles.trust, { marginTop: 18 }]}>
                    <ShieldCheck size={13} color={onDark.butter[300]} />
                    <AppText variant="caption" color="#fff">
                      Private by design
                    </AppText>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.heroRow}>
                <View style={{ flex: 1, paddingBottom: 46 }}>
                  <AppText variant="overline" color={onDark.green[200]} style={{ fontSize: 9.5 }}>
                    {eyebrow}
                  </AppText>
                  <AppText style={styles.tagline}>{tagline}</AppText>
                  <View style={styles.trust}>
                    <ShieldCheck size={13} color={onDark.butter[300]} />
                    <AppText variant="caption" color="#fff">
                      Private by design
                    </AppText>
                  </View>
                </View>
                <ArchPortrait photo={photo} width={136} height={172} plate={palette.butter[300]} style={{ marginBottom: 26 }} />
              </View>
            )}
          </View>
        </View>
        <View style={[styles.card, { paddingBottom: insets.bottom + 28 }]}>
          <View style={styles.inner}>
            <AppText variant="display" accessibilityRole="header">
              {title}
            </AppText>
            <AppText variant="body" color={palette.green[700]} style={{ marginTop: 4 }}>
              {subtitle}
            </AppText>
            <View style={{ marginTop: 22 }}>{children}</View>
            {footer ? <View style={{ alignItems: 'center', marginTop: 22 }}>{footer}</View> : null}
            {mode === 'offline' ? <BackendNote text="Offline demo — no real account is created and nothing is sent to a server." style={{ marginTop: 22 }} /> : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', paddingHorizontal: 20 },
  inner: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 14 },
  artHero: { marginTop: 10 },
  // Right edge of the screen; the bottom 30 px sit under the form card, as in the mockup.
  artFigure: { position: 'absolute', right: -20, bottom: 0 },
  artCopy: { width: '58%', paddingTop: 22, paddingBottom: 54 },
  serif: { fontFamily: font.serif, fontSize: 29, lineHeight: 34, color: '#fff' },
  tagline: { fontFamily: font.display, fontSize: 23, lineHeight: 29, letterSpacing: -0.4, color: '#fff', marginTop: 8 },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 14, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  card: { flexGrow: 1, marginTop: -30, backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 22, paddingTop: 28 },
});
