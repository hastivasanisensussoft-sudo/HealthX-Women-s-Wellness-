import { router } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './Text';
import { brandText, colors, font, layout, palette } from '@/lib/theme';

interface ScreenProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** Show a back button (uses router.back, falls back to home). */
  back?: boolean;
  /** Show a ✕ close button instead of the back chevron (modal-style screens). */
  close?: boolean;
  right?: ReactNode;
  /** Large Outfit title inside the scroll content instead of a compact header. */
  largeTitle?: boolean;
  /** Small mono label above the title (additive). */
  eyebrow?: string;
  scroll?: boolean;
  padded?: boolean;
  /** Extra bottom space for screens inside the tab bar. */
  tabBarSpace?: boolean;
  background?: string;
  contentStyle?: ViewStyle;
  footer?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

/** Round header button (back disc, close disc) — 44 px target. */
export function HeaderButton({ kind = 'back', onPress, label }: { kind?: 'back' | 'close'; onPress?: () => void; label?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? (kind === 'close' ? 'Close' : 'Go back')}
      onPress={onPress ?? goBack}
      style={({ pressed }) => [styles.backBtn, pressed && { backgroundColor: palette.green[50], transform: [{ scale: 0.96 }] }]}
      hitSlop={8}>
      {kind === 'close' ? <X size={20} color={brandText} /> : <ChevronLeft size={22} color={brandText} />}
    </Pressable>
  );
}

export function Screen({
  children,
  title,
  subtitle,
  back,
  close,
  right,
  largeTitle,
  eyebrow,
  scroll = true,
  padded = true,
  tabBarSpace,
  background = colors.surface,
  contentStyle,
  footer,
  onRefresh,
  refreshing = false,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const header =
    title || back || close || right ? (
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerSide}>{back || close ? <HeaderButton kind={close ? 'close' : 'back'} /> : null}</View>
        {!largeTitle && title ? (
          <View style={styles.headerCenter}>
            {eyebrow ? (
              <AppText variant="overline" color={palette.green[700]} numberOfLines={1} center style={{ fontSize: 9.5, lineHeight: 12 }}>
                {eyebrow}
              </AppText>
            ) : null}
            <AppText numberOfLines={1} center style={styles.headerTitle} accessibilityRole="header">
              {title}
            </AppText>
          </View>
        ) : (
          <View style={styles.headerCenter} />
        )}
        <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
      </View>
    ) : (
      <View style={{ height: insets.top }} />
    );

  const big =
    largeTitle && title ? (
      <View style={styles.largeTitle}>
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
    ) : null;

  const pad = padded ? { paddingHorizontal: layout.screenPadding } : null;
  const bottom = (tabBarSpace ? layout.tabBarHeight + 24 : 32) + insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[pad, { paddingBottom: bottom }, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.green[600]} /> : undefined}>
          {big}
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad, contentStyle]}>
          {big}
          {children}
        </View>
      )}
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10 },
  headerSide: { minWidth: 76, flexDirection: 'row', alignItems: 'center' },
  headerRight: { justifyContent: 'flex-end' },
  headerCenter: { flex: 1, flexShrink: 1, alignItems: 'center', paddingHorizontal: 6 },
  headerTitle: { fontFamily: font.display, fontSize: 18, lineHeight: 24, letterSpacing: -0.2, color: colors.text },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.ink[200],
    shadowColor: '#0D4336',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  largeTitle: { paddingTop: 4, paddingBottom: 18 },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: palette.ink[100],
    shadowColor: '#0D4336',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
});
