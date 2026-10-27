/**
 * Shared building blocks for the redesigned wellness, insight, library and account screens
 * (Evergreen system): page intros with mono eyebrows, forest / photo hero panels, leaves,
 * glass stats, tinted icon discs, menu cards and horizontal carousels.
 */
import type { PhotoKey } from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ProgressRing } from './Charts';
import { Photo } from './Photo';
import { AppText } from './Text';
import { TILE_TONES, type TileTone } from './Tiles';
import { colors, font, palette, shadow } from '@/lib/theme';

export type Tone = TileTone;

/** Text and icon colours on forest / night heroes and photo gradients (fixed, so they stay light in dark mode). */
export const ON_DARK = { text: 'rgba(255,255,255,0.86)', soft: 'rgba(255,255,255,0.7)' } as const;

/** Page header inside the scroll content: mono eyebrow, display title, optional subtitle and right slot. */
export function PageIntro({ eyebrow, title, subtitle, right, style }: { eyebrow?: string; title: string; subtitle?: string; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.intro, style]}>
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <AppText variant="overline" color={palette.green[700]} style={{ marginBottom: 4 }}>
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="display" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="body" muted style={{ marginTop: 4 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={{ marginTop: 2 }}>{right}</View> : null}
    </View>
  );
}

/** Leaf shape (same geometry as the web brand leaf). */
export function Leaf({ size = 60, color = palette.rose[200], rotate = 0, vein = true, style }: { size?: number; color?: string; rotate?: number; vein?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ width: size, height: size, transform: [{ rotate: `${rotate}deg` }] }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M8 92 C8 40 40 8 92 8 C92 60 60 92 8 92 Z" fill={color} />
        {vein ? <Path d="M14 86 C34 66 56 44 84 16" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round" fill="none" /> : null}
      </Svg>
    </View>
  );
}

/** Pink + white leaf pair behind arch portraits (Mira reference). Position it absolutely. */
export function LeafPair({ size = 120, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Leaf size={size * 0.62} color={palette.rose[200]} rotate={-8} style={{ position: 'absolute', left: 0, top: 0 }} />
      <Leaf size={size * 0.5} color={colors.surface} rotate={96} style={{ position: 'absolute', right: 0, top: size * 0.04 }} />
    </View>
  );
}

const PANEL: Record<'forest' | 'night' | 'sky' | 'peach', [string, string]> = {
  forest: [palette.green[800], palette.green[950]],
  night: [palette.indigo[600], '#232861'],
  sky: [palette.sky[500], palette.sky[700]],
  peach: [palette.peach[500], palette.peach[700]],
};

/** Deep hero panel (forest by default) with soft decorative leaves. White text only. */
export function HeroPanel({ children, tone = 'forest', style, onPress, accessibilityLabel, leaves = true }: { children: ReactNode; tone?: keyof typeof PANEL; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string; leaves?: boolean }) {
  const body = (
    <>
      <LinearGradient colors={PANEL[tone]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {leaves ? (
        <>
          <Leaf size={130} color="rgba(147,207,184,0.16)" vein={false} rotate={12} style={{ position: 'absolute', top: -34, right: -26 }} />
          <Leaf size={80} color="rgba(255,255,255,0.07)" vein={false} rotate={190} style={{ position: 'absolute', bottom: -22, left: -16 }} />
        </>
      ) : null}
      {children}
    </>
  );
  if (!onPress) return <View style={[styles.hero, style]}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [styles.hero, style, pressed && { opacity: 0.95 }]}>
      {body}
    </Pressable>
  );
}

/** Photo hero with a dark gradient so text on top stays readable. */
export function PhotoPanel({
  photo,
  source,
  height = 200,
  children,
  style,
  position,
  alt,
  radius = 28,
  onPress,
  accessibilityLabel,
}: {
  photo?: PhotoKey;
  source?: ImageSourcePropType;
  height?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  position?: 'top' | 'center' | 'bottom';
  alt?: string;
  radius?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const body = (
    <Photo photo={photo} source={source} radius={radius} position={position} alt={onPress ? undefined : alt} style={[{ height }, shadow.card, style]}>
      <LinearGradient colors={['rgba(8,45,36,0.05)', 'rgba(8,45,36,0.25)', 'rgba(8,45,36,0.86)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.photoBody}>{children}</View>
    </Photo>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] }]}>
      {body}
    </Pressable>
  );
}

/** Frosted stat on a dark hero or photo. */
export function GlassStat({ label, value, icon, style }: { label: string; value: string; icon?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.glass, style]}>
      {icon}
      <AppText variant="overline" color="rgba(255,255,255,0.75)" style={{ fontSize: 9.5, marginTop: icon ? 6 : 0 }} numberOfLines={1}>
        {label}
      </AppText>
      <AppText style={styles.glassValue} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

/** Tinted round icon disc. */
export function TintIcon({ icon: Icon, tone = 'green', size = 42, solid }: { icon: LucideIcon; tone?: Tone; size?: number; solid?: boolean }) {
  const t = TILE_TONES[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: solid ? colors.surface : t.bg, borderWidth: solid ? 0 : 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={Math.round(size * 0.46)} color={t.icon} />
    </View>
  );
}

/** Section header with an optional badge next to the eyebrow (e.g. a PhaseBadge). */
export function GroupHeader({ eyebrow, title, badge, action, onAction, style }: { eyebrow?: string; title: string; badge?: ReactNode; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.group, style]}>
      <View style={{ flexShrink: 1 }}>
        {eyebrow || badge ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            {eyebrow ? (
              <AppText variant="overline" color={palette.green[700]}>
                {eyebrow}
              </AppText>
            ) : null}
            {badge}
          </View>
        ) : null}
        <AppText variant="h2">{title}</AppText>
      </View>
      {action ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${title}: ${action}`} onPress={onAction} hitSlop={8} style={styles.groupAction}>
          <AppText variant="smallMedium" color={palette.green[700]}>
            {action}
          </AppText>
          <ChevronRight size={14} color={palette.green[700]} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Horizontal carousel that bleeds to the screen edges. */
export function HScroll({ children, gap = 12, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ marginHorizontal: -20 }, style]} contentContainerStyle={{ gap, paddingHorizontal: 20, paddingVertical: 6 }}>
      {children}
    </ScrollView>
  );
}

/** White card that groups menu rows. */
export function MenuCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.menu, style]}>{children}</View>;
}

export function MenuRow({
  icon,
  tone = 'green',
  title,
  subtitle,
  right,
  onPress,
  last,
  danger,
  accessibilityLabel,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  danger?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && onPress && { backgroundColor: palette.green[50] }]}>
      <TintIcon icon={icon} tone={danger ? 'rose' : tone} size={40} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyMedium" color={danger ? colors.danger : undefined}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" muted numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {onPress ? <ChevronRight size={18} color={colors.textSubtle} /> : null}
    </Pressable>
  );
}

/** Compact ring stat (value ring + label), e.g. "today at a glance". */
export function RingStat({ value, color, track, icon: Icon, label, text, onPress, size = 62 }: { value: number; color: string; track: string; icon: LucideIcon; label: string; text: string; onPress?: () => void; size?: number }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${label}: ${text}`} onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.ringStat, pressed && { opacity: 0.85 }]}>
      <ProgressRing value={value} size={size} stroke={7} color={color} track={track}>
        <Icon size={18} color={color} />
      </ProgressRing>
      <AppText variant="smallMedium" numberOfLines={1} style={{ marginTop: 6 }}>
        {text}
      </AppText>
      <AppText variant="overline" color={colors.textSubtle} style={{ fontSize: 9.5 }} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** White stat tile with a tinted icon, a mono label and a display value. */
export function StatCardB({ icon, tone = 'green', label, value, sub, style, onPress, compact }: { icon: LucideIcon; tone?: Tone; label: string; value: string; sub?: string; style?: StyleProp<ViewStyle>; onPress?: () => void; compact?: boolean }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${label}: ${value}`} onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.stat, compact && { padding: 12 }, style, pressed && { opacity: 0.88 }]}>
      <TintIcon icon={icon} tone={tone} size={34} />
      <AppText variant="overline" color={colors.textSubtle} style={{ marginTop: 10, fontSize: 9.5 }} numberOfLines={1}>
        {label}
      </AppText>
      <AppText style={[styles.statValue, compact && { fontSize: 16, lineHeight: 21 }]} numberOfLines={1}>
        {value}
      </AppText>
      {sub ? (
        <AppText variant="caption" muted numberOfLines={1}>
          {sub}
        </AppText>
      ) : null}
    </Pressable>
  );
}

/** Small mono tag on photos / dark panels. */
export function GlassTag({ label, icon, dark }: { label: string; icon?: ReactNode; dark?: boolean }) {
  return (
    <View style={[styles.tag, dark && { backgroundColor: 'rgba(8,45,36,0.45)' }]}>
      {icon}
      <AppText variant="caption" color={dark ? '#fff' : palette.green[900]} style={{ fontFamily: font.semibold }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 10, marginBottom: 16 },
  hero: { borderRadius: 30, padding: 20, overflow: 'hidden', ...shadow.lift },
  photoBody: { flex: 1, justifyContent: 'flex-end', padding: 18 },
  glass: { flex: 1, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  glassValue: { fontFamily: font.display, fontSize: 18, lineHeight: 23, color: '#fff', marginTop: 1 },
  group: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 28, marginBottom: 12, gap: 12 },
  groupAction: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  menu: { backgroundColor: colors.surface, borderRadius: 24, paddingHorizontal: 14, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, minHeight: 60 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  ringStat: { flex: 1, alignItems: 'center', minWidth: 0 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  statValue: { fontFamily: font.display, fontSize: 20, lineHeight: 25, color: colors.text },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
});
