/**
 * Full-screen video preview (expo-video) with the guided routine below it. If the clip is
 * missing or can't play, the poster and the step-by-step routine are shown instead.
 */
import { VIDEOS, type VideoKey } from '@healthx/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { RotateCcw, Video as VideoIcon, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/Feedback';
import { Photo } from '@/components/Photo';
import { AppText } from '@/components/Text';
import { posterSource, VIDEO_CATEGORY_LABEL, videoSource } from '@/lib/media';
import { brandText, colors, font, palette } from '@/lib/theme';
import { track } from '@/lib/track';

type Status = 'loading' | 'ready' | 'error';

export default function VideoScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const meta = key && key in VIDEOS ? VIDEOS[key as VideoKey] : null;
  const src = meta ? videoSource(meta.key) : undefined;
  const player = useVideoPlayer(src ?? null, (p) => {
    p.loop = false;
    if (src) p.play();
  });
  const [status, setStatus] = useState<Status>(src ? 'loading' : 'error');

  useEffect(() => {
    if (key) track('video_played', key);
  }, [key]);

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status: s }) => setStatus(s === 'error' ? 'error' : s === 'readyToPlay' ? 'ready' : 'loading'));
    return () => sub.remove();
  }, [player]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  if (!meta) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 40 }}>
        <EmptyState title="Video not found" text="This video isn’t available." action="Back" onAction={close} />
      </View>
    );
  }

  const videoW = Math.min(width, 900);
  const videoH = Math.round((videoW * 9) / 16);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close video" onPress={close} hitSlop={8} style={styles.close}>
          <X size={20} color="#fff" />
        </Pressable>
        <AppText variant="overline" color="rgba(255,255,255,0.7)">
          Video preview
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ width: videoW, height: videoH, alignSelf: 'center', backgroundColor: palette.green[950] }}>
        {src && status !== 'error' ? (
          <VideoView player={player} style={{ width: videoW, height: videoH }} nativeControls contentFit="contain" accessibilityLabel={`${meta.title} video`} />
        ) : null}
        {status === 'loading' && src ? (
          <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none" accessibilityLabel="Loading video">
            <ActivityIndicator color="#fff" size="large" />
          </View>
        ) : null}
        {status === 'error' ? (
          <Photo source={posterSource(meta.key)} shape="none" style={StyleSheet.absoluteFill}>
            <View style={[StyleSheet.absoluteFill, styles.center, styles.errorShade]}>
              <VideoIcon size={26} color="#fff" />
              <AppText variant="smallMedium" color="#fff" center style={{ maxWidth: 280, marginTop: 8 }}>
                This video can’t play right now. You can still follow the routine step by step below.
              </AppText>
              {src ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Try playing the video again"
                  onPress={() => {
                    setStatus('loading');
                    player.replace(src);
                    player.play();
                  }}
                  style={styles.retry}>
                  <RotateCcw size={15} color={palette.green[900]} />
                  <AppText variant="smallMedium" color={palette.green[900]}>
                    Try again
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          </Photo>
        ) : null}
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={{ padding: 22, paddingBottom: insets.bottom + 32 }}>
        <AppText variant="overline" color={palette.green[700]}>
          {VIDEO_CATEGORY_LABEL[meta.category]} · {meta.sessionMinutes}-minute routine
        </AppText>
        <AppText variant="title" style={{ marginTop: 6 }}>
          {meta.title}
        </AppText>
        <AppText variant="body" muted style={{ marginTop: 8 }}>
          {meta.description}
        </AppText>
        <View style={{ marginTop: 18, gap: 10 }}>
          {meta.steps.map((s, i) => (
            <View key={s} style={styles.step}>
              <View style={styles.stepNum}>
                <AppText variant="caption" color={brandText} style={{ fontFamily: font.monoMedium }}>
                  {i + 1}
                </AppText>
              </View>
              <AppText variant="bodyMedium" style={{ flex: 1 }}>
                {s}
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="small" muted style={{ marginTop: 18 }}>
          Short preview clip (free stock footage). Go at your own pace and stop if anything feels uncomfortable. This is general wellness guidance, not medical advice.
        </AppText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.green[950] },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorShade: { backgroundColor: 'rgba(8,45,36,0.7)', padding: 20 },
  retry: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  sheet: { flex: 1, backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: 16 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.green[50], borderRadius: 18, padding: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.green[200], alignItems: 'center', justifyContent: 'center' },
});
