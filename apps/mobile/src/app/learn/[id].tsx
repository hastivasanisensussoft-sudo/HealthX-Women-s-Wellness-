/**
 * Article / video / audio detail (SRS §38–§40; mockup M28) as an editorial layout: photo hero,
 * reviewer, review date, version and references [ADD A-12]; audio & video open the simulated player.
 */
import { LIFE_STAGES, formatDate } from '@healthx/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, ChevronLeft, Clock, Headphones, Heart, Play, ShieldCheck } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleCard } from '@/components/ArticleCard';
import { Disclaimer } from '@/components/Badges';
import { IconButton } from '@/components/Button';
import { EmptyState } from '@/components/Feedback';
import { categoryLabel, isPlayable, isQuickHelp, mediaLabel, mediaOf } from '@/components/LibraryCards';
import { goBack } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { GlassTag, GroupHeader, HScroll, PhotoPanel } from '@/components/b-kit';
import { useStore } from '@/lib/store';
import { brandText, colors, font, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { track } from '@/lib/track';

export default function Article() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch, ready } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const a = state.articles.find((x) => x.id === id);

  // Only once the store has loaded: while it boots, the mode (server or offline demo) isn't known yet.
  // Keyed on the id and the read flag, not the article object: every server sync replaces that object, and
  // re-sending "read" after each sync looped (write → sync → new object → write).
  const notReadable = a ? isPlayable(a) : true;
  const alreadyRead = !!a && state.readArticles.includes(a.id);
  useEffect(() => {
    if (ready && a && !notReadable && !alreadyRead) dispatch({ type: 'MARK_ARTICLE_READ', articleId: a.id });
  }, [ready, a?.id, notReadable, alreadyRead, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps -- once per article
  useEffect(() => {
    if (ready && a) track('content_opened', a.id);
  }, [ready, a?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- once per article

  if (!a || a.status !== 'published') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top + 40 }}>
        <EmptyState icon={BookOpen} title="Content no longer available" text="It may have been archived or updated." action="Back to library" onAction={() => router.replace('/learn')} />
      </View>
    );
  }
  const saved = state.bookmarks.includes(a.id);
  const playable = isPlayable(a);
  const related = state.articles.filter((x) => x.status === 'published' && x.category === a.category && x.id !== a.id && x.type !== 'faq').slice(0, 4);
  const tag = isQuickHelp(a) ? 'Quick Help' : a.type === 'faq' ? 'Most asked' : mediaLabel(a);
  const PlayIcon = mediaOf(a) === 'audio' ? Headphones : Play;
  const [lead, ...paras] = a.body;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <PhotoPanel photo={a.photo} height={320 + insets.top} radius={0} alt={a.title}>
        <View style={[styles.heroBar, { top: insets.top + 10 }]}>
          <IconButton icon={ChevronLeft} label="Go back" onPress={goBack} />
          <IconButton
            icon={Heart}
            label={saved ? 'Remove from favorites' : 'Add to favorites'}
            onPress={() => {
              dispatch({ type: 'TOGGLE_BOOKMARK', articleId: a.id });
              toast(saved ? 'Removed from favorites' : 'Added to favorites');
            }}
            tone={saved ? 'primary' : 'surface'}
          />
        </View>
        {playable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Play ${mediaLabel(a).toLowerCase()}, ${a.readMin} minutes`}
            onPress={() => router.push({ pathname: '/player/[id]', params: { id: a.id } })}
            style={({ pressed }) => [styles.play, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}>
            <View style={styles.playDisc}>
              <PlayIcon size={18} color={palette.green[800]} fill={mediaOf(a) === 'video' ? palette.green[800] : 'transparent'} />
            </View>
            <AppText variant="smallMedium" color="#fff">
              Play · {a.readMin} min
            </AppText>
          </Pressable>
        ) : null}
        <GlassTag label={`${tag} · ${categoryLabel(a)}`} />
        <View style={{ height: 30 }} />
      </PhotoPanel>

      <View style={styles.body}>
        <AppText variant="display" style={{ fontSize: 28, lineHeight: 34 }}>
          {a.title}
        </AppText>
        <View style={styles.meta}>
          <Clock size={14} color={colors.textSubtle} />
          <AppText variant="caption" muted style={{ flex: 1 }}>
            {a.readMin} min {playable ? mediaLabel(a).toLowerCase() : 'read'} · {LIFE_STAGES.find((l) => l.key === a.lifeStage)?.label} · updated {formatDate(a.updatedAt, 'medium')}
          </AppText>
        </View>

        <View style={styles.review}>
          <View style={styles.tick}>
            <ShieldCheck size={17} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="smallMedium">Medically reviewed by {a.reviewer}</AppText>
            <AppText variant="caption" muted>
              Reviewed {formatDate(a.reviewDate, 'medium')} · v{a.version} · written by {a.author}
            </AppText>
          </View>
        </View>

        <View style={styles.lead}>
          <AppText style={styles.leadText}>{a.description}</AppText>
        </View>
        {lead ? (
          <AppText variant="body" style={[styles.para, { marginTop: 18 }]}>
            <AppText style={styles.drop}>{lead.charAt(0)}</AppText>
            {lead.slice(1)}
          </AppText>
        ) : null}
        {paras.map((p, i) => (
          <AppText key={i} variant="body" style={styles.para}>
            {p}
          </AppText>
        ))}

        <View style={styles.refs}>
          <AppText variant="overline" color={palette.green[700]}>
            References
          </AppText>
          {a.references.map((r, i) => (
            <View key={r} style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <AppText variant="caption" color={palette.green[700]} style={{ fontFamily: font.monoMedium }}>
                {i + 1}.
              </AppText>
              <AppText variant="caption" muted style={{ flex: 1 }}>
                {r}
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" muted style={{ marginTop: 12, fontStyle: 'italic' }}>
          Educational content — not medical advice.
        </AppText>
        <Disclaimer tone="rose" style={{ marginTop: 12 }} text="Demo content: this sample item and its reviewer name are placeholders. Real content goes through medical and compliance review before publishing." />

        {related.length ? (
          <>
            <GroupHeader eyebrow={`More in ${categoryLabel(a)}`} title="Related reading" />
            <HScroll>
              {related.map((r) => (
                <ArticleCard key={r.id} article={r} bookmarked={state.bookmarks.includes(r.id)} />
              ))}
            </HScroll>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  play: { position: 'absolute', alignSelf: 'center', top: '42%', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(8,45,36,0.55)', borderRadius: 999, paddingLeft: 6, paddingRight: 16, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  playDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 22, marginTop: -26, backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  review: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, padding: 12, borderRadius: 18, backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[100] },
  tick: { width: 34, height: 34, borderRadius: 17, backgroundColor: palette.green[700], alignItems: 'center', justifyContent: 'center' },
  lead: { marginTop: 20, paddingLeft: 14, borderLeftWidth: 3, borderLeftColor: palette.rose[400] },
  leadText: { fontFamily: font.displayMedium, fontSize: 18, lineHeight: 27, color: brandText },
  para: { marginTop: 14, fontSize: 16, lineHeight: 26 },
  drop: { fontFamily: font.displayBold, fontSize: 30, lineHeight: 26, color: palette.green[700] },
  refs: { marginTop: 24, padding: 16, borderRadius: 20, backgroundColor: palette.ink[50], borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
});
