/** Library building blocks (mockup M26–M29): filters, Quick Help photo cards and FAQ rows with an answer preview. */
import { CONTENT_CATEGORIES, LIBRARY_DURATIONS, LIBRARY_MEDIA, QUICK_HELP, type Article } from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronDown, ChevronRight, ChevronUp, FileText, Headphones, Heart, Play, X } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SearchBar } from './Inputs';
import { Photo } from './Photo';
import { AppText } from './Text';
import { brandText, colors, font, palette, shadow } from '@/lib/theme';

export type MediaKey = (typeof LIBRARY_MEDIA)[number]['key'];

export const mediaOf = (a: Article): MediaKey => (a.type === 'podcast' ? 'audio' : a.type === 'video' ? 'video' : 'article');
export const isPlayable = (a: Article) => mediaOf(a) !== 'article';
export const isQuickHelp = (a: Article) => !!a.tags?.includes(QUICK_HELP);
export const categoryLabel = (a: Article) => CONTENT_CATEGORIES.find((c) => c.key === a.category)?.label ?? a.category;
export const mediaLabel = (a: Article) => ({ audio: 'Audio', video: 'Video', article: a.type === 'faq' ? 'FAQ' : 'Article' })[mediaOf(a)];

export interface LibraryFilterState {
  q: string;
  favorites: boolean;
  media: MediaKey | null;
  duration: string | null;
}

export const EMPTY_FILTERS: LibraryFilterState = { q: '', favorites: false, media: null, duration: null };

export function applyLibraryFilters(list: Article[], f: LibraryFilterState, bookmarks: string[]): Article[] {
  const term = f.q.trim().toLowerCase();
  const dur = LIBRARY_DURATIONS.find((d) => d.key === f.duration);
  return list.filter(
    (a) =>
      (!f.favorites || bookmarks.includes(a.id)) &&
      (!f.media || mediaOf(a) === f.media) &&
      (!dur || (a.readMin >= dur.min && a.readMin <= dur.max)) &&
      (!term || `${a.title} ${a.description} ${a.topic} ${(a.tags ?? []).join(' ')}`.toLowerCase().includes(term)),
  );
}

/** Pill chip: outlined, solid evergreen when on; "soft" is the mint variant. */
export function FilterChip({ label, on, onPress, icon, soft }: { label: string; on?: boolean; onPress: () => void; icon?: ReactNode; soft?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      aria-selected={!!on}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, soft && !on && styles.chipSoft, on && styles.chipOn, pressed && { opacity: 0.85 }]}>
      {icon}
      <AppText variant="smallMedium" color={on ? '#fff' : brandText}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function LibraryFilters({ value, onChange, placeholder = 'Search yoga, pain, sleep…' }: { value: LibraryFilterState; onChange: (v: LibraryFilterState) => void; placeholder?: string }) {
  const set = (patch: Partial<LibraryFilterState>) => onChange({ ...value, ...patch });
  const MediaIcon = { audio: Headphones, video: Play, article: FileText };
  return (
    <View>
      <SearchBar value={value.q} onChangeText={(q) => set({ q })} placeholder={placeholder} />
      <AppText variant="overline" color={palette.green[700]} style={{ marginTop: 14, marginBottom: 8 }}>
        Filter by medium and time
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.row}>
        <FilterChip
          label="Favorites"
          on={value.favorites}
          onPress={() => set({ favorites: !value.favorites })}
          icon={value.favorites ? <X size={13} color="#fff" /> : <Heart size={13} color={palette.rose[500]} />}
        />
        {LIBRARY_MEDIA.map((m) => {
          const I = MediaIcon[m.key];
          const on = value.media === m.key;
          return <FilterChip key={m.key} label={m.label} on={on} onPress={() => set({ media: on ? null : m.key })} icon={<I size={13} color={on ? '#fff' : palette.green[700]} />} />;
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.bleed, { marginTop: 8 }]} contentContainerStyle={styles.row}>
        {LIBRARY_DURATIONS.map((d) => (
          <FilterChip key={d.key} label={d.label} soft on={value.duration === d.key} onPress={() => set({ duration: value.duration === d.key ? null : d.key })} />
        ))}
      </ScrollView>
    </View>
  );
}

const openArticle = (a: Article) => router.push({ pathname: '/learn/[id]', params: { id: a.id } });

/** Quick Help card: text + pill on the left, photo with play / heart on the right. */
export function QuickHelpCard({ article, saved, onToggleSave }: { article: Article; saved: boolean; onToggleSave: () => void }) {
  const play = isPlayable(article);
  const MediaI = mediaOf(article) === 'audio' ? Headphones : mediaOf(article) === 'video' ? Play : FileText;
  return (
    <View style={styles.qhWrap}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${QUICK_HELP}: ${article.title}`} onPress={() => openArticle(article)} style={({ pressed }) => [styles.qh, pressed && { opacity: 0.94, transform: [{ scale: 0.99 }] }]}>
        <View style={styles.qhText}>
          <View style={styles.pill}>
            <MediaI size={11} color={brandText} />
            <AppText variant="caption" color={brandText} style={{ fontSize: 11, fontFamily: font.semibold }}>
              {isQuickHelp(article) ? QUICK_HELP : mediaLabel(article)}
            </AppText>
          </View>
          <View>
            <AppText variant="h3" numberOfLines={3} style={{ fontSize: 15, lineHeight: 20 }}>
              {article.title}
            </AppText>
            <AppText variant="caption" muted style={{ marginTop: 4 }}>
              {mediaLabel(article)} · {article.readMin} min
            </AppText>
          </View>
        </View>
        <Photo photo={article.photo} radius={20} style={styles.qhImg}>
          <LinearGradient colors={['rgba(8,45,36,0.05)', 'rgba(8,45,36,0.4)']} style={StyleSheet.absoluteFill} />
          {play ? (
            <View style={styles.playDot}>
              <Play size={14} color={palette.green[800]} fill={palette.green[800]} />
            </View>
          ) : null}
        </Photo>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Remove from favorites' : 'Add to favorites'} onPress={onToggleSave} hitSlop={8} style={[styles.heart, saved && { backgroundColor: palette.rose[50] }]}>
        <Heart size={15} color={saved ? palette.rose[500] : '#fff'} fill={saved ? palette.rose[500] : 'transparent'} />
      </Pressable>
    </View>
  );
}

/** FAQ row: photo + question opens the answer; the chevron previews the short answer inline (accordion). */
export function FaqRow({ article, saved, onToggleSave }: { article: Article; saved: boolean; onToggleSave: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.faq, open && styles.faqOpen]}>
      <View style={styles.faqTop}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Question: ${article.title}`} onPress={() => openArticle(article)} style={({ pressed }) => [styles.faqMain, pressed && { opacity: 0.9 }]}>
          <Photo photo={article.photo} radius={16} style={styles.faqImg} />
          <View style={styles.faqText}>
            <AppText variant="overline" color={palette.green[700]}>
              {article.readMin} min
            </AppText>
            <AppText variant="bodyBold" numberOfLines={3} style={{ fontSize: 14, lineHeight: 19 }}>
              {article.title}
            </AppText>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Remove from favorites' : 'Add to favorites'} onPress={onToggleSave} hitSlop={8} style={styles.faqHeart}>
          <Heart size={13} color={saved ? palette.rose[500] : '#fff'} fill={saved ? palette.rose[500] : 'transparent'} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={open ? 'Hide answer preview' : 'Show answer preview'} aria-expanded={open} onPress={() => setOpen((o) => !o)} hitSlop={6} style={styles.toggle}>
          {open ? <ChevronUp size={18} color={brandText} /> : <ChevronDown size={18} color={brandText} />}
        </Pressable>
      </View>
      {open ? (
        <View style={styles.answer}>
          <AppText variant="small" color={colors.textMuted}>
            {article.description}
          </AppText>
          <Pressable accessibilityRole="link" onPress={() => openArticle(article)} hitSlop={6} style={styles.readMore}>
            <AppText variant="smallMedium" color={palette.green[700]}>
              Read the full answer
            </AppText>
            <ChevronRight size={14} color={palette.green[700]} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -20 },
  row: { gap: 8, paddingHorizontal: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: palette.green[200], backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 14, minHeight: 38 },
  chipSoft: { backgroundColor: palette.green[50], borderColor: palette.green[50] },
  chipOn: { backgroundColor: palette.green[700], borderColor: palette.green[700] },
  qh: { flexDirection: 'row', height: 132, borderRadius: 24, padding: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  qhText: { flex: 1, padding: 8, justifyContent: 'space-between' },
  qhImg: { width: '42%', height: '100%' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: palette.green[50], borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  playDot: { position: 'absolute', left: 10, bottom: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  qhWrap: { position: 'relative' },
  heart: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(8,45,36,0.4)', alignItems: 'center', justifyContent: 'center' },
  faq: { borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100], padding: 7 },
  faqOpen: { borderColor: palette.green[200], backgroundColor: palette.green[50] },
  faqTop: { flexDirection: 'row', alignItems: 'center', gap: 6, position: 'relative' },
  faqMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76 },
  faqImg: { width: 76, height: 76 },
  faqHeart: { position: 'absolute', top: 5, left: 5, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(8,45,36,0.4)', alignItems: 'center', justifyContent: 'center' },
  faqText: { flex: 1, gap: 3, paddingVertical: 4 },
  toggle: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[100], alignItems: 'center', justifyContent: 'center' },
  answer: { paddingHorizontal: 8, paddingTop: 10, paddingBottom: 6, gap: 8 },
  readMore: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', minHeight: 32 },
});
