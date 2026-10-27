/** Most Asked Questions (mockup M27): photo intro, the library's medium & time filters and FAQ rows with an answer preview (accordion). */
import { COPY } from '@healthx/shared';
import { router } from 'expo-router';
import { ChevronRight, MessageCircle, MessageCircleQuestion } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Disclaimer } from '@/components/Badges';
import { EmptyState } from '@/components/Feedback';
import { EMPTY_FILTERS, FaqRow, LibraryFilters, applyLibraryFilters, type LibraryFilterState } from '@/components/LibraryCards';
import { Screen } from '@/components/Screen';
import { CardSkeletons, LoadError, OfflineBanner, useSimulatedLoad } from '@/components/States';
import { AppText } from '@/components/Text';
import { GlassTag, PageIntro, PhotoPanel, TintIcon, ON_DARK } from '@/components/b-kit';
import { useStore } from '@/lib/store';
import { palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

export default function Faq() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const { status, retry } = useSimulatedLoad(450);
  const [filters, setFilters] = useState<LibraryFilterState>(EMPTY_FILTERS);
  const faqs = useMemo(() => state.articles.filter((a) => a.status === 'published' && a.type === 'faq'), [state.articles]);
  const list = applyLibraryFilters(faqs, filters, state.bookmarks);

  return (
    <Screen back>
      <PageIntro eyebrow="Library · FAQ" title="Most Asked Questions" />
      <OfflineBanner />
      <PhotoPanel photo="doctor-consult" height={150} position="top" style={{ marginBottom: 16 }}>
        <GlassTag label={`${faqs.length} answers`} icon={<MessageCircleQuestion size={12} color={palette.green[800]} />} />
        <AppText variant="h2" color="#fff" style={{ marginTop: 'auto' }}>
          Clear, reviewed answers
        </AppText>
        <AppText variant="small" color={ON_DARK.text}>
          Tap a question to read it, or the arrow for a quick preview.
        </AppText>
      </PhotoPanel>
      <LibraryFilters value={filters} onChange={setFilters} />
      <View style={{ marginTop: 16, gap: 10 }}>
        {status === 'loading' ? (
          <CardSkeletons count={4} height={92} />
        ) : status === 'error' ? (
          <LoadError onRetry={retry} />
        ) : list.length ? (
          list.map((a) => (
            <FaqRow
              key={a.id}
              article={a}
              saved={state.bookmarks.includes(a.id)}
              onToggleSave={() => {
                const saved = state.bookmarks.includes(a.id);
                dispatch({ type: 'TOGGLE_BOOKMARK', articleId: a.id });
                toast(saved ? 'Removed from favorites' : 'Added to favorites');
              }}
            />
          ))
        ) : (
          <EmptyState icon={MessageCircleQuestion} title="No questions match" text="Try another time or clear your favorites filter." action="Clear filters" onAction={() => setFilters(EMPTY_FILTERS)} />
        )}
      </View>
      <Disclaimer style={{ marginTop: 18 }} text={`Answers are general education, not individual medical advice. If you have questions about your own health, consider speaking with a qualified healthcare professional. ${COPY.emergency}`} />
      <Pressable accessibilityRole="button" accessibilityLabel="Ask the AI wellness coach" onPress={() => router.push('/coach')} style={({ pressed }) => [styles.coach, pressed && { opacity: 0.92 }]}>
        <TintIcon icon={MessageCircle} tone="lavender" size={40} solid />
        <View style={{ flex: 1 }}>
          <AppText variant="h3">Have a question that isn’t here?</AppText>
          <AppText variant="caption" muted>
            Ask the AI wellness coach for general information.
          </AppText>
        </View>
        <ChevronRight size={18} color={palette.lavender[600]} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  coach: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 14, borderRadius: 22, backgroundColor: palette.lavender[50], borderWidth: 1, borderColor: palette.lavender[100] },
});
