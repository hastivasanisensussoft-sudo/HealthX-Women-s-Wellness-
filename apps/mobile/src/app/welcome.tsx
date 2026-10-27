/** Welcome carousel (mockup M02; Mira onboarding reference): evergreen backdrop, arch portraits with leaves, Get started / log in / Explore demo. */
import type { PhotoKey } from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArchPortrait, Leaf, Logo, Sparkle } from '@/components/Art';
import { Button } from '@/components/Button';
import { AppText } from '@/components/Text';
import { useStore } from '@/lib/store';
import { font, onDark, palette } from '@/lib/theme';

const SLIDES: { photo: PhotoKey; plate: string; title: string; script: string; text: string }[] = [
  {
    photo: 'portrait-curly',
    plate: palette.butter[300],
    title: 'Understand your body,',
    script: 'gently.',
    text: 'Track your cycle, symptoms, mood and energy in seconds — with estimates that learn from your own history.',
  },
  {
    photo: 'portrait-indian',
    plate: palette.rose[200],
    title: 'Wellness that fits',
    script: 'your life.',
    text: 'Daily check-ins, hydration, sleep, movement and habits — all in one calm place.',
  },
  {
    photo: 'mature-woman',
    plate: palette.green[200],
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
  const list = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const { width } = useWindowDimensions();
  const compact = listH > 0 && listH < 470;
  const archW = compact ? 168 : 206;

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
            keyExtractor={(s) => s.photo}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            renderItem={({ item }) => (
              <View style={[styles.slide, { width, height: listH }]}>
                <View style={{ alignItems: 'center' }}>
                  <ArchPortrait photo={item.photo} width={archW} height={archW * 1.25} plate={item.plate} />
                  <Sparkle size={18} color={onDark.butter[300]} style={{ left: -26, top: archW * 0.5 }} />
                  <Sparkle size={11} color="#fff" style={{ right: -18, top: archW * 0.9 }} />
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
            <Pressable key={s.photo} accessibilityRole="tab" aria-selected={i === index} accessibilityLabel={`Slide ${i + 1} of ${SLIDES.length}`} onPress={() => goTo(i)} hitSlop={10}>
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
  top: { paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slide: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 26 },
  copy: { alignSelf: 'stretch', marginTop: 20, maxWidth: 480, width: '100%', marginHorizontal: 'auto' },
  title: { fontFamily: font.displayBold, fontSize: 33, lineHeight: 38, letterSpacing: -0.8, color: '#fff' },
  script: { color: onDark.butter[300], fontStyle: 'italic' },
  bottom: { paddingHorizontal: 24, paddingTop: 6, width: '100%', maxWidth: 560, alignSelf: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 16, alignSelf: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.32)' },
  dotActive: { width: 28, backgroundColor: palette.butter[300] },
  login: { alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 24, marginTop: 6 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 },
});
