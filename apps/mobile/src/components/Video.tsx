/** Video preview card (poster, "Video preview" chip, length, play button) → full-screen player. */
import { VIDEOS, type VideoKey } from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Play, Video as VideoIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Photo } from './Photo';
import { AppText } from './Text';
import { posterSource, VIDEO_CATEGORY_LABEL } from '@/lib/media';
import { font, palette, shadow } from '@/lib/theme';

export const openVideo = (key: VideoKey) => router.push({ pathname: '/video/[key]', params: { key } });

export function VideoCard({ video, width = 260, height = 190, style, title }: { video: VideoKey; width?: number | `${number}%`; height?: number; style?: StyleProp<ViewStyle>; title?: string }) {
  const meta = VIDEOS[video];
  const name = title ?? meta.title;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Play video: ${name}`} onPress={() => openVideo(video)} style={({ pressed }) => [{ width }, style, pressed && { transform: [{ scale: 0.98 }] }]}>
      <Photo source={posterSource(video)} style={[styles.card, { height }]} radius={24}>
        <LinearGradient colors={['rgba(8,45,36,0)', 'rgba(8,45,36,0.15)', 'rgba(8,45,36,0.85)']} style={StyleSheet.absoluteFill} />
        <View style={styles.chip}>
          <VideoIcon size={12} color={palette.green[900]} />
          <AppText variant="caption" color={palette.green[900]} style={{ fontFamily: font.semibold }}>
            Video preview
          </AppText>
        </View>
        <View style={styles.len}>
          <AppText variant="caption" color="#fff" style={{ fontFamily: font.mono }}>
            {meta.sessionMinutes} min
          </AppText>
        </View>
        <View style={styles.play}>
          <Play size={20} color={palette.green[800]} fill={palette.green[800]} style={{ marginLeft: 2 }} />
        </View>
        <View style={styles.text}>
          <AppText variant="h3" color="#fff" numberOfLines={2} style={{ fontFamily: font.display, fontSize: 16 }}>
            {name}
          </AppText>
          <AppText variant="small" color="rgba(255,255,255,0.8)">
            {VIDEO_CATEGORY_LABEL[meta.category]}
          </AppText>
        </View>
      </Photo>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', ...shadow.card },
  chip: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  len: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(8,45,36,0.45)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  play: { position: 'absolute', top: '50%', left: '50%', width: 52, height: 52, marginLeft: -26, marginTop: -34, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', ...shadow.lift },
  text: { position: 'absolute', left: 14, right: 14, bottom: 12 },
});
