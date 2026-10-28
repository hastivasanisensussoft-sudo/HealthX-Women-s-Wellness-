/**
 * A rounded picture card that pages sideways, one picture at a time, with page dots below (tap a dot
 * to jump). Used for the Home hero and the Workouts header. Pictures come from lib/pictures.
 */
import { Image, type ImageContentPosition } from 'expo-image';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ImageSourcePropType, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance, type StyleProp, type ViewStyle } from 'react-native';

import { palette, shadow } from '@/lib/theme';

export type Slide = {
  key: string;
  source: ImageSourcePropType;
  /** Keeps the picture's subject in the frame when it's cropped to the card. */
  position: ImageContentPosition;
  /** What the picture shows, for screen readers. */
  alt: string;
};

export function PictureSlider({ slides, width, height, label, style }: { slides: Slide[]; width: number; height: number; label: string; style?: StyleProp<ViewStyle> }) {
  const pager = useRef<ScrollViewInstance>(null);
  const [slide, setSlide] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(slides.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / width)));
    if (i !== slide) setSlide(i);
  };

  return (
    <View style={style}>
      <View style={[styles.card, { width, height }]}>
        <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} accessibilityLabel={label}>
          {slides.map((s, i) => (
            <View key={s.key} accessible accessibilityRole="image" accessibilityLabel={`Picture ${i + 1} of ${slides.length}: ${s.alt}`} style={{ width, height }}>
              <Image source={s.source as never} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={s.position} transition={250} accessible={false} />
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={styles.dots}>
        {slides.map((s, i) => (
          <Pressable
            key={s.key}
            accessibilityRole="button"
            accessibilityLabel={`Show picture ${i + 1} of ${slides.length}`}
            aria-selected={i === slide}
            hitSlop={8}
            onPress={() => pager.current?.scrollTo({ x: i * width, animated: true })}
            style={[styles.dot, i === slide && styles.dotOn]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 28, overflow: 'hidden', backgroundColor: palette.green[50], ...shadow.card },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.green[200] },
  dotOn: { width: 20, backgroundColor: palette.green[700] },
});
