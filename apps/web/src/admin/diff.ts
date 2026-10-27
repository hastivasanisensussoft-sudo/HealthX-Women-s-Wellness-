/** Word-level diff (LCS) for the content version history. Whitespace is kept so text reflows naturally. */
export type DiffPart = { kind: 'same' | 'del' | 'ins'; text: string };

export function wordDiff(before: string, after: string): DiffPart[] {
  const a = before.split(/(\s+)/).filter(Boolean);
  const b = after.split(/(\s+)/).filter(Boolean);
  const n = a.length;
  const m = b.length;
  // LCS lengths from the end, as a flat Uint16 table (bodies are a few hundred tokens).
  const w = m + 1;
  const dp = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i * w + j] = a[i] === b[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
  const out: DiffPart[] = [];
  const push = (kind: DiffPart['kind'], text: string) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push('same', a[i]);
      i++;
      j++;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) push('del', a[i++]);
    else push('ins', b[j++]);
  }
  while (i < n) push('del', a[i++]);
  while (j < m) push('ins', b[j++]);
  return out;
}

export const hasChanges = (parts: DiffPart[]) => parts.some((p) => p.kind !== 'same' && p.text.trim() !== '');
