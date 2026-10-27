/** Published CMS content → the app's Article shape. Only `published` items ever leave the server. */
import { ARTICLES, CONTENT_CATEGORIES, type Article, type ContentCategory, type PhotoKey } from '@healthx/shared';
import type { ContentItem } from '@healthx/shared/admin';
import { publishDue } from './contentWorkflow';
import type { Store } from './store';

const PHOTO_BY_CATEGORY: Record<string, PhotoKey> = {
  cycle: 'journaling',
  fitness: 'stretching',
  nutrition: 'healthy-food',
  mental_wellness: 'meditation',
  life_stages: 'mature-woman',
  skin: 'south-asian-woman',
};
const BUILT_IN = new Set(CONTENT_CATEGORIES.map((c) => c.key));

function toArticle(c: ContentItem): Article {
  const seeded = ARTICLES.find((a) => a.id === c.id);
  const words = c.body.split(/\s+/).filter(Boolean).length;
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    category: (BUILT_IN.has(c.category as ContentCategory) ? c.category : 'cycle') as ContentCategory,
    topic: c.topic ?? seeded?.topic ?? 'General',
    lifeStage: c.lifeStage,
    type: c.type,
    readMin: c.durationMin ?? Math.max(1, Math.round(words / 200)),
    author: c.author,
    reviewer: c.medicalReviewer,
    reviewDate: c.reviewDate ?? c.updatedDate,
    publishedAt: c.publishedDate ?? c.updatedDate,
    updatedAt: c.updatedDate,
    version: c.version,
    status: 'published',
    language: c.language,
    references: c.references,
    photo: seeded?.photo ?? PHOTO_BY_CATEGORY[c.category] ?? 'journaling',
    body: c.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
    tags: c.tags,
  };
}

export function publishedArticles(store: Store): Article[] {
  publishDue(store);
  return store.admin.content.filter((c) => c.status === 'published').map(toArticle);
}

/** Ids of the articles app users may currently reference (bookmark, mark as read). */
export function publishedIds(store: Store): Set<string> {
  publishDue(store);
  return new Set(store.admin.content.filter((c) => c.status === 'published').map((c) => c.id));
}
