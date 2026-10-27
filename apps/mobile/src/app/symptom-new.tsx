/** Create a custom symptom (SRS §15, mockup M16): live preview, name, category, default severity, icon. */
import { CUSTOM_SYMPTOM_ICONS, SEVERITIES, SYMPTOM_CATEGORIES, type Severity, type SymptomCategory } from '@healthx/shared';
import { Check, PencilLine } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Leaf, Sparkle } from '@/components/Art';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip, Segmented, TextField } from '@/components/Inputs';
import { Screen, goBack } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { KeyIcon } from '@/lib/icons';
import { useStore } from '@/lib/store';
import { colors, font, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const SEV_TONE: Record<Severity, 'green' | 'peach' | 'rose'> = { mild: 'green', moderate: 'peach', severe: 'rose' };

export default function NewCustomSymptom() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SymptomCategory>('physical');
  const [severity, setSeverity] = useState<Severity>('moderate');
  const [icon, setIcon] = useState(CUSTOM_SYMPTOM_ICONS[0]);
  const [error, setError] = useState<string | null>(null);

  const label = name.trim();
  const sevLabel = SEVERITIES.find((s) => s.key === severity)?.label ?? severity;
  const catLabel = SYMPTOM_CATEGORIES.find((c) => c.key === category)?.label ?? category;

  const create = () => {
    if (label.length < 2) return setError('Use at least 2 characters.');
    if (label.length > 40) return setError('Keep it under 40 characters.');
    if (state.symptomDefs.some((s) => s.label.toLowerCase() === label.toLowerCase())) return setError('You already have a symptom with this name.');
    dispatch({ type: 'ADD_CUSTOM_SYMPTOM', label, category, icon, defaultSeverity: severity });
    toast(`“${label}” added to your symptoms`);
    goBack();
  };

  return (
    <Screen
      close
      title="New custom symptom"
      eyebrow="Symptoms"
      footer={
        <View>
          <Button label="Create symptom" size="lg" full onPress={create} />
          <AppText variant="caption" color={palette.green[700]} center style={{ marginTop: 8 }}>
            It will appear in your symptom list from now on.
          </AppText>
        </View>
      }>
      {/* Live preview */}
      <View style={styles.preview}>
        <Leaf size={90} color={palette.rose[100]} rotate={20} style={{ right: -20, top: -24 }} />
        <Sparkle size={14} color={palette.butter[400]} style={{ right: 70, top: 18 }} />
        <AppText variant="overline" color={palette.rose[700]}>
          Preview
        </AppText>
        <View style={styles.previewChip}>
          <View style={styles.previewIcon}>
            <KeyIcon name={icon} size={15} color={palette.rose[600]} />
          </View>
          <AppText variant="smallMedium" color={palette.rose[700]} style={{ fontFamily: font.semibold, flexShrink: 1 }} numberOfLines={1}>
            {label || 'Your symptom'} · {sevLabel}
          </AppText>
          <View style={styles.previewCheck}>
            <Check size={10} color="#fff" strokeWidth={3} />
          </View>
        </View>
        <AppText variant="caption" color={palette.ink[600]} style={{ marginTop: 10 }}>
          In {catLabel} · logged as this strength unless you change it
        </AppText>
      </View>

      <TextField
        label="Symptom name"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(null);
        }}
        placeholder="e.g. Migraine"
        maxLength={40}
        error={error}
        hint={`${name.length}/40`}
        autoCapitalize="sentences"
        icon={<PencilLine size={18} color={palette.ink[400]} />}
        style={{ marginTop: 18 }}
      />

      <Card style={{ marginTop: 16, gap: 12 }}>
        <AppText style={styles.blockTitle}>Category</AppText>
        <View style={styles.wrap}>
          {SYMPTOM_CATEGORIES.map((c) => (
            <Chip key={c.key} label={c.label} selected={category === c.key} onPress={() => setCategory(c.key)} />
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: 12, gap: 12 }}>
        <AppText style={styles.blockTitle}>Default severity</AppText>
        <Segmented tone={SEV_TONE[severity]} value={severity} onChange={setSeverity} options={SEVERITIES.map((s) => ({ key: s.key, label: s.label }))} />
      </Card>

      <Card style={{ marginTop: 12, gap: 12 }}>
        <AppText style={styles.blockTitle}>Icon</AppText>
        <View style={styles.icons} accessibilityRole="radiogroup">
          {CUSTOM_SYMPTOM_ICONS.map((k) => {
            const on = icon === k;
            return (
              <Pressable key={k} accessibilityRole="radio" aria-selected={on} accessibilityLabel={`Icon ${k}`} onPress={() => setIcon(k)} style={({ pressed }) => [styles.icon, on && styles.iconOn, pressed && { transform: [{ scale: 0.95 }] }]}>
                <KeyIcon name={k} size={20} color={on ? '#fff' : palette.green[700]} />
              </Pressable>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { borderRadius: 26, padding: 16, overflow: 'hidden', backgroundColor: palette.rose[50], borderWidth: 1, borderColor: palette.rose[100] },
  previewChip: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 10, backgroundColor: palette.rose[100], borderWidth: 1.5, borderColor: palette.rose[400], borderRadius: 999, paddingLeft: 5, paddingRight: 12, paddingVertical: 5, maxWidth: '100%', ...shadow.card },
  previewIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  previewCheck: { width: 16, height: 16, borderRadius: 8, backgroundColor: palette.rose[600], alignItems: 'center', justifyContent: 'center' },
  blockTitle: { fontFamily: font.display, fontSize: 17, lineHeight: 22, color: colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  icon: { width: '22%', aspectRatio: 1, maxWidth: 64, borderRadius: 20, backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[100], alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: palette.green[700], borderColor: palette.green[700], ...shadow.card },
});
