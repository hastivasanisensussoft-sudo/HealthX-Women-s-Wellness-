/**
 * Audio / video player (mockup M29). FRONTEND DEMO: there is no media file — playback is a
 * simulated timer so progress, ±15 s, pause and the sleep timer can be tried.
 */
import { formatDate } from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, Headphones, Heart, Moon, Pause, Play, RotateCcw, RotateCw, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/Feedback';
import { FilterChip, isPlayable, isQuickHelp, mediaLabel, mediaOf } from '@/components/LibraryCards';
import { Photo } from '@/components/Photo';
import { goBack } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { Leaf, LeafPair, ON_DARK } from '@/components/b-kit';
import { useStore } from '@/lib/store';
import { colors, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { track } from '@/lib/track';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const SLEEP_OPTIONS = [null, 15, 30] as const;

export default function Player() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const a = state.articles.find((x) => x.id === id);
  const total = (a?.readMin ?? 0) * 60;
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sleepMin, setSleepMin] = useState<number | null>(null);
  const [sleepLeft, setSleepLeft] = useState<number | null>(null);

  const finished = total > 0 && elapsed >= total;
  const sleptOut = sleepLeft !== null && sleepLeft <= 0;
  const isPlaying = playing && !finished && !sleptOut;

  useEffect(() => {
    if (id) track('content_opened', id);
  }, [id]);

  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      setElapsed((e) => Math.min(total, e + 1));
      setSleepLeft((s) => (s === null ? null : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [isPlaying, total]);

  if (!a || !isPlayable(a)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top + 40 }}>
        <EmptyState icon={Headphones} title="Nothing to play" text="This item isn’t audio or video." action="Back to library" onAction={() => router.replace('/learn')} />
      </View>
    );
  }

  const saved = state.bookmarks.includes(a.id);
  const video = mediaOf(a) === 'video';
  const togglePlay = () => {
    if (isPlaying) return setPlaying(false);
    if (finished) setElapsed(0);
    if (sleptOut) {
      setSleepMin(null);
      setSleepLeft(null);
    }
    if (elapsed === 0) dispatch({ type: 'MARK_ARTICLE_READ', articleId: a.id });
    setPlaying(true);
  };
  const seek = (delta: number) => setElapsed((e) => Math.max(0, Math.min(total, e + delta)));
  const chooseSleep = (m: number | null) => {
    setSleepMin(m);
    setSleepLeft(m === null ? null : m * 60);
    toast(m === null ? 'Sleep timer off' : `Sleep timer: ${m} min`, 'info');
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[palette.green[800], palette.green[950]]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
      <Leaf size={200} color="rgba(147,207,184,0.10)" vein={false} rotate={30} style={{ position: 'absolute', top: 120, left: -90 }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close player" onPress={goBack} hitSlop={6} style={styles.round}>
            <ChevronDown size={22} color="#fff" />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <AppText variant="overline" color={ON_DARK.soft}>
              {mediaLabel(a)}
            </AppText>
            <AppText variant="h3" color="#fff">
              Now playing
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from favorites' : 'Add to favorites'}
            onPress={() => {
              dispatch({ type: 'TOGGLE_BOOKMARK', articleId: a.id });
              toast(saved ? 'Removed from favorites' : 'Added to favorites');
            }}
            hitSlop={6}
            style={[styles.round, saved && { backgroundColor: palette.rose[50] }]}>
            <Heart size={19} color={saved ? palette.rose[500] : '#fff'} fill={saved ? palette.rose[500] : 'transparent'} />
          </Pressable>
        </View>

        {video ? (
          <Photo photo={a.photo} radius={26} style={styles.artVideo}>
            <LinearGradient colors={['rgba(8,45,36,0.1)', 'rgba(8,45,36,0.55)']} style={StyleSheet.absoluteFill} />
            {!isPlaying ? (
              <View style={styles.videoPlay}>
                <Play size={28} color={palette.green[800]} fill={palette.green[800]} style={{ marginLeft: 3 }} />
              </View>
            ) : (
              <View style={styles.live}>
                <View style={styles.liveDot} />
                <AppText variant="caption" color="#fff">
                  Simulated playback
                </AppText>
              </View>
            )}
          </Photo>
        ) : (
          <View style={styles.archWrap}>
            <LeafPair size={150} style={{ left: -40, top: -10 }} />
            <Photo photo={a.photo} shape="arch" radius={28} style={styles.arch} />
          </View>
        )}

        <AppText variant="title" color="#fff" center style={{ marginTop: 22 }}>
          {a.title}
        </AppText>
        <AppText variant="small" color={ON_DARK.soft} center style={{ marginTop: 4 }}>
          {mediaLabel(a)} · {a.readMin} min{isQuickHelp(a) ? ' · Quick Help' : ''}
        </AppText>

        <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: elapsed }}>
          <View style={[styles.fill, { width: `${total ? (elapsed / total) * 100 : 0}%` }]} />
          <View style={[styles.knob, { left: `${total ? (elapsed / total) * 100 : 0}%` }]} />
        </View>
        <View style={styles.times}>
          <AppText variant="caption" color={ON_DARK.text} style={{ fontFamily: font.mono }}>
            {clock(elapsed)}
          </AppText>
          <AppText variant="caption" color={ON_DARK.text} style={{ fontFamily: font.mono }}>
            {clock(total)}
          </AppText>
        </View>

        <View style={styles.controls}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back 15 seconds" onPress={() => seek(-15)} style={styles.skip} hitSlop={8}>
            <RotateCcw size={24} color="#fff" />
            <AppText variant="caption" color={ON_DARK.text} style={styles.skipNum}>
              15
            </AppText>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause' : 'Play'} onPress={togglePlay} style={({ pressed }) => [styles.big, pressed && { transform: [{ scale: 0.96 }] }]}>
            {isPlaying ? <Pause size={32} color={palette.green[950]} fill={palette.green[950]} /> : <Play size={32} color={palette.green[950]} fill={palette.green[950]} style={{ marginLeft: 4 }} />}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Forward 15 seconds" onPress={() => seek(15)} style={styles.skip} hitSlop={8}>
            <RotateCw size={24} color="#fff" />
            <AppText variant="caption" color={ON_DARK.text} style={styles.skipNum}>
              15
            </AppText>
          </Pressable>
        </View>

        <View style={styles.sleepCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Moon size={16} color={ON_DARK.soft} />
            <AppText variant="smallMedium" color="#fff" style={{ flex: 1 }}>
              Sleep timer
            </AppText>
            {sleepLeft !== null && sleepLeft > 0 ? (
              <AppText variant="caption" color={ON_DARK.soft}>
                stops in {Math.ceil(sleepLeft / 60)} min
              </AppText>
            ) : null}
          </View>
          <View style={styles.sleepRow}>
            {SLEEP_OPTIONS.map((m) => (
              <FilterChip key={String(m)} label={m === null ? 'Off' : `${m} min`} soft on={sleepMin === m} onPress={() => chooseSleep(m)} />
            ))}
          </View>
          {sleptOut ? (
            <AppText variant="caption" color={palette.butter[400]} style={{ marginTop: 8 }}>
              Sleep timer ended playback.
            </AppText>
          ) : null}
        </View>

        <View style={styles.review}>
          <View style={styles.tick}>
            <ShieldCheck size={15} color={palette.green[950]} />
          </View>
          <AppText variant="caption" color={ON_DARK.text} style={{ flex: 1 }}>
            <AppText variant="caption" color="#fff" style={{ fontFamily: font.bold }}>
              Medically reviewed
            </AppText>{' '}
            by {a.reviewer} · {formatDate(a.reviewDate, 'medium')}
          </AppText>
        </View>
        <AppText variant="caption" color={ON_DARK.soft} center style={{ marginTop: 12, fontStyle: 'italic' }}>
          Simulated playback in this demo · real audio/video and background play arrive with the content service.
        </AppText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.green[950] },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  artVideo: { marginTop: 22, width: '100%', aspectRatio: 16 / 10, alignItems: 'center', justifyContent: 'center' },
  archWrap: { marginTop: 22, alignSelf: 'center', width: 230, height: 280 },
  arch: { width: 230, height: 280, borderWidth: 4, borderColor: 'rgba(255,255,255,0.85)' },
  videoPlay: { position: 'absolute', top: '50%', left: '50%', marginTop: -34, marginLeft: -34, width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  live: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(8,45,36,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.butter[400] },
  track: { height: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.16)', marginTop: 24, justifyContent: 'center' },
  fill: { height: '100%', backgroundColor: palette.butter[400], borderRadius: 6 },
  knob: { position: 'absolute', width: 16, height: 16, marginLeft: -8, borderRadius: 8, backgroundColor: '#fff' },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 34, marginTop: 14 },
  skip: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  skipNum: { position: 'absolute', fontSize: 9, lineHeight: 11, fontFamily: font.bold },
  big: { width: 78, height: 78, borderRadius: 39, backgroundColor: palette.butter[400], alignItems: 'center', justifyContent: 'center' },
  sleepCard: { marginTop: 22, padding: 14, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  sleepRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  review: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)' },
  tick: { width: 28, height: 28, borderRadius: 14, backgroundColor: palette.green[400], alignItems: 'center', justifyContent: 'center' },
});
