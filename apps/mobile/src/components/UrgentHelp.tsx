/**
 * "Get urgent help" (SRS §23, §34): warning signs and a call button for the local emergency number.
 * It only directs to care — nothing here (and nothing the AI coach says) interprets symptoms. The sign
 * lists stand in for the D-11 trigger list until the Medical Content Reviewer approves it.
 */
import { URGENT_SIGNS, emergencyNumberFor } from '@healthx/shared';
import { OctagonAlert, Phone } from 'lucide-react-native';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Sheet } from './Sheet';
import { AppText } from './Text';
import { colors, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

/** The device locale ("en-IN"); the region picks the emergency number. */
const deviceLocale = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return null;
  }
};

export function UrgentHelpSheet({ visible, onClose, context = 'general' }: { visible: boolean; onClose: () => void; context?: 'pregnancy' | 'general' }) {
  const toast = useToast();
  const { number } = emergencyNumberFor(deviceLocale());
  const call = async () => {
    const url = `tel:${number}`;
    try {
      if (Platform.OS !== 'web' && !(await Linking.canOpenURL(url))) throw new Error('no dialer');
      await Linking.openURL(url);
    } catch {
      toast(`Call ${number} or your local emergency number from your phone.`, 'error');
    }
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      eyebrow="Urgent help"
      title={context === 'pregnancy' ? 'When to get care right away' : 'Get medical help now'}
      subtitle={
        context === 'pregnancy'
          ? 'If you notice any of these, contact your maternity unit or care provider straight away, or call emergency services.'
          : 'If you notice any of these, call emergency services or go to the nearest emergency department.'
      }
      footer={
        <View style={{ gap: 8 }}>
          <Button label={`Call ${number}`} icon={Phone} variant="danger" full onPress={call} />
          <Button label="Not now" variant="ghost" full onPress={onClose} />
        </View>
      }>
      <View style={{ gap: 8 }}>
        {URGENT_SIGNS[context].map((s) => (
          <View key={s} style={styles.row}>
            <OctagonAlert size={15} color={colors.danger} style={{ marginTop: 2 }} />
            <AppText variant="small" style={{ flex: 1 }}>
              {s}
            </AppText>
          </View>
        ))}
        <AppText variant="caption" muted style={{ marginTop: 6 }}>
          {number} is the emergency number for your phone’s region — use your local number if it’s different. If you’re thinking about harming yourself, you can also contact a local crisis line. HealthX can’t assess emergencies.
        </AppText>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: palette.ink[100] },
});
