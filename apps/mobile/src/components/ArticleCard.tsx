/** Article card with a photo: "narrow" for carousels (photo on top), "wide" for lists (photo on the left). */
import { CONTENT_CATEGORIES, type Article } from '@healthx/shared';
import { router } from 'expo-router';
import { Clock, Headphones, Heart, Play } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Photo } from './Photo';
import { AppText } from './Text';
import { colors, palette, shadow } from '@/lib/theme';

export function ArticleCard({ article, bookmarked, wide }: { article: Article; bookmarked?: boolean; wide?: boolean }) {
  const cat = CONTENT_CATEGORIES.find((c) => c.key === article.category)?.label ?? article.category;
  const media = article.type === 'podcast' ? 'audio' : article.type === 'video' ? 'video' : null;
  const MediaI = media === 'audio' ? Headphones : Play;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Article: ${article.title}`}
      onPress={() => router.push({ pathname: '/learn/[id]', params: { id: article.id } })}
      style={({ pressed }) => [styles.card, wide ? styles.wide : styles.narrow, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
      <Photo photo={article.photo} radius={wide ? 18 : 18} style={wide ? styles.imgWide : styles.img}>
        {media ? (
          <View style={styles.media}>
            <MediaI size={12} color={palette.green[800]} fill={media === 'video' ? palette.green[800] : 'transparent'} />
          </View>
        ) : null}
      </Photo>
      <View style={styles.body}>
        <View style={styles.meta}>
          <AppText variant="overline" color={palette.green[700]} numberOfLines={1} style={{ flex: 1 }}>
            {cat}
          </AppText>
          {bookmarked ? <Heart size={14} color={palette.rose[500]} fill={palette.rose[500]} accessibilityLabel="In favorites" /> : null}
        </View>
        <AppText variant="h3" numberOfLines={wide ? 3 : 2} style={{ marginTop: 4, fontSize: 15, lineHeight: 20 }}>
          {article.title}
        </AppText>
        <View style={[styles.meta, { marginTop: 'auto', paddingTop: 8, justifyContent: 'flex-start', gap: 4 }]}>
          <Clock size={12} color={colors.textSubtle} />
          <AppText variant="caption" muted>
            {article.readMin} min {media ?? 'read'}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 8, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  narrow: { width: 232 },
  wide: { width: '100%', flexDirection: 'row', gap: 4 },
  img: { width: '100%', height: 132 },
  imgWide: { width: 108, height: 108 },
  media: { position: 'absolute', left: 8, bottom: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 8, flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
});
