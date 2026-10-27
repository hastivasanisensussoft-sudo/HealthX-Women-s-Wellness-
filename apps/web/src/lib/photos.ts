import type { PhotoKey } from '@healthx/shared';

// Free Unsplash-licence photos — see packages/shared/assets/photos/CREDITS.md
const files = import.meta.glob('../../../../packages/shared/assets/photos/*.jpg', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const byKey: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  const name = path.split('/').pop()!.replace('.jpg', '');
  byKey[name] = url;
}

export function photo(key: PhotoKey | undefined): string | undefined {
  if (!key) return undefined;
  return byKey[key] ?? byKey['hero-woman'];
}
