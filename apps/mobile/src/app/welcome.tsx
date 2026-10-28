/**
 * Welcome carousel (mockup M02): evergreen backdrop, each slide's cut-out illustration standing still on
 * a soft glow (no frame or background) with themed animated decorations around it (blossoms, petals,
 * leaves, stars, hearts), then the copy; soft leaves and drifting petals around Get started / log in /
 * Explore demo.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions, type ImageSourcePropType, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtFigure, Leaf, Logo } from '@/components/Art';
import { DecorLayer, type DecorTheme } from '@/components/Decor';
import { Button } from '@/components/Button';
import { AppText } from '@/components/Text';
import { useReducedMotion } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import { font, onDark, palette } from '@/lib/theme';
import { WELCOME_ART } from '@/lib/welcomeArt';

/** Height of the decorated band at the bottom (Get started, log in, privacy line). */
const FOLIAGE_H = 250;

/**
 * Each picture has its own animated decorations (components/Decor); the girls themselves stay still. The
 * meditation figure also sits on a soft shadow.
 */
const SLIDES: { art: ImageSourcePropType; decor?: DecorTheme; ground?: boolean; alt: string; title: string; script: string; text: string }[] = [
  {
    art: WELCOME_ART.calm,
    decor: 'bloom',
    ground: true,
    alt: 'Illustration: a woman meditating calmly',
    title: 'Understand your body,',
    script: 'gently.',
    text: 'Track your cycle, symptoms, mood and energy in seconds — with estimates that learn from your own history.',
  },
  {
    art: WELCOME_ART.breathe,
    decor: 'breath',
    alt: 'Illustration: a woman in a gentle yoga stretch',
    title: 'Wellness that fits',
    script: 'your life.',
    text: 'Daily check-ins, hydration, sleep, movement and habits — all in one calm place.',
  },
  {
    art: WELCOME_ART.dreamer,
    decor: 'dream',
    alt: 'Illustration: a girl looking up hopefully, chin on her hand',
    title: 'Support for every',
    script: 'stage.',
    text: 'From first periods to perimenopause and menopause. Private by design — you control your data.',
  },
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { auth, mode } = useStore();
  const [index, setIndex] = useState(0);
  const [listH, setListH] = useState(0);
  const [footW, setFootW] = useState(0);
  const reduce = useReducedMotion();
  const list = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const { width } = useWindowDimensions();
  const compact = listH > 0 && listH < 520;
  // The figure takes what the copy below doesn't need, within sensible limits.
  const figureH = Math.round(Math.max(190, Math.min(listH - (compact ? 186 : 204), width * 0.95)));

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, e.nativeEvent.layoutMeasurement.width));
    if (i !== index) setIndex(i);
  };

  const goTo = (i: number) => {
    list.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[palette.green[600], palette.green[800], palette.green[950]]} locations={[0, 0.5, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <Leaf size={220} color={palette.green[300]} rotate={-35} style={{ left: -90, top: 120, opacity: 0.1 }} />
      <Leaf size={180} color={palette.green[300]} rotate={140} style={{ right: -80, bottom: 220, opacity: 0.08 }} />
      {/* Soft leaves in the bottom corners and drifting petals around Get started (behind the buttons). */}
      <View pointerEvents="none" onLayout={(e) => setFootW(Math.round(e.nativeEvent.layout.width))} style={[styles.foliage, { height: FOLIAGE_H + insets.bottom }]}>
        {footW ? <DecorLayer theme="foliage" front={false} width={footW} height={FOLIAGE_H + insets.bottom} active still={reduce} /> : null}
      </View>

      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <Logo light />
        <Button
          label="Explore demo"
          size="sm"
          variant="light"
          onPress={async () => {
            // Offline demo signs straight in; with the server, use the seeded demo account.
            if (mode === 'offline') {
              await auth.login('aisha@example.com', 'offline-demo');
              router.replace('/home');
            } else router.push({ pathname: '/login', params: { email: 'aisha@example.com' } });
          }}
        />
      </View>

      <View style={{ flex: 1 }} onLayout={(e) => setListH(e.nativeEvent.layout.height)}>
        {listH ? (
          <FlatList
            ref={list}
            data={SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            keyExtractor={(s) => s.title}
            extraData={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            renderItem={({ item, index: i }) => (
              <View style={[styles.slide, { width, height: listH }]}>
                <View style={{ width: '100%', paddingHorizontal: 26, marginTop: 6 }}>
                  <ArtFigure source={item.art} height={figureH} glow="rgba(255,255,255,0.09)" alt={item.alt} active={i === index} decor={item.decor} ground={item.ground} />
                </View>
                <View style={styles.copy}>
                  <AppText style={[styles.title, compact && { fontSize: 28, lineHeight: 33 }]}>{item.title}</AppText>
                  <AppText style={[styles.title, styles.script, compact && { fontSize: 28, lineHeight: 33 }]}>{item.script}</AppText>
                  <AppText variant="body" color={onDark.green[100]} style={{ marginTop: 10, maxWidth: 420 }}>
                    {item.text}
                  </AppText>
                </View>
              </View>
            )}
          />
        ) : null}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.dots} accessibilityRole="tablist">
          {SLIDES.map((s, i) => (
            <Pressable key={s.title} accessibilityRole="tab" aria-selected={i === index} accessibilityLabel={`Slide ${i + 1} of ${SLIDES.length}`} onPress={() => goTo(i)} hitSlop={10}>
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
        <Button label="Get started" iconRight={ArrowRight} size="lg" variant="light" full onPress={() => router.push('/signup')} />
        <Pressable accessibilityRole="link" onPress={() => router.push('/login')} style={({ pressed }) => [styles.login, pressed && { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
          <AppText variant="bodyBold" color="#fff">
            I already have an account
          </AppText>
        </Pressable>
        <View style={styles.privacy}>
          <ShieldCheck size={14} color={onDark.green[200]} />
          <AppText variant="caption" color={onDark.green[200]}>
            Private by design · not a medical device
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.green[900], overflow: 'hidden' },
  top: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slide: { justifyContent: 'flex-start', alignItems: 'center' },
  copy: { alignSelf: 'stretch', marginTop: 20, paddingHorizontal: 26, maxWidth: 520, width: '100%', marginHorizontal: 'auto' },
  title: { fontFamily: font.displayBold, fontSize: 33, lineHeight: 38, letterSpacing: -0.8, color: '#fff' },
  script: { color: onDark.butter[300], fontStyle: 'italic' },
  bottom: { paddingHorizontal: 24, paddingTop: 6, width: '100%', maxWidth: 560, alignSelf: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 16, alignSelf: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.32)' },
  dotActive: { width: 28, backgroundColor: palette.butter[300] },
  login: { alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 24, marginTop: 6 },
  foliage: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 },
});
