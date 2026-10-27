import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { Article } from '@healthx/shared';
import { Photo } from '@/components/media/Photo';
import { FavButton, MediumIcon } from '@/user/components/Library';
import { durationLabel, mediumOf } from '@/user/components/libraryUtils';

/** Compact magazine list row for phones: square thumbnail, topic, title, duration and a heart. */
export function ArticleRow({ article }: { article: Article }) {
  const m = mediumOf(article);
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white ring-1 ring-inset ring-ink-100 transition hover:shadow-card">
      <Link to={`/app/learn/${article.id}`} className="flex min-w-0 items-center gap-3.5 p-2.5 pr-14">
        <span className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-2xl">
          <Photo photo={article.photo} alt="" shape="none" className="h-full w-full" />
          {m !== 'article' && (
            <span aria-hidden className="absolute bottom-1.5 left-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-green-800 shadow-soft">
              <MediumIcon medium={m} className="h-3.5 w-3.5" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[10.5px] uppercase tracking-[0.1em] text-green-700">{article.topic}</span>
          <span className="mt-0.5 line-clamp-2 block font-display text-[15.5px] font-semibold leading-snug text-ink-900 group-hover:text-green-800">{article.title}</span>
          <span className="mt-1 flex items-center gap-1 text-xs text-ink-500">
            <Clock className="h-3 w-3" /> {durationLabel(article)}
          </span>
        </span>
      </Link>
      <FavButton article={article} variant="soft" className="absolute right-2.5 top-2.5 h-9 w-9" />
    </div>
  );
}
