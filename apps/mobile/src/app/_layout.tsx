import { Caveat_600SemiBold } from '@expo-google-fonts/caveat/600SemiBold';
import { Caveat_700Bold } from '@expo-google-fonts/caveat/700Bold';
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono/400Regular';
import { DMMono_500Medium } from '@expo-google-fonts/dm-mono/500Medium';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { DMSans_800ExtraBold } from '@expo-google-fonts/dm-sans/800ExtraBold';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display/400Regular';
import { Outfit_500Medium } from '@expo-google-fonts/outfit/500Medium';
import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold';
import { Outfit_700Bold } from '@expo-google-fonts/outfit/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider } from '@/lib/store';
import { colors, isDark } from '@/lib/theme';
import { ToastProvider } from '@/lib/toast';
import { installHorizontalWheel } from '@/lib/webWheel';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
    Caveat_600SemiBold,
    Caveat_700Bold,
    DMSerifDisplay_400Regular,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded, error]);

  // web: mouse wheel scrolls horizontal lists (no-op on iOS/Android)
  useEffect(() => installHorizontalWheel(), []);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <StoreProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface }, animation: 'slide_from_right' }}>
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
            <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="log-period" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' } }} />
            <Stack.Screen name="check-in" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="symptom-new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="workout/session/[id]" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="video/[key]" options={{ animation: 'fade', contentStyle: { backgroundColor: '#082D24' } }} />
          </Stack>
        </StoreProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
