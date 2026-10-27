/**
 * Library (SRS §38, §39, §61; mockup M26): featured hero, search, medium & time filters, topic and
 * life-stage chips, guided video previews, Quick Help, Most Asked Questions, favorites and pagination.
 */
import { CONTENT_CATEGORIES, LIFE_STAGES, VIDEO_LIST, type ContentCategory, type LifeStage } from '@healthx/shared';
import { router } from 'expo-router';
import { BookOpen, ChevronRight, Clock, MessageCircleQuestion, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ArticleCard } from '@/components/ArticleCard';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/Feedback';
import { EMPTY_FILTERS, FilterChip, LibraryFilters, QuickHelpCard, applyLibraryFilters, categoryLabel, isQuickHelp, type LibraryFilterState } from '@/components/LibraryCards';
import { Screen } from '@/components/Screen';
import { CardSkeletons, LoadError, OfflineBanner, useSimulatedLoad } from '@/components/States';
import { AppText } from '@/components/Text';
import { VideoCard } from '@/components/Video';
import { GlassTag, GroupHeader, HScroll, PageIntro, PhotoPanel, ON_DARK } from '@/components/b-kit';
import { KeyIcon } from '@/lib/icons';
import { useStore } from '@/lib/store';
import { palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const PAGE = 6;

export default function Library() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const { status, retry } = useSimulatedLoad(500);
  const [filters, setFilters] = useState<LibraryFilterState>(EMPTY_FILTERS);
  const [more, setMore] = useState(false);
  const [cat, setCat] = useState<ContentCategory | 'all'>('all');
  const [stage, setStage] = useState<LifeStage>('all');
  const [shown, setShown] = useState(PAGE);

  const published = useMemo(() => state.articles.filter((a) => a.status === 'published'), [state.articles]);
  const filtered = useMemo(
    () =>
      applyLibraryFilters(published, filters, state.bookmarks).filter(
        (a) => (cat === 'all' || a.category === cat) && (stage === 'all' || a.lifeStage === stage || a.lifeStage === 'all'),
      ),
    [published, filters, state.bookmarks, cat, stage],
  );
  const quick = filtered.filter(isQuickHelp);
  const rest = filtered.filter((a) => !isQuickHelp(a) && a.type !== 'faq');
  const faqCount = published.filter((a) => a.type === 'faq').length;
  const active = filters.favorites || !!filters.media || !!filters.duration || !!filters.q || cat !== 'all' || stage !== 'all';
  const featured = published.find((a) => a.id === 'a_cycle_phases') ?? published.find((a) => a.type === 'article' && !isQuickHelp(a));

  const change = (f: LibraryFilterState) => {
    setFilters(f);
    setShown(PAGE);
  };
  const clear = () => {
    change(EMPTY_FILTERS);
    setCat('all');
    setStage('all');
  };
  const toggleSave = (id: string) => {
    const saved = state.bookmarks.includes(id);
    dispatch({ type: 'TOGGLE_BOOKMARK', articleId: id });
    toast(saved ? 'Removed from favorites' : 'Added to favorites');
  };

  return (
    <Screen back>
      <PageIntro eyebrow="Learn · reviewed content" title="Library" subtitle="Articles, audio and video for every life stage." />
      <OfflineBanner />

      {featured && !active && status === 'ready' ? (
        <PhotoPanel photo={featured.photo} height={210} onPress={() => router.push({ pathname: '/learn/[id]', params: { id: featured.id } })} accessibilityLabel={`Featured: ${featured.title}`} style={{ marginBottom: 18 }}>
          <GlassTag label={`Featured · ${categoryLabel(featured)}`} />
          <AppText variant="title" color="#fff" style={{ marginTop: 'auto' }} numberOfLines={2}>
            {featured.title}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Clock size={13} color={ON_DARK.text} />
            <AppText variant="small" color={ON_DARK.text}>
              {featured.readMin} min read · medically reviewed
            </AppText>
          </View>
        </PhotoPanel>
      ) : null}

      <LibraryFilters value={filters} onChange={change} />

      <AppText variant="overline" color={palette.green[700]} style={{ marginTop: 14, marginBottom: 8 }}>
        Topics
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        <FilterChip label="All topics" soft on={cat === 'all'} onPress={() => setCat('all')} />
        {CONTENT_CATEGORIES.map((c) => (
          <FilterChip
            key={c.key}
            label={c.label}
            soft
            on={cat === c.key}
            icon={<KeyIcon name={c.icon} size={13} color={cat === c.key ? '#fff' : palette.green[700]} />}
            onPress={() => {
              setCat(cat === c.key ? 'all' : c.key);
              setShown(PAGE);
            }}
          />
        ))}
      </ScrollView>
      <Pressable accessibilityRole="button" aria-expanded={more} onPress={() => setMore((m) => !m)} style={styles.moreBtn} hitSlop={6}>
        <SlidersHorizontal size={15} color={palette.green[700]} />
        <AppText variant="smallMedium" color={palette.green[700]}>
          {more ? 'Hide life stages' : 'Filter by life stage'}
        </AppText>
      </Pressable>
      {more ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
          {LIFE_STAGES.map((l) => (
            <FilterChip
              key={l.key}
              label={l.label}
              soft
              on={stage === l.key}
              onPress={() => {
                setStage(l.key);
                setShown(PAGE);
              }}
            />
          ))}
        </ScrollView>
      ) : null}

      <Pressable accessibilityRole="button" accessibilityLabel="Most asked questions" onPress={() => router.push('/learn/faq')} style={({ pressed }) => [styles.faqLink, pressed && { opacity: 0.92 }]}>
        <View style={styles.faqIcon}>
          <MessageCircleQuestion size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="h3">Most Asked Questions</AppText>
          <AppText variant="caption" muted>
            {faqCount} answers on hormones, check-ups, mood and more
          </AppText>
        </View>
        <ChevronRight size={18} color={palette.green[700]} />
      </Pressable>

      {status === 'loading' ? (
        <View style={{ marginTop: 18 }}>
          <CardSkeletons count={3} height={132} />
        </View>
      ) : status === 'error' ? (
        <View style={{ marginTop: 18 }}>
          <LoadError onRetry={retry} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={filters.favorites ? 'No favorites yet' : 'Nothing matches'}
          text={filters.favorites ? 'Tap the heart on any card to save it here.' : 'Try another medium, time or search.'}
          action="Clear filters"
          onAction={clear}
          style={{ marginTop: 10 }}
        />
      ) : (
        <>
          {quick.length ? (
            <>
              <GroupHeader eyebrow="Short & practical" title="Quick Help" />
              <View style={{ gap: 10 }}>
                {quick.map((a) => (
                  <QuickHelpCard key={a.id} article={a} saved={state.bookmarks.includes(a.id)} onToggleSave={() => toggleSave(a.id)} />
                ))}
              </View>
            </>
          ) : null}
          {!active ? (
            <>
              <GroupHeader eyebrow="Video previews" title="Guided sessions" />
              <HScroll>
                {VIDEO_LIST.map((v) => (
                  <VideoCard key={v.key} video={v.key} width={220} height={160} />
                ))}
              </HScroll>
            </>
          ) : null}
          {rest.length ? (
            <>
              <GroupHeader eyebrow={`${rest.length} item${rest.length === 1 ? '' : 's'}${active ? ' · filtered' : ''}`} title="Articles & guides" />
              <View style={{ gap: 12 }}>
                {rest.slice(0, shown).map((a) => (
                  <ArticleCard key={a.id} article={a} wide bookmarked={state.bookmarks.includes(a.id)} />
                ))}
                {shown < rest.length ? <Button label={`Load more (${rest.length - shown})`} variant="secondary" onPress={() => setShown(shown + PAGE)} /> : null}
              </View>
            </>
          ) : null}
        </>
      )}
      <AppText variant="caption" muted style={{ marginTop: 18 }}>
        Educational content — not medical advice. Demo library items are samples that still need medical review; audio and video play as a simulation.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 10, marginBottom: 8, minHeight: 32 },
  faqLink: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 14, borderRadius: 22, backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[100] },
  faqIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.green[700], alignItems: 'center', justifyContent: 'center' },
});
