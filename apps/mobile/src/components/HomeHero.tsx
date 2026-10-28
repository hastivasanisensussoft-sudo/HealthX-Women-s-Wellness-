/**
 * Home hero: the date, a handwritten brand line and greeting with round header buttons and the
 * profile picture, then a picture slider (lib/pictures) with page dots. The header sits above the
 * pictures, not on them, so a picture's own lettering never collides with it. The Home shortcuts
 * follow below.
 */
import type { PhotoKey } from '@healthx/shared';
import { router } from 'expo-router';
import { Bell, CalendarDays, MessageCircle } from 'lucide-react-native';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UnreadDot } from './Badges';
import { IconButton } from './Button';
import { Photo } from './Photo';
import { PictureSlider, type Slide } from './PictureSlider';
import { AppText } from './Text';
import { PICTURES } from '@/lib/pictures';
import { brandText, colors, font, isDark, palette } from '@/lib/theme';

/** Header button size: four fit beside the brand at phone width. */
const BTN = 38;
/** Slider height as a share of its width: better-days.jpg's own ratio (1200 × 991), so it shows whole. */
const CARD_RATIO = 991 / 1200;

/** Slides in order. `position` keeps each picture's subject in the frame. */
const SLIDES: Slide[] = [
  // All of better-days.jpg (the card has its ratio), "Better Days Ahead" lettering included.
  { key: 'better-days', source: PICTURES.betterDays, position: 'top', alt: 'A woman in a cream sweater, eyes closed and smiling in the sun. Better days ahead.' },
  // A tall picture: 30% down keeps her face and stretched arms in the frame.
  { key: 'morning-stretch', source: PICTURES.morningStretch, position: { top: '30%', left: '50%' }, alt: 'A smiling woman in pink pyjamas stretching in bed after waking up.' },
];

export function HomeHero({
  date,
  greeting,
  unread,
  name,
  photoUri,
  avatar,
}: {
  date: string;
  greeting: string;
  unread: number;
  name: string;
  /** A profile photo kept on this phone (lib/profilePhoto), shown before the account's avatar. */
  photoUri?: string | null;
  avatar?: PhotoKey;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = width - 32;
  const cardHeight = Math.round(cardWidth * CARD_RATIO);

  return (
    <View>
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <View style={{ flex: 1 }}>
          <AppText variant="overline" color={brandText} style={{ opacity: 0.75 }}>
            {date}
          </AppText>
          <AppText accessibilityRole="header" style={[styles.brand, { color: brandText }]}>
            HealthX
          </AppText>
          <View style={styles.greetBox}>
            <AppText style={[styles.greet, { color: isDark ? '#F6A3BE' : '#C94877' }]}>{greeting}</AppText>
          </View>
        </View>
        <View style={styles.actions}>
          <IconButton icon={CalendarDays} label="Calendar" size={BTN} onPress={() => router.push('/calendar')} />
          <IconButton icon={MessageCircle} label="AI coach" size={BTN} onPress={() => router.push('/coach')} />
          <IconButton icon={Bell} label={`Notifications, ${unread} unread`} size={BTN} onPress={() => router.push('/notifications')} badge={<UnreadDot count={unread} />} />
          <Pressable accessibilityRole="button" accessibilityLabel="Open profile" hitSlop={6} onPress={() => router.push('/profile')} style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.85 }]}>
            {photoUri || avatar ? (
              <Photo source={photoUri ? { uri: photoUri } : undefined} photo={photoUri ? undefined : avatar} shape="circle" position="top" style={StyleSheet.absoluteFill} />
            ) : (
              <AppText style={styles.initial}>{(name || '?').charAt(0).toUpperCase()}</AppText>
            )}
          </Pressable>
        </View>
      </View>

      <PictureSlider slides={SLIDES} width={cardWidth} height={cardHeight} label="Pictures, swipe for more" style={{ marginHorizontal: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, gap: 8, paddingBottom: 14 },
  brand: { fontFamily: font.handBold, fontSize: 48, lineHeight: 54, marginTop: 2 },
  // A fixed-width box keeps Android from clipping the rotated, wrapped handwriting.
  greetBox: { width: 230, marginTop: -6 },
  greet: { fontFamily: font.hand, fontSize: 25, lineHeight: 29, transform: [{ rotate: '-3deg' }] },
  actions: { flexDirection: 'row', gap: 6 },
  avatar: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.peach[100],
    borderWidth: 2,
    borderColor: colors.surface,
  },
  initial: { fontFamily: font.displayBold, fontSize: 16, color: palette.peach[700] },
});
