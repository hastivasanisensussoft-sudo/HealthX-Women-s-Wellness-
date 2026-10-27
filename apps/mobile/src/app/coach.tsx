/** AI Wellness Coach — Phase 2, SIMULATED (SRS §34, §23, §67). Keyword rules from shared `simulateCoachReply`: declines diagnosis, redirects emergencies to care. */
import { COACH_STARTERS, COPY, simulateCoachReply, type CoachReply } from '@healthx/shared';
import { OctagonAlert, Send, ShieldAlert, Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/Art';
import { BackendNote, Disclaimer, PhaseBadge } from '@/components/Badges';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { Leaf } from '@/components/b-kit';
import { brandText, colors, font, palette, shadow } from '@/lib/theme';

interface Msg {
  id: number;
  from: 'user' | 'coach';
  text: string;
  reply?: CoachReply;
}

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
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 0, from: 'coach', text: "Hi! I'm your HealthX wellness coach (simulated in this demo). Ask me about sleep, movement, stress, hydration or your cycle." },
  ]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const nextId = useRef(1);

  const send = (value: string) => {
    const v = value.trim();
    if (!v || typing) return;
    if (v.length > 500) return;
    const id = (nextId.current += 2);
    setMsgs((m) => [...m, { id, from: 'user', text: v }]);
    setText('');
    setTyping(true);
    setTimeout(() => {
      const reply = simulateCoachReply(v);
      setMsgs((m) => [...m, { id: id + 1, from: 'coach', text: reply.text, reply }]);
      setTyping(false);
    }, 900);
  };

  useEffect(() => {
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
  }, [msgs, typing]);

  const last = msgs[msgs.length - 1];
  const suggestions = last.from === 'coach' ? last.reply?.suggestions ?? (msgs.length === 1 ? COACH_STARTERS : []) : [];

  return (
    <Screen back title="AI wellness coach" right={<PhaseBadge phase={2} />} scroll={false} padded={false} background={colors.background}>
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
                Simulated · general wellness
              </AppText>
              <AppText variant="h2">Your wellness coach</AppText>
              <AppText variant="small" muted style={{ marginTop: 2 }}>
                Sleep, movement, stress, hydration and cycle education.
              </AppText>
            </View>
          </View>
          <Disclaimer text={COPY.aiDisclaimer} tone="lavender" />

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
          {suggestions.length ? (
            <View>
              <AppText variant="overline" color={colors.textSubtle} style={{ marginBottom: 8, marginLeft: 40 }}>
                Try asking
              </AppText>
              <View style={styles.suggestions}>
                {suggestions.map((s) => (
                  <Pressable key={s} accessibilityRole="button" onPress={() => send(s)} style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.85 }]}>
                    <Sparkles size={13} color={palette.green[600]} />
                    <AppText variant="smallMedium" color={brandText}>
                      {s}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          <BackendNote text="Simulated replies (keyword rules). The real coach needs an AI provider, safety evals and an AI data policy (D-11, D-12)." />
        </ScrollView>
        <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            accessibilityLabel="Message the coach"
            value={text}
            onChangeText={setText}
            placeholder="Ask a wellness question…"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            maxLength={500}
            multiline
            onSubmitEditing={() => send(text)}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={() => send(text)} disabled={!text.trim() || typing} style={[styles.send, (!text.trim() || typing) && { opacity: 0.4 }]}>
            <Send size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100], overflow: 'hidden', ...shadow.card },
  bigAvatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: palette.green[50], borderWidth: 2, borderColor: palette.green[100], alignItems: 'center', justifyContent: 'center' },
  coachRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  bubble: { maxWidth: '84%', borderRadius: 22, padding: 14 },
  user: { alignSelf: 'flex-end', backgroundColor: palette.green[700], borderBottomRightRadius: 6 },
  coach: { backgroundColor: colors.surface, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.borderSoft, flexShrink: 1 },
  emergency: { backgroundColor: colors.dangerSoft, borderColor: '#F5C2C2' },
  declined: { backgroundColor: palette.butter[50], borderColor: palette.butter[200] },
  kind: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.green[500], marginTop: 9 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: palette.green[100], alignItems: 'center', justifyContent: 'center' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 40 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: palette.green[200] },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 24, backgroundColor: palette.green[50], paddingHorizontal: 18, paddingTop: 13, paddingBottom: 13, fontFamily: font.medium, fontSize: 15, color: colors.text },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.green[700], alignItems: 'center', justifyContent: 'center' },
});
