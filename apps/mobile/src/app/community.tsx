/**
 * Community — Phase 4 preview (SRS §64; mockup M49). Moderated groups; posts are personal
 * experiences, not medical advice. Posts, likes, reports and blocks are saved to the user's own
 * account (or the device in the offline demo); there is no shared feed or moderation service yet.
 */
import { COMMUNITY_GROUPS, timeAgo, type CommunityPost } from '@healthx/shared';
import { Ban, Flag, Heart, MessageCircle, Plus, ShieldCheck, UsersRound } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BackendNote, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/Feedback';
import { TextField } from '@/components/Inputs';
import { FilterChip } from '@/components/LibraryCards';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { CardSkeletons, LoadError, OfflineBanner, useSimulatedLoad } from '@/components/States';
import { AppText } from '@/components/Text';
import { TILE_TONES, type TileTone } from '@/components/Tiles';
import { GlassTag, PageIntro, PhotoPanel, ON_DARK } from '@/components/b-kit';
import { useOffline } from '@/lib/network';
import { useStore } from '@/lib/store';
import { brandText, colors, font, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

type Confirm = { kind: 'report'; post: CommunityPost } | { kind: 'block'; post: CommunityPost } | null;
const AVATAR_TONES: TileTone[] = ['rose', 'lavender', 'sky', 'peach', 'butter', 'indigo'];
const toneOf = (name: string) => AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];

export default function Community() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const offline = useOffline();
  const { status, retry } = useSimulatedLoad(600);
  const [group, setGroup] = useState<string>('All');
  const [composeOpen, setComposeOpen] = useState(false);
  const [draftGroup, setDraftGroup] = useState(COMMUNITY_GROUPS[0]);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const { posts, blocked } = state.community;
  const visible = useMemo(() => posts.filter((p) => !blocked.includes(p.author) && (group === 'All' || p.group === group)), [posts, blocked, group]);

  const submit = () => {
    const t = text.trim();
    if (t.length < 3) return setErr('Write at least 3 characters.');
    if (t.length > 500) return setErr('Keep posts under 500 characters.');
    if (offline) return setErr('You’re offline — try posting again when you’re back online.');
    dispatch({ type: 'ADD_POST', group: draftGroup, text: t });
    setText('');
    setErr(null);
    setComposeOpen(false);
    setGroup(draftGroup);
    toast('Posted (demo) — real posts pass moderation first');
  };

  const onConfirm = () => {
    if (!confirm) return;
    if (confirm.kind === 'report') {
      dispatch({ type: 'REPORT_POST', id: confirm.post.id });
      toast('Reported — our moderators will review it', 'info');
    } else {
      dispatch({ type: 'BLOCK_AUTHOR', author: confirm.post.author });
      toast(`You won’t see posts from ${confirm.post.author}`, 'info');
    }
    setConfirm(null);
  };

  return (
    <Screen
      back
      right={<PhaseBadge phase={4} />}
      footer={
        <Button
          label="New post"
          icon={Plus}
          full
          onPress={() => {
            setErr(null);
            setComposeOpen(true);
          }}
        />
      }>
      <PageIntro eyebrow="Moderated groups · preview" title="Community" />
      <OfflineBanner />
      <PhotoPanel photo="friends-group" height={176} position="center" alt="Friends walking together">
        <GlassTag label="Sample posts" icon={<UsersRound size={12} color={palette.green[800]} />} />
        <AppText variant="title" color="#fff" style={{ marginTop: 'auto' }}>
          Share tips, ask kindly
        </AppText>
        <AppText variant="small" color={ON_DARK.text}>
          Personal experiences — never medical advice.
        </AppText>
      </PhotoPanel>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {['All', ...COMMUNITY_GROUPS].map((g) => (
          <FilterChip key={g} label={g} on={group === g} onPress={() => setGroup(g)} />
        ))}
      </ScrollView>
      <View style={styles.notice}>
        <ShieldCheck size={16} color={palette.green[700]} />
        <AppText variant="caption" style={{ flex: 1 }}>
          Posts are personal experiences, not medical advice. This community is moderated — be kind, and never share personal health details you’d want kept private.
        </AppText>
      </View>

      {status === 'loading' ? (
        <CardSkeletons count={3} height={140} />
      ) : status === 'error' ? (
        <LoadError onRetry={retry} />
      ) : visible.length === 0 ? (
        <Card tone="mint">
          <EmptyState
            icon={UsersRound}
            title={`No posts in ${group} yet`}
            text="Start the conversation with a tip or a question."
            action="Write a post"
            onAction={() => {
              setDraftGroup(group === 'All' ? COMMUNITY_GROUPS[0] : group);
              setComposeOpen(true);
            }}
          />
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {visible.map((p) => {
            const t = TILE_TONES[p.mine ? 'green' : toneOf(p.author)];
            return (
              <View key={p.id} style={[styles.post, p.reported && styles.reported]}>
                <View style={styles.head}>
                  <View style={[styles.avatar, { backgroundColor: p.mine ? palette.green[700] : t.bg, borderColor: p.mine ? palette.green[700] : t.border }]}>
                    <AppText variant="smallMedium" color={p.mine ? '#fff' : t.hint} style={{ fontFamily: font.bold }}>
                      {p.initials}
                    </AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold">{p.mine ? `${p.author} (you)` : p.author}</AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
                      <View style={styles.groupPill}>
                        <AppText variant="caption" color={brandText} style={{ fontSize: 11 }}>
                          {p.group}
                        </AppText>
                      </View>
                      <AppText variant="caption" muted>
                        {timeAgo(p.at)}
                      </AppText>
                    </View>
                  </View>
                </View>
                {p.reported ? (
                  <AppText variant="small" muted style={{ marginTop: 12, fontStyle: 'italic' }}>
                    You reported this post. It’s hidden for you while moderators review it.
                  </AppText>
                ) : (
                  <>
                    <AppText variant="body" style={{ marginTop: 12 }}>
                      {p.text}
                    </AppText>
                    <View style={styles.actions}>
                      <Pressable
                        accessibilityRole="button"
                        aria-selected={!!p.liked}
                        accessibilityLabel={p.liked ? 'Unlike' : 'Like'}
                        onPress={() => dispatch({ type: 'TOGGLE_LIKE_POST', id: p.id })}
                        style={[styles.action, p.liked && styles.liked]}
                        hitSlop={6}>
                        <Heart size={16} color={p.liked ? palette.rose[500] : colors.textMuted} fill={p.liked ? palette.rose[500] : 'transparent'} />
                        <AppText variant="caption" color={p.liked ? palette.rose[700] : colors.textMuted}>
                          {p.likes}
                        </AppText>
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`${p.comments} comments`} onPress={() => toast('Comments open with the community launch (Phase 4)', 'info')} style={styles.action} hitSlop={6}>
                        <MessageCircle size={16} color={colors.textMuted} />
                        <AppText variant="caption" muted>
                          {p.comments}
                        </AppText>
                      </Pressable>
                      <View style={{ flex: 1 }} />
                      {!p.mine ? (
                        <>
                          <Pressable accessibilityRole="button" accessibilityLabel={`Report post by ${p.author}`} onPress={() => setConfirm({ kind: 'report', post: p })} style={styles.action} hitSlop={6}>
                            <Flag size={14} color={colors.textMuted} />
                            <AppText variant="caption" muted>
                              Report
                            </AppText>
                          </Pressable>
                          <Pressable accessibilityRole="button" accessibilityLabel={`Block ${p.author}`} onPress={() => setConfirm({ kind: 'block', post: p })} style={styles.action} hitSlop={6}>
                            <Ban size={14} color={colors.textMuted} />
                            <AppText variant="caption" muted>
                              Block
                            </AppText>
                          </Pressable>
                        </>
                      ) : null}
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}
      {blocked.length ? (
        <AppText variant="caption" muted style={{ marginTop: 12 }}>
          Hidden: posts from {blocked.length} blocked member{blocked.length === 1 ? '' : 's'}.
        </AppText>
      ) : null}
      <BackendNote style={{ marginTop: 14 }} text="Community is Phase 4: real posting needs accounts, moderation tools and reporting workflows. Sample posts only." />

      <Sheet visible={composeOpen} onClose={() => setComposeOpen(false)} title="New post" subtitle="Share a tip or ask a question — no personal health details." footer={<Button label="Post" full onPress={submit} />}>
        <View style={{ gap: 12 }}>
          <AppText variant="label">Group</AppText>
          <View style={styles.wrap}>
            {COMMUNITY_GROUPS.map((g) => (
              <FilterChip key={g} label={g} on={draftGroup === g} onPress={() => setDraftGroup(g)} />
            ))}
          </View>
          <TextField label="Your post" value={text} onChangeText={setText} multiline maxLength={500} placeholder="What would you like to share?" error={err} hint={`${text.trim().length}/500`} />
        </View>
      </Sheet>

      <Sheet
        visible={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === 'block' ? `Block ${confirm.post.author}?` : 'Report this post?'}
        subtitle={confirm?.kind === 'block' ? 'You won’t see their posts. They won’t be told.' : 'Moderators review reports for harmful, unsafe or misleading content.'}
        footer={<Button label={confirm?.kind === 'block' ? 'Block' : 'Report'} variant="danger" full onPress={onConfirm} />}>
        <AppText variant="small" muted>
          {confirm?.post.text}
        </AppText>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: palette.green[50], borderRadius: 16, padding: 12, marginVertical: 12, borderWidth: 1, borderColor: palette.green[100] },
  post: { padding: 16, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  groupPill: { backgroundColor: palette.green[50], borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, paddingHorizontal: 10, borderRadius: 999, backgroundColor: palette.ink[50] },
  liked: { backgroundColor: palette.rose[50] },
  reported: { opacity: 0.7 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
