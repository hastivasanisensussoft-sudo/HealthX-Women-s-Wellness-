/**
 * AI Wellness Coach — Premium, Phase 2 (SRS §34, §23, §35, §67; P2-01). Answers come from
 * `lib/coachClient` (simulated keyword rules until the AI provider is connected), always through the
 * shared output filter; emergencies are redirected on the phone and offer "Get urgent help". With the
 * AI-personalisation consent, replies can add notes from the person's weekly summaries (`coachContextOf`).
 * The conversation is kept on this phone (small, capped) and can be deleted; questions are limited per day.
 */
import { COACH_DAILY_LIMIT, COACH_MAX_CHARS, COACH_STARTERS, COPY, coachContextOf, type CoachReply, type ISODate } from '@healthx/shared';
import { router } from 'expo-router';
import { ChevronRight, OctagonAlert, RotateCcw, Send, ShieldAlert, Sparkles, Trash2, UserCheck, UserX, WifiOff } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/Art';
import { BackendNote, Disclaimer, PhaseBadge } from '@/components/Badges';
import { Button, IconButton } from '@/components/Button';
import { PremiumGate, usePremium } from '@/components/PremiumGate';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { UrgentHelpSheet } from '@/components/UrgentHelp';
import { Leaf } from '@/components/b-kit';
import { COACH_SIMULATED, askCoach } from '@/lib/coachClient';
import { DEVICE_ONLY_NOTE } from '@/lib/deviceData';
import { useStore } from '@/lib/store';
import { brandText, colors, font, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { track } from '@/lib/track';
import { useDeviceData } from '@/lib/useDeviceData';

interface Msg {
  id: number;
  from: 'user' | 'coach';
  text: string;
  reply?: CoachReply;
}

const GREETING: Msg = { id: 0, from: 'coach', text: "Hi! I'm your HealthX wellness coach. Ask me about sleep, movement, stress, hydration or your cycle." };
/** Phone storage is meant for small items, so only the latest part of the conversation is kept. */
const MAX_STORED_CHARS = 1800;
const trim = (list: Msg[]) => {
  const out = list.slice(-12);
  while (out.length > 2 && JSON.stringify(out).length > MAX_STORED_CHARS) out.shift();
  return out;
};

/** The shared notes start with "From your logs:" — the bubble already has that heading. */
const tidy = (p: string) => {
  const t = p.replace(/^From your logs:\s*/i, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function Typing() {
  const [dots] = useState(() => [new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]);
  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(Animated.sequence([Animated.delay(i * 150), Animated.timing(d, { toValue: 1, duration: 300, useNativeDriver: true }), Animated.timing(d, { toValue: 0.3, duration: 300, useNativeDriver: true })])),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={[styles.bubble, styles.coach, { flexDirection: 'row', gap: 5, paddingVertical: 16 }]} accessibilityLabel="Coach is typing">
      {dots.map((d, i) => (
        <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.green[600], opacity: d }} />
      ))}
    </View>
  );
}

function CoachAvatar() {
  return (
    <View style={styles.avatar}>
      <LogoMark size={20} />
    </View>
  );
}

export default function Coach() {
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const toast = useToast();
  const premium = usePremium();
  const personalised = !!state.consents.find((c) => c.id === 'ai_personalization')?.granted;
  const chat = useDeviceData<Msg[]>('coach-chat', []);
  const usage = useDeviceData<{ date: ISODate | ''; count: number }>('coach-usage', { date: '', count: 0 });
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [urgent, setUrgent] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const msgs = [GREETING, ...chat.value];
  const usedToday = usage.value.date === state.today ? usage.value.count : 0;
  const left = Math.max(0, COACH_DAILY_LIMIT - usedToday);

  const send = async (value: string, retry = false) => {
    const v = value.trim();
    if (!premium || !v || typing || v.length > COACH_MAX_CHARS || left === 0) return;
    if (!retry) chat.set((prev) => trim([...prev, { id: Date.now(), from: 'user', text: v }]));
    setFailed(null);
    setText('');
    setTyping(true);
    track('ai_question_asked'); // that a question was asked — never its text
    usage.set((u) => ({ date: state.today, count: (u.date === state.today ? u.count : 0) + 1 }));
    try {
      // Weekly summaries only, and only with the AI-personalisation consent (null otherwise).
      const reply = await askCoach(v, coachContextOf(state));
      chat.set((prev) => trim([...prev, { id: Date.now() + 1, from: 'coach', text: reply.text, reply }]));
    } catch {
      setFailed(v);
    } finally {
      setTyping(false);
    }
  };

  const pickSuggestion = (s: string) => {
    // "Read: <article title>" opens that article instead of asking.
    const title = /^Read:\s*(.+)$/i.exec(s)?.[1]?.toLowerCase();
    const article = title ? state.articles.find((a) => a.status === 'published' && a.title.toLowerCase() === title) : undefined;
    if (article) return router.push({ pathname: '/learn/[id]', params: { id: article.id } });
    void send(title ? s.replace(/^Read:\s*/i, '') : s);
  };

  useEffect(() => {
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
  }, [chat.value.length, typing, failed]);

  const last = msgs[msgs.length - 1];
  const suggestions = !failed && last.from === 'coach' ? last.reply?.suggestions ?? (msgs.length === 1 ? COACH_STARTERS : []) : [];
  const ConsentIcon = personalised ? UserCheck : UserX;

  return (
    <Screen
      back
      title="AI wellness coach"
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {premium && chat.value.length ? <IconButton icon={Trash2} label="Delete conversation" size={36} onPress={() => setConfirmClear(true)} /> : null}
          <PhaseBadge phase={2} />
        </View>
      }
      scroll={false}
      padded={false}
      background={colors.background}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={60}>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
          {/* Coach intro */}
          <View style={styles.intro}>
            <Leaf size={90} color={palette.rose[100]} vein={false} rotate={170} style={{ position: 'absolute', bottom: -34, right: -22 }} />
            <View style={styles.bigAvatar}>
              <LogoMark size={34} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="overline" color={palette.green[700]}>
                {COACH_SIMULATED ? 'Simulated · general wellness' : 'General wellness'}
              </AppText>
              <AppText variant="h2">Your wellness coach</AppText>
              <AppText variant="small" muted style={{ marginTop: 2 }}>
                Sleep, movement, stress, hydration and cycle education.
              </AppText>
            </View>
          </View>
          <Disclaimer text={COPY.aiDisclaimer} tone="lavender" />
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Personalisation ${personalised ? 'on' : 'off'}. How AI uses your data`}
            onPress={() => router.push('/ai-data')}
            style={({ pressed }) => [styles.consent, pressed && { opacity: 0.85 }]}>
            <ConsentIcon size={16} color={personalised ? palette.green[700] : palette.ink[500]} />
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={palette.ink[700]}>
                {personalised ? 'Personalisation on — answers can use your weekly summaries.' : 'Personalisation off — general answers only.'}
              </AppText>
              <AppText variant="caption" color={palette.green[700]} style={{ fontFamily: font.semibold, marginTop: 2 }}>
                How AI uses your data
              </AppText>
            </View>
            <ChevronRight size={16} color={palette.green[700]} />
          </Pressable>

          <PremiumGate feature="coach">
            {msgs.map((m) =>
              m.from === 'user' ? (
                <View key={m.id} style={[styles.bubble, styles.user]}>
                  <AppText variant="body" color="#fff">
                    {m.text}
                  </AppText>
                </View>
              ) : (
                <View key={m.id} style={styles.coachRow}>
                  <CoachAvatar />
                  <View style={[styles.bubble, styles.coach, m.reply?.kind === 'emergency' && styles.emergency, m.reply?.kind === 'declined' && styles.declined]}>
                    {m.reply?.kind === 'emergency' ? (
                      <View style={styles.kind}>
                        <OctagonAlert size={16} color={colors.danger} />
                        <AppText variant="smallMedium" color={colors.danger}>
                          Seek medical help now
                        </AppText>
                      </View>
                    ) : m.reply?.kind === 'declined' ? (
                      <View style={styles.kind}>
                        <ShieldAlert size={16} color="#8A6400" />
                        <AppText variant="smallMedium" color="#8A6400">
                          I can’t help with that part
                        </AppText>
                      </View>
                    ) : null}
                    <AppText variant="body">{m.text}</AppText>
                    {m.reply?.bullets?.map((b) => (
                      <View key={b} style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                        <View style={styles.bullet} />
                        <AppText variant="body" style={{ flex: 1 }}>
                          {b}
                        </AppText>
                      </View>
                    ))}
                    {m.reply?.kind === 'emergency' ? <Button label="Get urgent help" icon={OctagonAlert} variant="danger" size="sm" onPress={() => setUrgent(true)} style={{ alignSelf: 'flex-start', marginTop: 10 }} /> : null}
                    {m.reply?.personal?.length ? (
                      <View style={styles.personal}>
                        <View style={styles.kind}>
                          <UserCheck size={14} color={palette.lavender[700]} />
                          <AppText variant="overline" color={palette.lavender[700]}>
                            From your logs
                          </AppText>
                        </View>
                        {m.reply.personal.map((p) => (
                          <View key={p} style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                            <View style={[styles.bullet, styles.bulletSmall]} />
                            <AppText variant="small" style={{ flex: 1 }}>
                              {tidy(p)}
                            </AppText>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              ),
            )}
            {typing ? (
              <View style={styles.coachRow}>
                <CoachAvatar />
                <Typing />
              </View>
            ) : null}
            {failed ? (
              <View style={styles.coachRow}>
                <CoachAvatar />
                <View style={[styles.bubble, styles.coach, styles.failed]} accessibilityRole="alert">
                  <View style={styles.kind}>
                    <WifiOff size={16} color={palette.ink[600]} />
                    <AppText variant="smallMedium" color={palette.ink[700]}>
                      No answer this time
                    </AppText>
                  </View>
                  <AppText variant="small">The coach didn’t answer. Check your connection and try again.</AppText>
                  <Button label="Try again" icon={RotateCcw} variant="soft" size="sm" onPress={() => void send(failed, true)} style={{ alignSelf: 'flex-start', marginTop: 10 }} />
                </View>
              </View>
            ) : null}
            {suggestions.length ? (
              <View>
                <AppText variant="overline" color={colors.textSubtle} style={{ marginBottom: 8, marginLeft: 40 }}>
                  Try asking
                </AppText>
                <View style={styles.suggestions}>
                  {suggestions.map((s) => (
                    <Pressable key={s} accessibilityRole="button" onPress={() => pickSuggestion(s)} style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.85 }]}>
                      <Sparkles size={13} color={palette.green[600]} />
                      <AppText variant="smallMedium" color={brandText}>
                        {s}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            {premium && chat.value.length ? (
              <AppText variant="caption" muted center>
                Your recent conversation is kept so you can come back to it. {DEVICE_ONLY_NOTE}
              </AppText>
            ) : null}
          </PremiumGate>
          {COACH_SIMULATED ? <BackendNote text="Simulated replies (keyword rules) through the same safety filter a real AI provider will use. Connecting the provider needs the backend AI module, safety evals and the AI data policy (D-11, D-12)." /> : null}
        </ScrollView>
        {premium && left === 0 ? (
          <View style={[styles.composer, styles.limit, { paddingBottom: insets.bottom + 12 }]} accessibilityRole="alert">
            <AppText variant="smallMedium" center>
              You’ve asked {COACH_DAILY_LIMIT} questions today — that’s the daily limit.
            </AppText>
            <AppText variant="caption" muted center>
              Come back tomorrow. For anything urgent, contact a healthcare professional.
            </AppText>
          </View>
        ) : premium ? (
          <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
            {left <= 5 || text.length > COACH_MAX_CHARS - 100 ? (
              <AppText variant="caption" muted style={{ position: 'absolute', top: -20, left: 22 }}>
                {left <= 5 ? `${left} question${left === 1 ? '' : 's'} left today` : ''}
                {left <= 5 && text.length > COACH_MAX_CHARS - 100 ? ' · ' : ''}
                {text.length > COACH_MAX_CHARS - 100 ? `${text.length}/${COACH_MAX_CHARS}` : ''}
              </AppText>
            ) : null}
            <TextInput
              accessibilityLabel="Message the coach"
              value={text}
              onChangeText={setText}
              placeholder="Ask a wellness question…"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              maxLength={COACH_MAX_CHARS}
              multiline
              onSubmitEditing={() => void send(text)}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={() => void send(text)} disabled={!text.trim() || typing} style={[styles.send, (!text.trim() || typing) && { opacity: 0.4 }]}>
              <Send size={18} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <View style={{ height: insets.bottom }} />
        )}
      </KeyboardAvoidingView>

      <UrgentHelpSheet visible={urgent} onClose={() => setUrgent(false)} />
      <Sheet
        visible={confirmClear}
        onClose={() => setConfirmClear(false)}
        eyebrow="AI coach"
        title="Delete this conversation?"
        subtitle="Your questions and the coach’s answers are removed from this phone. This can’t be undone."
        footer={
          <View style={{ gap: 8 }}>
            <Button
              label="Delete conversation"
              variant="danger"
              full
              onPress={() => {
                chat.set([]);
                setFailed(null);
                setConfirmClear(false);
                toast('Conversation deleted');
              }}
            />
            <Button label="Keep it" variant="ghost" full onPress={() => setConfirmClear(false)} />
          </View>
        }>
        <View />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100], overflow: 'hidden', ...shadow.card },
  bigAvatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: palette.green[50], borderWidth: 2, borderColor: palette.green[100], alignItems: 'center', justifyContent: 'center' },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft },
  coachRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  bubble: { maxWidth: '84%', borderRadius: 22, padding: 14 },
  user: { alignSelf: 'flex-end', backgroundColor: palette.green[700], borderBottomRightRadius: 6 },
  coach: { backgroundColor: colors.surface, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.borderSoft, flexShrink: 1 },
  emergency: { backgroundColor: colors.dangerSoft, borderColor: '#F5C2C2' },
  declined: { backgroundColor: palette.butter[50], borderColor: palette.butter[200] },
  failed: { backgroundColor: palette.ink[50], borderColor: palette.ink[200] },
  kind: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.green[500], marginTop: 9 },
  bulletSmall: { backgroundColor: palette.lavender[500], marginTop: 7 },
  personal: { marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: palette.lavender[50], borderWidth: 1, borderColor: palette.lavender[100] },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: palette.green[100], alignItems: 'center', justifyContent: 'center' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 40 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: palette.green[200] },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  limit: { flexDirection: 'column', alignItems: 'center', gap: 2, paddingTop: 14 },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 24, backgroundColor: palette.green[50], paddingHorizontal: 18, paddingTop: 13, paddingBottom: 13, fontFamily: font.medium, fontSize: 15, color: colors.text },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.green[700], alignItems: 'center', justifyContent: 'center' },
});
