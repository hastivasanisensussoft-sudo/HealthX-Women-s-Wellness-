/** Animated splash → routes to welcome, onboarding or the app depending on demo auth state. */
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Leaf, LeafPair, LogoMark, Sparkle } from '@/components/Art';
import { AppText } from '@/components/Text';
import { useStore } from '@/lib/store';
import { colors, font, onDark, palette } from '@/lib/theme';

export default function Splash() {
  const { state, ready } = useStore();
  const insets = useSafeAreaInsets();
  const [scale] = useState(() => new Animated.Value(0.7));
  const [fade] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    ).start();
  }, [fade, pulse, scale]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      if (!state.auth.signedIn) router.replace('/welcome');
      else if (!state.auth.onboarded) router.replace('/onboarding');
      else router.replace('/home');
    }, 1500);
    return () => clearTimeout(t);
    // Route once, after the persisted state has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={[palette.green[600], palette.green[800], palette.green[950]]} locations={[0, 0.55, 1]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <Leaf size={260} color={palette.green[300]} rotate={-30} style={{ left: -110, top: 60, opacity: 0.12 }} />
      <Leaf size={220} color={palette.green[300]} rotate={150} style={{ right: -100, bottom: 80, opacity: 0.1 }} />
      <Animated.View style={{ alignItems: 'center', opacity: fade, transform: [{ scale }] }}>
        <View style={styles.markWrap}>
          <LeafPair size={62} style={{ top: -36, left: -8 }} />
          <Animated.View
            style={[
              styles.ripple,
              { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] },
            ]}
          />
          <View style={styles.mark}>
            <LogoMark size={62} color={palette.green[700]} leaf={palette.green[400]} />
          </View>
          <Sparkle size={16} color={onDark.butter[300]} style={{ right: -22, bottom: 6 }} />
        </View>
        <AppText style={styles.name}>HealthX</AppText>
        <AppText variant="overline" color={onDark.green[200]} style={{ marginTop: 4, letterSpacing: 3 }}>
          Women’s Wellness
        </AppText>
      </Animated.View>
      <View style={[styles.tagline, { bottom: insets.bottom + 40 }]}>
        <View style={styles.rule} />
        <AppText variant="small" color={onDark.green[100]}>
          Your wellness, understood.
        </AppText>
        <View style={styles.rule} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.green[800], alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  markWrap: { width: 124, height: 124, alignItems: 'center', justifyContent: 'center' },
  ripple: { position: 'absolute', width: 124, height: 124, borderRadius: 38, backgroundColor: palette.green[300] },
  mark: { width: 112, height: 112, borderRadius: 36, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#082D24', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  name: { fontFamily: font.displayBold, fontSize: 40, lineHeight: 46, letterSpacing: -1, color: '#fff', marginTop: 26 },
  tagline: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 10 },
  rule: { width: 24, height: 1, backgroundColor: palette.green[300], opacity: 0.6 },
});
