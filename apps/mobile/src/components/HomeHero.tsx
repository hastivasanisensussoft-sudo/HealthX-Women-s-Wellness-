/**
 * Home hero (Eva-style reference): the date, a handwritten brand line and greeting with round header
 * buttons, then a picture card (lib/pictures) whose bottom edge the glance cards overlap (children).
 * The header sits above the picture, not on it, so the picture's own lettering never collides with it.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, CalendarDays, MessageCircle } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UnreadDot } from './Badges';
import { IconButton } from './Button';
import { AppText } from './Text';
import { PICTURES } from '@/lib/pictures';
import { brandText, colors, font, isDark, palette, shadow } from '@/lib/theme';

/** How far the glance cards rise into the picture card. */
export const HERO_OVERLAP = 64;
/** better-days.jpg is 1200 × 991 (landscape). */
const PIC_RATIO = 991 / 1200;

export function HomeHero({ date, greeting, unread, children }: { date: string; greeting: string; unread: number; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = width - 32;
  // The whole picture, uncropped, so its "Better Days Ahead" lettering on the right edge stays in view;
  // the glance cards cover only the sweater and jeans at the bottom.
  const cardHeight = Math.round(cardWidth * PIC_RATIO);

  return (
    <View>
      <LinearGradient pointerEvents="none" colors={[palette.rose[50], colors.surface]} style={[styles.wash, { height: insets.top + 240 }]} />
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
          <IconButton icon={CalendarDays} label="Calendar" onPress={() => router.push('/calendar')} />
          <IconButton icon={MessageCircle} label="AI coach" onPress={() => router.push('/coach')} />
          <IconButton icon={Bell} label={`Notifications, ${unread} unread`} onPress={() => router.push('/notifications')} badge={<UnreadDot count={unread} />} />
        </View>
      </View>

      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel="Picture: a woman in a cream sweater, eyes closed and smiling in the sun. Better days ahead."
        style={[styles.card, { height: cardHeight }]}>
        <Image source={PICTURES.betterDays} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} accessible={false} />
      </View>

      <View style={{ marginTop: -HERO_OVERLAP }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wash: { position: 'absolute', top: 0, left: 0, right: 0 },
  top: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, gap: 10, paddingBottom: 14 },
  brand: { fontFamily: font.handBold, fontSize: 48, lineHeight: 54, marginTop: 2 },
  // A fixed-width box keeps Android from clipping the rotated, wrapped handwriting.
  greetBox: { width: 230, marginTop: -6 },
  greet: { fontFamily: font.hand, fontSize: 25, lineHeight: 29, transform: [{ rotate: '-3deg' }] },
  actions: { flexDirection: 'row', gap: 8 },
  card: { marginHorizontal: 16, borderRadius: 28, overflow: 'hidden', backgroundColor: palette.green[50], ...shadow.card },
});
