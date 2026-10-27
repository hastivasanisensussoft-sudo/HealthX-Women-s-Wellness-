import { Check, Info, TriangleAlert } from 'lucide-react-native';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, isDark, palette, shadow } from './theme';

type Tone = 'success' | 'info' | 'error';
interface ToastMsg {
  id: number;
  text: string;
  tone: Tone;
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const [anim] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback(
    (text: string, tone: Tone = 'success') => {
      if (timer.current) clearTimeout(timer.current);
      setMsg({ id: Date.now(), text, tone });
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMsg(null));
      }, 2600);
    },
    [anim],
  );

  const Icon = msg?.tone === 'error' ? TriangleAlert : msg?.tone === 'info' ? Info : Check;
  // Fixed deep tones so the white text stays readable in dark mode (where ink 800 is a light text shade).
  const bg = msg?.tone === 'error' ? colors.danger : msg?.tone === 'info' ? (isDark ? '#33413C' : palette.ink[800]) : palette.green[800];

  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.wrap,
            {
              bottom: insets.bottom + 96,
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}>
          <View style={[styles.toast, { backgroundColor: bg }]}>
            <View style={styles.iconBubble}>
              <Icon size={16} color="#fff" />
            </View>
            <Text style={styles.text}>{msg.text}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    maxWidth: 480,
    ...shadow.lift,
  },
  iconBubble: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontFamily: font.semibold, fontSize: 14, flexShrink: 1 },
});
