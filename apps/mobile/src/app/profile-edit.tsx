/** Edit profile (SRS §9) with validation: arch portrait with leaves, your own photo (kept on this phone) or a sample avatar, basics, optional body data (§5 data minimisation, metric or imperial) and goals. */
import { COUNTRIES, GOALS, type ActivityLevel, type GoalKey, type PhotoKey } from '@healthx/shared';
import { Camera, Check, ImagePlus, Ruler, Target, Trash2, UserRound, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackendNote, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip, TextField } from '@/components/Inputs';
import { Photo } from '@/components/Photo';
import { Screen, goBack } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { LeafPair, PageIntro, TintIcon, type Tone } from '@/components/b-kit';
import { DEVICE_ONLY_NOTE } from '@/lib/deviceData';
import { simulate } from '@/lib/hooks';
import { PICK_MESSAGES, useProfilePhoto, type PhotoSource } from '@/lib/profilePhoto';
import { useStore } from '@/lib/store';
import { colors, font, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const AVATARS: PhotoKey[] = ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4'];
const LB = 2.20462;
const IN = 2.54;
const round1 = (n: number) => Math.round(n * 10) / 10;
const ACTIVITY: { key: ActivityLevel; label: string }[] = [
  { key: 'sedentary', label: 'Low' },
  { key: 'light', label: 'Light' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'active', label: 'Active' },
];

export default function ProfileEdit() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const p = state.profile;
  const imperial = p.units === 'imperial';
  const photo = useProfilePhoto();
  const [name, setName] = useState(p.name);
  const [dob, setDob] = useState(p.dob);
  const [country, setCountry] = useState(p.country);
  const [height, setHeight] = useState(p.heightCm ? String(imperial ? Math.round(p.heightCm / IN) : p.heightCm) : '');
  const [weight, setWeight] = useState(p.weightKg ? String(imperial ? round1(p.weightKg * LB) : p.weightKg) : '');
  const [activity, setActivity] = useState<ActivityLevel | undefined>(p.activityLevel);
  const [avatar, setAvatar] = useState<PhotoKey | undefined>(p.avatar);
  const [goals, setGoals] = useState<GoalKey[]>(p.goals);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Stored in cm / kg; shown and typed in the person's units.
  const heightCm = height ? (imperial ? Math.round(Number(height) * IN) : Number(height)) : undefined;
  const weightKg = weight ? (imperial ? round1(Number(weight) / LB) : Number(weight)) : undefined;

  const pickPhoto = async (source: PhotoSource) => {
    const r = await photo.pick(source);
    if (r === 'saved') toast('Photo updated');
    else if (r !== 'cancelled') toast(PICK_MESSAGES[r], 'error');
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Please enter your name.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(new Date(dob).getTime())) e.dob = 'Use the format YYYY-MM-DD.';
    else if (dob > state.today) e.dob = "Date of birth can't be in the future.";
    if (heightCm !== undefined && (!(heightCm >= 100) || heightCm > 230)) e.height = imperial ? 'Height should be between 40 and 90 in.' : 'Height should be between 100 and 230 cm.';
    if (weightKg !== undefined && (!(weightKg >= 30) || weightKg > 250)) e.weight = imperial ? 'Weight should be between 66 and 551 lb.' : 'Weight should be between 30 and 250 kg.';
    if (!goals.length) e.goals = 'Keep at least one goal.';
    setErrors(e);
    if (Object.keys(e).length) return toast('Please check the highlighted fields', 'error');
    setSaving(true);
    await simulate(null, 600);
    dispatch({
      type: 'UPDATE_PROFILE',
      patch: { name: name.trim(), dob, country, heightCm, weightKg, activityLevel: activity, avatar, goals },
    });
    setSaving(false);
    toast('Profile saved');
    goBack();
  };

  return (
    <Screen back footer={<Button label="Save changes" icon={Check} full loading={saving} onPress={save} />}>
      <PageIntro eyebrow="Your details" title="Edit profile" />

      <View style={styles.head}>
        <View style={styles.archWrap}>
          <LeafPair size={130} style={{ left: -36, top: -14 }} />
          {photo.uri ? (
            <Photo source={{ uri: photo.uri }} shape="arch" radius={24} position="top" style={styles.arch} alt="Your profile photo" />
          ) : avatar ? (
            <Photo photo={avatar} shape="arch" radius={24} position="top" style={styles.arch} alt="Selected profile photo" />
          ) : (
            <View style={[styles.arch, styles.archFallback]}>
              <AppText style={styles.initial}>{(name || '?').charAt(0)}</AppText>
            </View>
          )}
          <View style={styles.cam}>
            <Camera size={15} color="#fff" />
          </View>
        </View>
        <View style={styles.photoActions}>
          <Button label="Take photo" icon={Camera} size="sm" variant="soft" onPress={() => void pickPhoto('camera')} />
          <Button label="Choose photo" icon={ImagePlus} size="sm" variant="soft" onPress={() => void pickPhoto('library')} />
          {photo.uri ? <Button label="Remove" icon={Trash2} size="sm" variant="ghost" onPress={photo.remove} /> : null}
        </View>
        <AppText variant="caption" muted center style={{ marginTop: 6, paddingHorizontal: 12 }}>
          Your own photo: {DEVICE_ONLY_NOTE.charAt(0).toLowerCase() + DEVICE_ONLY_NOTE.slice(1)}
        </AppText>
        <AppText variant="overline" color={palette.green[700]} style={{ marginTop: 16 }}>
          {photo.uri ? 'Or a sample photo (used when yours is removed)' : 'Or a sample photo'}
        </AppText>
        <View style={styles.picks} accessibilityRole="radiogroup">
          {AVATARS.map((a, i) => (
            <Pressable key={a} accessibilityRole="radio" accessibilityLabel={`Sample photo ${i + 1}`} aria-selected={avatar === a} onPress={() => setAvatar(a)} style={[styles.pick, avatar === a && styles.pickOn]}>
              <Photo photo={a} shape="circle" style={{ width: 48, height: 48 }} />
            </Pressable>
          ))}
          <Pressable accessibilityRole="radio" accessibilityLabel="No photo" aria-selected={!avatar} onPress={() => setAvatar(undefined)} style={[styles.pick, styles.none, !avatar && styles.pickOn]}>
            <AppText variant="caption">None</AppText>
          </Pressable>
        </View>
      </View>
      <BackendNote text="Uploading your photo to your account needs secure file storage on the backend — until then it stays on this phone and only the sample choice syncs." style={{ marginTop: 12 }} />

      <Section icon={UserRound} tone="green" title="Basics">
        <TextField label="Name" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" />
        <TextField label="Date of birth" value={dob} onChangeText={setDob} error={errors.dob} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
        <View style={{ gap: 8 }}>
          <AppText variant="label">Country</AppText>
          <View style={styles.wrap}>
            {COUNTRIES.map((c) => (
              <Chip key={c} label={c} selected={country === c} onPress={() => setCountry(c)} />
            ))}
          </View>
        </View>
      </Section>

      <Section icon={Ruler} tone="sky" title="Optional" sub="Only used to personalise wellness suggestions.">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextField label={imperial ? 'Height (in)' : 'Height (cm)'} value={height} onChangeText={(v) => setHeight(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" error={errors.height} style={{ flex: 1 }} />
          <TextField label={imperial ? 'Weight (lb)' : 'Weight (kg)'} value={weight} onChangeText={(v) => setWeight(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" error={errors.weight} style={{ flex: 1 }} />
        </View>
        <View style={{ gap: 8 }}>
          <AppText variant="label">Activity level</AppText>
          <View style={styles.wrap} accessibilityRole="radiogroup">
            {ACTIVITY.map((o) => (
              <Chip key={o.key} label={o.label} selected={(activity ?? 'moderate') === o.key} onPress={() => setActivity(o.key)} />
            ))}
          </View>
        </View>
      </Section>

      <Section icon={Target} tone="rose" title="Goals" sub="Pick what you’d like HealthX to focus on.">
        <View style={styles.wrap}>
          {GOALS.map((g) => (
            <Chip
              key={g.key}
              label={g.label}
              selected={goals.includes(g.key)}
              onPress={() => setGoals((gs) => (gs.includes(g.key) ? gs.filter((x) => x !== g.key) : [...gs, g.key]))}
              icon={g.phase > 1 ? <PhaseBadge phase={g.phase as 2 | 3} /> : undefined}
            />
          ))}
        </View>
        {errors.goals ? (
          <AppText variant="caption" color={colors.danger}>
            {errors.goals}
          </AppText>
        ) : null}
      </Section>
    </Screen>
  );
}

function Section({ icon, tone, title, sub, children }: { icon: LucideIcon; tone: Tone; title: string; sub?: string; children: ReactNode }) {
  return (
    <Card style={{ marginTop: 16, gap: 14 }}>
      <View style={styles.secHead}>
        <TintIcon icon={icon} tone={tone} size={38} />
        <View style={{ flex: 1 }}>
          <AppText variant="h3">{title}</AppText>
          {sub ? (
            <AppText variant="caption" muted>
              {sub}
            </AppText>
          ) : null}
        </View>
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  photoActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
  head: { alignItems: 'center', paddingVertical: 18, borderRadius: 30, backgroundColor: palette.rose[50], borderWidth: 1, borderColor: palette.rose[100], overflow: 'hidden' },
  archWrap: { width: 120, height: 148 },
  arch: { width: 120, height: 148, borderWidth: 4, borderColor: colors.surface, ...shadow.lift },
  archFallback: { borderTopLeftRadius: 999, borderTopRightRadius: 999, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, backgroundColor: palette.green[700], alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: font.displayBold, fontSize: 48, lineHeight: 56, color: '#fff' },
  cam: { position: 'absolute', bottom: -6, right: -6, width: 34, height: 34, borderRadius: 17, backgroundColor: palette.green[800], borderWidth: 3, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  picks: { flexDirection: 'row', gap: 10, marginTop: 10 },
  pick: { width: 54, height: 54, borderRadius: 27, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  pickOn: { borderColor: palette.green[600] },
  none: { backgroundColor: colors.surface },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
