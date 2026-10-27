/**
 * How AI uses your data (SRS §34, §35, §42, §67): a plain-language page about the simulated wellness
 * coach — what it may use (only with the AI-personalisation consent), what it never does, and how to
 * switch personalisation on or off.
 */
import { COPY } from '@healthx/shared';
import { router } from 'expo-router';
import { Ban, Cpu, Droplets, Dumbbell, MessageSquareOff, Moon, ShieldCheck, Siren, Stethoscope, ToggleRight, UserCheck, UserX, Zap, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { BackendNote, Disclaimer, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { GroupHeader, HeroPanel, PageIntro, TintIcon, type Tone, ON_DARK } from '@/components/b-kit';
import { useStore } from '@/lib/store';
import { colors, palette } from '@/lib/theme';

export default function AiData() {
  const { state } = useStore();
  const on = !!state.consents.find((c) => c.id === 'ai_personalization')?.granted;
  const StatusIcon = on ? UserCheck : UserX;

  return (
    <Screen back right={<PhaseBadge phase={2} />}>
      <PageIntro eyebrow="AI & your data" title="How AI uses your data" subtitle="Plain answers about what the wellness coach can see and do." />

      <HeroPanel>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <View style={styles.status}>
            <StatusIcon size={24} color={palette.butter[400]} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="overline" color={ON_DARK.soft}>
              AI personalisation
            </AppText>
            <AppText variant="title" color="#fff" style={{ marginTop: 2 }}>
              {on ? 'Personalisation is on' : 'Personalisation is off'}
            </AppText>
            <AppText variant="small" color={ON_DARK.text} style={{ marginTop: 4 }}>
              {on ? 'The coach can use short weekly summaries of your logs to tailor its answers.' : 'The coach gives general answers only. Nothing from your logs is used.'}
            </AppText>
          </View>
        </View>
        <Button label={on ? 'Turn off in Privacy & data' : 'Turn on in Privacy & data'} variant="light" size="sm" onPress={() => router.push('/privacy')} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
      </HeroPanel>
      <Disclaimer tone="lavender" style={{ marginTop: 14 }} text={COPY.aiDisclaimer} />

      <GroupHeader eyebrow="With your consent" title="What the coach uses" />
      <Card>
        <AppText variant="small" muted style={{ marginBottom: 4 }}>
          With AI personalisation on, the coach can use weekly summaries — not your individual entries:
        </AppText>
        <Point icon={Moon} tone="indigo" title="Sleep" text="Your average sleep this week, and your sleep goal." />
        <Point icon={Zap} tone="peach" title="Energy" text="Your average check-in energy this week." />
        <Point icon={Droplets} tone="sky" title="Water" text="How much of your water goal you reached this week." />
        <Point icon={Dumbbell} tone="green" title="Workouts" text="How many workouts you logged in the last 7 days." last />
        <View style={styles.never}>
          <ShieldCheck size={16} color={palette.green[700]} />
          <AppText variant="small" color={palette.green[800]} style={{ flex: 1 }}>
            The coach never shares these summaries with anyone. {COPY.employerPrivacy}
          </AppText>
        </View>
      </Card>

      <GroupHeader eyebrow="Without consent" title="General answers only" />
      <Card tone="mint">
        <Point icon={UserX} tone="green" title="Your logs stay out of it" text="With personalisation off — and it stays off unless you turn it on — the coach doesn’t look at your logs. You get the same general wellness information anyone would." last />
      </Card>

      <GroupHeader eyebrow="In this build" title="The coach is simulated" />
      <Card>
        <Point icon={Cpu} tone="lavender" title="Rules, not an AI model" text="Replies come from simple rules that run in the app. No AI model is called, and your questions aren’t sent to an AI provider." last />
      </Card>

      <GroupHeader eyebrow="Safety" title="What it never does" />
      <Card>
        <Point icon={Stethoscope} tone="rose" title="Diagnose" text="It can’t tell you whether you have a condition. It can help you prepare questions for a healthcare professional." />
        <Point icon={Ban} tone="butter" title="Prescribe" text="It doesn’t recommend prescription medication or doses. A pharmacist or doctor can advise you." />
        <Point icon={Siren} tone="rose" title="Interpret emergencies" text="It doesn’t assess emergencies. It points you to emergency services straight away." last />
      </Card>
      <Disclaimer tone="danger" style={{ marginTop: 12 }} text={COPY.emergency} />

      <GroupHeader eyebrow="Your questions" title="Not stored, not tracked" />
      <Card>
        <Point
          icon={MessageSquareOff}
          tone="sky"
          title="What you type stays private"
          text="Your questions aren’t stored or tracked, and the conversation clears when you close the coach. If product analytics is on, HealthX counts only that a question was asked — never its text."
          last
        />
      </Card>

      <GroupHeader eyebrow="Your choice" title="Switch personalisation on or off" />
      <Card>
        <Point icon={ToggleRight} tone="green" title="In Privacy & data" text="Open Privacy & data → Consents → AI personalisation. Changes take effect immediately, and you can withdraw at any time." last />
        <Button label="Open Privacy & data" icon={ShieldCheck} variant="secondary" size="sm" onPress={() => router.push('/privacy')} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
      </Card>

      <BackendNote style={{ marginTop: 16 }} text="A real AI coach needs an AI provider, safety evaluations and an AI data policy before launch (D-11, D-12). This page will be updated then." />
    </Screen>
  );
}

function Point({ icon, tone, title, text, last }: { icon: LucideIcon; tone: Tone; title: string; text: string; last?: boolean }) {
  return (
    <View style={[styles.point, !last && styles.border]}>
      <TintIcon icon={icon} tone={tone} size={36} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyMedium">{title}</AppText>
        <AppText variant="small" muted>
          {text}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  status: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  never: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8, padding: 12, borderRadius: 16, backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[100] },
});
