import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, FileAudio, FileImage, FileVideo, HardDrive, ImageOff, LayoutGrid, Link2, Music2, Play, Trash2, Upload, X } from 'lucide-react';
import { timeAgo, type PhotoKey } from '@healthx/shared';
import { BackendBadge, Badge, Button, Card, CardSkeleton, ConfirmDialog, EmptyState, Field, Input, Notice, ProgressBar, SearchInput, useToast } from '@/components/ui';
import { Photo } from '@/components/media/Photo';
import { cn, useDemoLoading } from '@/lib/utils';
import { MEDIA_UPLOAD_RULES, mediaKindOf, type MediaAsset, type MediaKind } from '../adminData';
import { useAccess, useAdmin } from '../adminState';
import { AdminHeader, ReadOnlyBanner } from '../components';
import { formatBytes, formatDateTime } from '../helpers';

type Filter = 'all' | MediaKind;
const KIND_ICON: Record<MediaKind, typeof FileImage> = { image: FileImage, audio: FileAudio, video: FileVideo };
const KIND_LABEL: Record<MediaKind, string> = { image: 'Image', audio: 'Audio', video: 'Video' };
const KIND_TONE: Record<MediaKind, { tile: string; chip: string }> = {
  image: { tile: 'from-green-100 to-green-50 text-green-700', chip: 'bg-green-100 text-green-800' },
  video: { tile: 'from-sky-100 to-sky-50 text-sky-700', chip: 'bg-sky-100 text-sky-700' },
  audio: { tile: 'from-lavender-100 to-lavender-50 text-lavender-700', chip: 'bg-lavender-100 text-lavender-700' },
};
const ACCEPT = Object.values(MEDIA_UPLOAD_RULES).flatMap((r) => r.types).join(',');

/** Library photos that stand in as previews for demo files (presentation only — the asset records are unchanged). */
const PHOTO_KEYS: PhotoKey[] = [
  'hero-woman', 'woman-tea', 'yoga-home', 'healthy-food', 'water', 'sleep', 'journaling', 'meditation', 'walking-outdoors', 'mature-woman', 'senior-woman-active', 'pregnant-woman',
  'friends-group', 'doctor-consult', 'strength-training', 'stretching', 'nutrition-bowl', 'south-asian-woman', 'cozy-comfort', 'portrait-curly', 'portrait-indian', 'woman-running',
  'pilates-mat', 'fresh-fruit', 'herbal-tea', 'woman-reading', 'period-comfort', 'friends-yoga', 'nature-leaves',
];
const PREVIEW_HINTS: [RegExp, PhotoKey][] = [
  [/cycle|period/, 'period-comfort'],
  [/plate|meal|food|nutrition/, 'nutrition-bowl'],
  [/breath|sitali|calm/, 'meditation'],
  [/sleep/, 'sleep'],
  [/mobility|stretch/, 'stretching'],
  [/strength/, 'strength-training'],
  [/tension|yoga/, 'yoga-home'],
  [/hormone|faq/, 'woman-reading'],
  [/spring|banner/, 'nature-leaves'],
];

function previewOf(name: string): PhotoKey | undefined {
  const stem = name.toLowerCase().replace(/\.\w+$/, '');
  const direct = PHOTO_KEYS.find((k) => k === stem);
  return direct ?? PREVIEW_HINTS.find(([re]) => re.test(stem))?.[1];
}

function Thumb({ asset, className, large }: { asset: MediaAsset; className?: string; large?: boolean }) {
  const key = previewOf(asset.name);
  const I = asset.kind === 'audio' ? Music2 : asset.kind === 'video' ? Play : FileImage;
  const overlay =
    asset.kind !== 'image' ? (
      <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-green-950/60 via-green-950/10 to-transparent">
        <span className={cn('flex items-center justify-center rounded-full bg-white/90 text-green-800 shadow-lift', large ? 'h-14 w-14' : 'h-10 w-10')}>
          <I className={cn(large ? 'h-6 w-6' : 'h-4 w-4', asset.kind === 'video' && 'translate-x-px fill-current')} />
        </span>
      </span>
    ) : null;
  if (key)
    return (
      <Photo photo={key} alt="" shape="none" className={className} imgClassName="transition duration-500 group-hover:scale-[1.04]">
        {overlay}
      </Photo>
    );
  return (
    <div className={cn('relative flex items-center justify-center bg-gradient-to-br', KIND_TONE[asset.kind].tile, className)}>
      <span aria-hidden className="leaf absolute right-[14%] top-[14%] h-8 w-8 bg-white/60" />
      <span className={cn('relative flex items-center justify-center rounded-full bg-white shadow-soft', large ? 'h-14 w-14' : 'h-11 w-11')}>
        <I className={large ? 'h-6 w-6' : 'h-5 w-5'} />
      </span>
    </div>
  );
}

/** Media library (§39): images, audio and video used by content. Uploads are simulated and validated. */
export default function MediaLibrary() {
  const { state, dispatch, audit, apiMode } = useAdmin();
  const { can, session } = useAccess();
  const toast = useToast();
  const loading = useDemoLoading(350);
  const canEdit = can('edit_content');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(state.media[0]?.id ?? null);
  const [uploads, setUploads] = useState<{ name: string; progress: number }[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [alt, setAlt] = useState<{ id: string; text: string } | null>(null);

  const usage = useMemo(() => {
    const m = new Map<string, { id: string; title: string }[]>();
    state.content.forEach((c) => {
      if (c.media) m.set(c.media.name, [...(m.get(c.media.name) ?? []), { id: c.id, title: c.title }]);
    });
    return m;
  }, [state.content]);

  const items = state.media.filter((m) => (filter === 'all' || m.kind === filter) && m.name.toLowerCase().includes(q.trim().toLowerCase()));
  const selected = state.media.find((m) => m.id === selectedId) ?? null;
  const usedIn = selected ? usage.get(selected.name) ?? [] : [];
  const altText = alt && selected && alt.id === selected.id ? alt.text : selected?.alt ?? '';
  const count = (k: MediaKind) => state.media.filter((m) => m.kind === k).length;
  const totalSize = state.media.reduce((a, m) => a + m.size, 0);
  const unused = state.media.filter((m) => !usage.get(m.name)?.length).length;

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const errs: string[] = [];
    Array.from(files).forEach((f) => {
      const kind = mediaKindOf(f.type);
      const rule = MEDIA_UPLOAD_RULES[kind];
      if (!rule.types.includes(f.type)) return errs.push(`${f.name}: unsupported type (${f.type || 'unknown'}). Allowed: images, MP3/M4A audio, MP4/WebM video.`);
      if (f.size > rule.max) return errs.push(`${f.name}: ${formatBytes(f.size)} is over the ${formatBytes(rule.max)} limit for ${KIND_LABEL[kind].toLowerCase()} files.`);
      if (state.media.some((m) => m.name === f.name)) return errs.push(`${f.name}: a file with this name already exists.`);
      setUploads((u) => [...u, { name: f.name, progress: 0 }]);
      let p = 0;
      const t = window.setInterval(() => {
        p += 25;
        setUploads((u) => u.map((x) => (x.name === f.name ? { ...x, progress: p } : x)));
        if (p >= 100) {
          window.clearInterval(t);
          setUploads((u) => u.filter((x) => x.name !== f.name));
          const asset: MediaAsset = { id: `md_${Date.now().toString(36)}`, name: f.name, kind, mime: f.type, size: f.size, uploadedAt: new Date().toISOString(), uploadedBy: session!.name };
          void dispatch({ type: 'ADD_MEDIA', asset }).then((ok) => {
            if (!ok) return;
            setSelectedId(asset.id);
            // The API stores the file's details; file storage itself isn't connected yet.
            if (apiMode) toast.success('Added to the library', `${f.name} — details saved; file storage isn’t connected yet.`);
            else toast.success('Uploaded (simulated)', f.name);
          });
          audit('media.upload', f.name, `${KIND_LABEL[kind]} · ${formatBytes(f.size)}`);
        }
      }, 200);
      return undefined;
    });
    setErrors(errs);
  };

  const filters: { value: Filter; label: string; icon: typeof FileImage; n: number }[] = [
    { value: 'all', label: 'All', icon: LayoutGrid, n: state.media.length },
    { value: 'image', label: 'Images', icon: FileImage, n: count('image') },
    { value: 'video', label: 'Video', icon: FileVideo, n: count('video') },
    { value: 'audio', label: 'Audio', icon: FileAudio, n: count('audio') },
  ];

  return (
    <>
      <AdminHeader
        title="Media library"
        subtitle="Images, audio and video used in the Learn library (§39). Files are type-checked and size-limited on upload."
        badge={<Badge tone="gray">{state.media.length} files</Badge>}
        actions={
          canEdit && (
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-green-700 px-5 text-[15px] font-semibold text-white shadow-soft transition hover:-translate-y-px hover:bg-green-800 focus-within:ring-4 focus-within:ring-green-500/30">
              <Upload className="h-4 w-4" /> Upload files
              <input type="file" multiple accept={ACCEPT} className="sr-only" aria-label="Upload media files" onChange={(e) => (onFiles(e.target.files), (e.target.value = ''))} />
            </label>
          )
        }
      />
      {!canEdit && <ReadOnlyBanner>Read-only: uploading and deleting media needs the Content Manager or Admin role.</ReadOnlyBanner>}

      <section className="relative mb-6 overflow-hidden rounded-[28px] bg-wash p-4 ring-1 ring-inset ring-green-100 sm:p-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { k: 'Images', v: count('image'), icon: FileImage, tone: 'text-green-700' },
            { k: 'Video', v: count('video'), icon: FileVideo, tone: 'text-sky-600' },
            { k: 'Audio', v: count('audio'), icon: FileAudio, tone: 'text-lavender-600' },
            { k: 'Stored', v: formatBytes(totalSize), icon: HardDrive, tone: 'text-peach-600', hint: `${unused} unused` },
          ].map((s) => (
            <div key={s.k} className="flex items-center gap-3 rounded-2xl bg-white/80 px-3.5 py-3 shadow-xs ring-1 ring-inset ring-white">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-soft sm:h-10 sm:w-10', s.tone)}>
                <s.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">{s.k}</p>
                <p className="num whitespace-nowrap text-[18px] leading-tight text-ink-900 sm:text-[20px]">{s.v}</p>
                {s.hint && <p className="text-xs font-medium text-ink-500">{s.hint}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {(uploads.length > 0 || errors.length > 0) && (
        <Card className="card-pad mb-5 space-y-3">
          {uploads.map((u) => (
            <div key={u.name} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                <Upload className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="mb-1 truncate text-sm font-semibold text-ink-700">Uploading {u.name}…</p>
                <ProgressBar value={u.progress / 100} label={`Upload progress for ${u.name}`} />
              </div>
            </div>
          ))}
          {errors.map((e) => (
            <p key={e} role="alert" className="flex items-start justify-between gap-2 rounded-2xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
              {e}
              <button aria-label="Dismiss" onClick={() => setErrors((x) => x.filter((y) => y !== e))} className="shrink-0 rounded-full p-0.5 hover:bg-white/60">
                <X className="h-3.5 w-3.5" />
              </button>
            </p>
          ))}
        </Card>
      )}

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="radiogroup" aria-label="File type" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto p-1">
          {filters.map((f) => (
            <button key={f.value} type="button" role="radio" aria-checked={filter === f.value} onClick={() => setFilter(f.value)} className={cn('pill-tab', filter === f.value ? 'pill-tab-on' : 'pill-tab-off')}>
              <f.icon className="h-4 w-4" />
              {f.label}
              <span className={cn('rounded-full px-1.5 text-xs font-bold', filter === f.value ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-500')}>{f.n}</span>
            </button>
          ))}
        </div>
        <SearchInput value={q} onChange={setQ} placeholder="Search files…" className="lg:w-72" />
      </div>

      {loading ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="card overflow-hidden" aria-hidden>
                <div className="skeleton aspect-[16/11] rounded-none" />
                <div className="space-y-2 p-3">
                  <div className="skeleton h-3 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
          <CardSkeleton lines={6} />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          {items.length === 0 ? (
            <Card>
              <EmptyState icon={<ImageOff className="h-6 w-6" />} title="No files match" body="Try another filter or upload a file." />
            </Card>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4" aria-label="Media files">
              {items.map((m) => {
                const n = usage.get(m.name)?.length ?? 0;
                const I = KIND_ICON[m.kind];
                const on = selectedId === m.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(m.id)}
                      aria-pressed={on}
                      className={cn('group block w-full overflow-hidden rounded-2xl border bg-white text-left shadow-xs transition hover:-translate-y-0.5 hover:shadow-card', on ? 'border-green-500 ring-2 ring-green-500' : 'border-ink-100')}
                    >
                      <span className="relative block">
                        <Thumb asset={m} className="aspect-[16/11] w-full" />
                        {m.duration && <span className="absolute bottom-2 right-2 rounded-full bg-green-950/70 px-2 py-0.5 font-mono text-[10.5px] text-white">{m.duration}</span>}
                      </span>
                      <span className="block p-3">
                        <span className="block truncate text-[13.5px] font-semibold text-ink-900">{m.name}</span>
                        <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-500">
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold', KIND_TONE[m.kind].chip)}>
                            <I className="h-3 w-3" /> {KIND_LABEL[m.kind]}
                          </span>
                          <span className="truncate">{m.duration ?? formatBytes(m.size)}</span>
                        </span>
                        <span className={cn('mt-2 flex items-center gap-1 text-[11.5px] font-semibold', n ? 'text-green-700' : 'text-ink-400')}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', n ? 'bg-green-500' : 'bg-ink-300')} />
                          {n ? `Used in ${n}` : 'Unused'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {canEdit && (
                <li>
                  <label className="flex h-full min-h-[190px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-green-300 bg-green-50/60 p-4 text-center text-sm font-semibold text-green-800 transition hover:border-green-400 hover:bg-green-50">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-green-700 shadow-soft">
                      <Upload className="h-5 w-5" />
                    </span>
                    Drop files or click
                    <span className="text-[11.5px] font-medium text-ink-500">Images 5 MB · audio 50 MB · video 200 MB</span>
                    <input type="file" multiple accept={ACCEPT} className="sr-only" aria-label="Upload more media files" onChange={(e) => (onFiles(e.target.files), (e.target.value = ''))} />
                  </label>
                </li>
              )}
            </ul>
          )}

          <Card className="h-fit overflow-hidden xl:sticky xl:top-28">
            {!selected ? (
              <EmptyState icon={<FileImage className="h-6 w-6" />} title="Select a file" body="Details and usage appear here." />
            ) : (
              <>
                <Thumb asset={selected} large className="aspect-[16/10] w-full" />
                <div className="card-pad">
                  <p className="eyebrow mb-1.5">{KIND_LABEL[selected.kind]} · details</p>
                  <h2 className="break-all font-display text-[19px] font-semibold leading-snug text-ink-900">{selected.name}</h2>
                  <p className="mt-0.5 font-mono text-[11.5px] text-ink-500">{selected.mime}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    {[
                      ['Size', formatBytes(selected.size)],
                      ...(selected.duration ? [['Duration', selected.duration]] : []),
                      ['Uploaded', `${timeAgo(selected.uploadedAt)} · ${formatDateTime(selected.uploadedAt)}`],
                      ['Uploaded by', selected.uploadedBy],
                    ].map(([k, v]) => (
                      <div key={k} className={cn('rounded-xl bg-ink-50/80 px-3 py-2', k === 'Uploaded' && 'col-span-2')}>
                        <dt className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-ink-400">{k}</dt>
                        <dd className="mt-0.5 font-semibold text-ink-800">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  {selected.kind === 'image' && (
                    <div className="mt-5">
                      <Field label="Alt text" htmlFor="md-alt" hint="Describes the image for screen-reader users (accessibility, §57).">
                        <Input id="md-alt" value={altText} disabled={!canEdit} onChange={(e) => setAlt({ id: selected.id, text: e.target.value })} />
                      </Field>
                      {canEdit && alt?.id === selected.id && alt.text !== (selected.alt ?? '') && (
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            if (alt.text.trim().length < 5) return toast.error('Alt text is too short', 'Describe what the image shows (5+ characters).');
                            void dispatch({ type: 'UPDATE_MEDIA', id: selected.id, patch: { alt: alt.text.trim() } }).then((ok) => {
                              if (!ok) return;
                              setAlt(null);
                              toast.success('Alt text saved');
                            });
                            audit('media.alt_text', selected.name);
                          }}
                        >
                          Save alt text
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="mt-5">
                    <p className="eyebrow mb-2">
                      <Link2 className="h-3.5 w-3.5" /> Used in {usedIn.length}
                    </p>
                    {usedIn.length === 0 ? (
                      <p className="rounded-xl bg-ink-50/80 px-3 py-2.5 text-sm text-ink-500">Not used by any content.</p>
                    ) : (
                      <ul className="space-y-1.5 text-sm">
                        {usedIn.map((c) => (
                          <li key={c.id}>
                            <Link to={`/admin/content/${c.id}`} className="block truncate rounded-xl bg-green-50 px-3 py-2 font-semibold text-green-800 hover:bg-green-100">
                              {c.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Copy className="h-4 w-4" />}
                      onClick={() => {
                        void navigator.clipboard?.writeText(`https://media.healthx.example/signed/${selected.id}?expires=3600`).catch(() => undefined);
                        toast.info('Signed link copied (simulated)', 'Links expire after 1 hour.');
                      }}
                    >
                      Copy signed link
                    </Button>
                    {canEdit && (
                      <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft" leftIcon={<Trash2 className="h-4 w-4" />} disabled={usedIn.length > 0} onClick={() => setConfirmDelete(true)}>
                        Delete
                      </Button>
                    )}
                  </div>
                  {canEdit && usedIn.length > 0 && <p className="mt-2 text-xs text-ink-500">Remove it from the content above before deleting.</p>}
                  <BackendBadge className="mt-4" label="Storage simulated" />
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      <Notice tone="info" className="mt-6">
        In production files are stored privately (S3-compatible), virus-scanned and served with short-lived signed URLs (§47). Uploads here are simulated.
      </Notice>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (!selected) return;
          const { id, name } = selected;
          void dispatch({ type: 'DELETE_MEDIA', id }).then((ok) => {
            if (!ok) return;
            toast.success('File deleted', name);
            setSelectedId(null);
          });
          audit('media.delete', name);
        }}
        title="Delete this file?"
        body={`“${selected?.name}” will be removed from the media library.`}
        confirmLabel="Delete"
        danger
      />
    </>
  );
}
