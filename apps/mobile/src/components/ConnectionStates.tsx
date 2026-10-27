/** Full-screen "can't reach the server" state and the offline-demo banner (API integration). */
import { CloudOff, RotateCw, WifiOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Leaf, LogoMark, Sparkle } from './Art';
import { Button } from './Button';
import { AppText } from './Text';
import { API_URL } from '@/lib/api';
import { colors, font, onDark, palette, shadow } from '@/lib/theme';

export function ServerUnreachable({ onRetry, onOfflineDemo }: { onRetry: () => Promise<void>; onOfflineDemo: () => Promise<void> }) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  return (
    <View style={[styles.root, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]} accessibilityRole="alert">
      <View style={styles.art}>
        <View style={styles.artWash} />
        <Leaf size={70} color={palette.green[200]} rotate={-24} style={{ left: 0, top: 8 }} />
        <Leaf size={54} color={palette.rose[200]} rotate={70} style={{ right: 4, bottom: 10 }} />
        <Sparkle size={18} style={{ right: 18, top: 14 }} />
        <View style={styles.icon}>
          <CloudOff size={34} color={palette.green[700]} />
        </View>
      </View>
      <AppText variant="overline" color={palette.green[700]} style={{ marginTop: 18 }}>
        Connection
      </AppText>
      <AppText variant="title" center style={{ marginTop: 6 }}>
        Can’t reach the HealthX server
      </AppText>
      <AppText variant="body" muted center style={{ marginTop: 8, maxWidth: 340 }}>
        Check your connection and try again. Your account data lives on the server, so the app needs it to sign you in.
      </AppText>
      <View style={styles.server}>
        <AppText variant="caption" color={palette.ink[700]} style={{ fontFamily: font.mono }}>
          Server: {API_URL}
        </AppText>
      </View>
      <Button
        label="Try again"
        icon={RotateCw}
        full
        size="lg"
        loading={busy}
        style={{ marginTop: 26, maxWidth: 360, width: '100%' }}
        onPress={async () => {
          setBusy(true);
          await onRetry();
          setBusy(false);
        }}
      />
      <Button label="Use offline demo" variant="secondary" full size="lg" style={{ marginTop: 10, maxWidth: 360, width: '100%' }} onPress={onOfflineDemo} />
      <AppText variant="caption" muted center style={{ marginTop: 14, maxWidth: 340 }}>
        The offline demo uses sample data stored only on this device. Nothing is sent to a server.
      </AppText>
    </View>
  );
}

/** Covers the screen while the session and account data load, so empty data never flashes. */
export function BootCover() {
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={[StyleSheet.absoluteFill, styles.cover]} accessibilityRole="progressbar" accessibilityLabel="Connecting to HealthX">
      <Animated.View style={[styles.coverMark, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) }] }]}>
        <LogoMark size={44} />
      </Animated.View>
      <ActivityIndicator color={palette.green[700]} style={{ marginTop: 18 }} />
      <AppText variant="small" muted style={{ marginTop: 10 }}>
        Connecting to HealthX…
      </AppText>
    </View>
  );
}

export function OfflineDemoBanner({ onConnect }: { onConnect: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.banner, { paddingTop: insets.top + 6 }]} accessibilityRole="summary">
      <WifiOff size={14} color={onDark.green[200]} />
      <AppText variant="caption" color="#fff" style={{ flex: 1 }}>
        Offline demo — data stays on this device; nothing is sent to a server.
      </AppText>
      <Pressable accessibilityRole="button" onPress={onConnect} hitSlop={8} style={styles.connect}>
        <AppText variant="caption" color={colors.text} style={{ fontFamily: font.bold }}>
          Connect
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', paddingHorizontal: 24, backgroundColor: colors.surface },
  art: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  artWash: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: palette.green[50] },
  icon: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  server: { marginTop: 12, backgroundColor: palette.ink[50], borderWidth: 1, borderColor: palette.ink[100], borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  cover: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  coverMark: { width: 88, height: 88, borderRadius: 28, backgroundColor: palette.green[50], alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 7, backgroundColor: palette.green[950] },
  connect: { backgroundColor: palette.butter[300], borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4 },
});
