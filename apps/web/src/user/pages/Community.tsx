import { useMemo, useState } from 'react';
import { Ban, Flag, Heart, MessageCircle, PenLine, ShieldCheck, Users } from 'lucide-react';
import { COMMUNITY_GROUPS, timeAgo, type CommunityPost } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { Avatar } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, HScroll, Notice, PageHeader, PhaseBadge, RouteTabs, SectionTitle, Select, Textarea, useToast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { LEARN_TABS } from '@/user/layout/sectionTabs';
import { groupPhoto } from '@/user/components/wellness-ui/media';

const MIN = 3;
const MAX = 500;
const AUTHOR_TONES = ['bg-green-100 text-green-800', 'bg-rose-100 text-rose-700', 'bg-lavender-100 text-lavender-700', 'bg-sky-100 text-sky-700', 'bg-peach-100 text-peach-700', 'bg-butter-100 text-green-900'];
const toneOf = (name: string) => AUTHOR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AUTHOR_TONES.length];

/** Moderated community (SRS §64 Phase 4, mockup M49) — simulated; posts are personal experiences, not advice. */
export default function Community() {
  const { community, profile } = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const [group, setGroup] = useState<string | 'all'>('all');
  const [draftGroup, setDraftGroup] = useState(COMMUNITY_GROUPS[0]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<CommunityPost | null>(null);
  const [block, setBlock] = useState<CommunityPost | null>(null);

  const visible = useMemo(() => community.posts.filter((p) => !community.blocked.includes(p.author)), [community]);
  const posts = useMemo(() => visible.filter((p) => group === 'all' || p.group === group), [visible, group]);
  const countOf = (g: string) => visible.filter((p) => p.group === g).length;

  const submit = () => {
    const t = text.trim();
    if (t.length < MIN) return setError(`Write at least ${MIN} characters.`);
    if (t.length > MAX) return setError(`Keep it under ${MAX} characters.`);
    setError(null);
    dispatch({ type: 'ADD_POST', group: draftGroup, text: t });
    setText('');
    toast.success('Posted', 'Your post is visible to the group (demo). Moderators review reported posts.');
  };

  const pickGroup = (g: string | 'all') => {
    setGroup(g);
    if (g !== 'all') setDraftGroup(g);
  };

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Community"
          badge={<PhaseBadge phase={4} />}
          subtitle="Moderated groups to share experiences and encouragement."
          breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Learn', to: '/app/learn' }, { label: 'Community' }]}
        />
        <RouteTabs tabs={LEARN_TABS} label="Learn pages" className="!mb-0" />
      </div>

      {/* ---------- Groups ---------- */}
      <section>
        <SectionTitle eyebrow="Groups" title="Find your people" subtitle="Tap a group to filter the feed. Preview with sample posts — not real members." />
        <HScroll label="Community groups">
          <div role="group" aria-label="Filter by group" className="contents">
            <button
              type="button"
              aria-pressed={group === 'all'}
              onClick={() => pickGroup('all')}
              className={cn('bg-forest relative flex h-[168px] w-[150px] shrink-0 flex-col justify-end overflow-hidden rounded-3xl p-4 text-left text-white transition sm:w-[170px]', group === 'all' ? 'ring-4 ring-inset ring-butter-300' : 'hover:-translate-y-0.5')}
            >
              <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                <Users className="h-5 w-5" />
              </span>
              <span className="font-display text-[17px] font-semibold">All groups</span>
              <span className="text-xs text-white/75">{visible.length} posts</span>
            </button>
            {COMMUNITY_GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={group === g}
                onClick={() => pickGroup(g)}
                className={cn('group relative flex h-[168px] w-[150px] shrink-0 flex-col justify-end overflow-hidden rounded-3xl p-4 text-left text-white transition sm:w-[170px]', group === g ? 'ring-4 ring-inset ring-butter-300' : 'hover:-translate-y-0.5')}
              >
                <Photo photo={groupPhoto(g)} alt="" shape="none" className="!absolute inset-0 -z-0" imgClassName="transition duration-700 group-hover:scale-105" />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-green-950/85 via-green-950/30 to-transparent" />
                <span className="relative font-display text-[17px] font-semibold">{g}</span>
                <span className="relative text-xs text-white/80">
                  {countOf(g)} post{countOf(g) === 1 ? '' : 's'}
                </span>
              </button>
            ))}
          </div>
        </HScroll>
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          {/* ---------- Composer ---------- */}
          <Card className="card-pad">
            <div className="flex items-start gap-3">
              <Avatar name={profile.name} photoKey={profile.avatar} size={44} />
              <div className="min-w-0 flex-1 space-y-3">
                <Field label="New post" htmlFor="cm-text" error={error} hint={`${text.length}/${MAX}`}>
                  <Textarea id="cm-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Share a win, a question or a tip…" invalid={!!error} className="rounded-2xl" />
                </Field>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <Field label="Share with" htmlFor="cm-group" className="sm:w-52">
                    <Select id="cm-group" value={draftGroup} onChange={(e) => setDraftGroup(e.target.value)}>
                      {COMMUNITY_GROUPS.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </Select>
                  </Field>
                  <Button onClick={submit} leftIcon={<PenLine className="h-4 w-4" />} className="sm:mb-0.5">
                    Post
                  </Button>
                </div>
                <p className="text-xs text-ink-400">Avoid sharing personal health details you wouldn’t want others to see.</p>
              </div>
            </div>
          </Card>

          <Notice tone="info" icon={<ShieldCheck className="h-4 w-4 text-sky-500" />}>
            Posts are personal experiences, not medical advice. Be kind — this community is moderated.
          </Notice>

          {/* ---------- Feed ---------- */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-[20px] font-semibold text-ink-900">{group === 'all' ? 'Latest posts' : `${group} group`}</h2>
            <span className="font-mono text-xs text-ink-400">
              {posts.length} post{posts.length === 1 ? '' : 's'}
            </span>
          </div>
          {posts.length === 0 ? (
            <Card>
              <EmptyState icon={<Users className="h-6 w-6" />} title="No posts here yet" body="Be the first to share something with this group." />
            </Card>
          ) : (
            <ul className="space-y-4">
              {posts.map((p) => (
                <li key={p.id}>
                  <Card className={cn('card-pad', p.reported && 'bg-ink-50/70')}>
                    <div className="flex items-center gap-3">
                      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold', toneOf(p.author))}>{p.initials}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink-900">
                          {p.author} {p.mine && <span className="text-xs font-semibold text-green-700">· You</span>}
                        </p>
                        <p className="text-xs text-ink-400">{timeAgo(p.at)}</p>
                      </div>
                      <Badge tone="mint">{p.group}</Badge>
                    </div>
                    {p.reported ? (
                      <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm italic text-ink-500 ring-1 ring-inset ring-ink-100">You reported this post. It’s hidden while moderators review it.</p>
                    ) : (
                      <p className="mt-3 text-[15.5px] leading-relaxed text-ink-800">{p.text}</p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-ink-100 pt-3 text-sm">
                      <button
                        type="button"
                        aria-pressed={!!p.liked}
                        disabled={p.reported}
                        onClick={() => dispatch({ type: 'TOGGLE_LIKE_POST', id: p.id })}
                        className={cn('inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 font-semibold transition disabled:opacity-50', p.liked ? 'bg-rose-50 text-rose-600' : 'text-ink-500 hover:bg-ink-50')}
                      >
                        <Heart className={cn('h-4 w-4', p.liked && 'fill-current')} /> {p.likes}
                      </button>
                      <span className="inline-flex h-10 items-center gap-1.5 px-2 text-ink-500">
                        <MessageCircle className="h-4 w-4" /> {p.comments}
                      </span>
                      {!p.mine && !p.reported && (
                        <span className="ml-auto flex gap-1">
                          <button type="button" onClick={() => setReport(p)} className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-xs font-semibold text-ink-500 hover:bg-ink-50 hover:text-ink-800">
                            <Flag className="h-3.5 w-3.5" /> Report
                          </button>
                          <button type="button" onClick={() => setBlock(p)} className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-xs font-semibold text-ink-500 hover:bg-ink-50 hover:text-ink-800">
                            <Ban className="h-3.5 w-3.5" /> Block
                          </button>
                        </span>
                      )}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---------- Side ---------- */}
        <div className="space-y-5 xl:col-span-4">
          <div className="relative overflow-hidden rounded-3xl shadow-card">
            <Photo photo="friends-group" alt="A group of women laughing together" shape="none" className="h-48 w-full" position="50% 30%" />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-green-950/80 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-green-200">Phase 4 preview</p>
              <p className="font-display text-[18px] font-semibold leading-snug">Encouragement, not advice</p>
            </div>
          </div>
          <Card className="card-pad">
            <CardHeader title="Community guidelines" icon={<ShieldCheck className="h-5 w-5" />} />
            <ul className="space-y-2.5 text-sm text-ink-600">
              {['Share experiences, not diagnoses or treatment advice.', 'Respect privacy — never post someone else’s health details.', 'No selling, spam or medical claims.', 'Report anything unsafe; moderators review every report.'].map((x) => (
                <li key={x} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  {x}
                </li>
              ))}
            </ul>
          </Card>
          {community.blocked.length > 0 && (
            <Card className="card-pad">
              <p className="font-bold text-ink-900">Blocked</p>
              <p className="mt-1 text-sm text-ink-500">{community.blocked.join(', ')}</p>
            </Card>
          )}
          <Notice tone="safety">If you’re worried about your health or safety, contact a healthcare professional or your local emergency number.</Notice>
        </div>
      </div>

      <ConfirmDialog
        open={!!report}
        onClose={() => setReport(null)}
        title="Report this post?"
        body="Moderators will review it. It will be hidden for you straight away."
        confirmLabel="Report"
        onConfirm={() => {
          if (report) dispatch({ type: 'REPORT_POST', id: report.id });
          toast.success('Thanks for reporting', 'Our moderators will review it (simulated).');
        }}
      />
      <ConfirmDialog
        open={!!block}
        onClose={() => setBlock(null)}
        danger
        title={`Block ${block?.author}?`}
        body="You won’t see their posts anymore. They won’t be notified."
        confirmLabel="Block"
        onConfirm={() => {
          if (block) dispatch({ type: 'BLOCK_AUTHOR', author: block.author });
          toast.success('Blocked');
        }}
      />
    </div>
  );
}
