import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './Text';
import { colors, palette } from '@/lib/theme';

/** Bottom sheet built on RN Modal (works in Expo Go and on web): grab handle, Outfit title, mono eyebrow, round close. */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  eyebrow,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Small mono label above the title (additive). */
  eyebrow?: string;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
            <View style={styles.handle} />
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                {eyebrow ? (
                  <AppText variant="overline" color={palette.green[700]} style={{ marginBottom: 3 }}>
                    {eyebrow}
                  </AppText>
                ) : null}
                <AppText variant="title" accessibilityRole="header">
                  {title}
                </AppText>
                {subtitle ? (
                  <AppText variant="small" muted style={{ marginTop: 3 }}>
                    {subtitle}
                  </AppText>
                ) : null}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={({ pressed }) => [styles.close, pressed && { backgroundColor: palette.ink[200] }]} hitSlop={8}>
                <X size={18} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: Math.max(320, Math.min(620, height * 0.68)) }} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,45,36,0.48)', justifyContent: 'flex-end' },
  kav: { width: '100%', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 640,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: '#082D24',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: palette.ink[200], marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.ink[100], alignItems: 'center', justifyContent: 'center' },
  footer: { paddingTop: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: palette.ink[100] },
});
