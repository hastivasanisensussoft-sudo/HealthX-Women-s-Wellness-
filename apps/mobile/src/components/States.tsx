/** Offline banner + simulated remote loading with a retryable error state (mockup M37). */
import { TriangleAlert, WifiOff } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Button } from './Button';
import { Skeleton, StateArt } from './Feedback';
import { AppText } from './Text';
import { useOffline } from '@/lib/network';
import { colors, layout, onDark, palette } from '@/lib/theme';

export function OfflineBanner({ style }: { style?: ViewStyle }) {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <View style={[styles.banner, style]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <View style={styles.bannerIcon}>
        <WifiOff size={15} color={onDark.butter[300]} />
      </View>
      <AppText variant="small" color="#fff" style={{ flex: 1 }}>
        You’re offline. Your logs are saved and will sync when you’re back.
      </AppText>
    </View>
  );
}

export type LoadStatus = 'loading' | 'error' | 'ready';

/**
 * Simulates fetching remote content (library, community). While offline the
 * request "fails" so the error + Try again state can be seen; once loaded,
 * content stays cached even if the connection drops.
 */
export function useSimulatedLoad(ms = 550): { status: LoadStatus; retry: () => void } {
  const offline = useOffline();
  const offlineRef = useRef(offline);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; ok: boolean } | null>(null);

  useEffect(() => {
    offlineRef.current = offline;
  }, [offline]);

  useEffect(() => {
    const t = setTimeout(() => setResult({ attempt, ok: !offlineRef.current }), ms);
    return () => clearTimeout(t);
  }, [attempt, ms]);

  const status: LoadStatus = result && result.attempt === attempt ? (result.ok ? 'ready' : 'error') : 'loading';
  return { status, retry: () => setAttempt((a) => a + 1) };
}

export function LoadError({ onRetry, text = 'Check your connection and try again.' }: { onRetry: () => void; text?: string }) {
  return (
    <View style={styles.error}>
      <StateArt icon={TriangleAlert} tone="peach" size={92} />
      <AppText variant="h2" center style={{ fontSize: 18, marginTop: 4 }}>
        Couldn’t load content
      </AppText>
      <AppText variant="small" muted center style={{ maxWidth: 280 }}>
        {text}
      </AppText>
      <Button label="Try again" size="sm" onPress={onRetry} style={{ marginTop: 8 }} />
    </View>
  );
}

/** Skeleton rows shaped like library cards. */
export function CardSkeletons({ count = 3, height = 110 }: { count?: number; height?: number }) {
  return (
    <View style={{ gap: 10 }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.skRow, { height }]}>
          <Skeleton height={height - 20} width={Math.round((height - 20) * 0.9)} radius={16} />
          <View style={{ flex: 1, gap: 9 }}>
            <Skeleton height={10} width="35%" />
            <Skeleton height={15} width="85%" />
            <Skeleton height={15} width="60%" />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.green[900], borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  bannerIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  error: { alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: layout.cardRadius, borderWidth: 1, borderColor: palette.ink[100], padding: 22 },
  skRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: palette.ink[100], padding: 10 },
});
