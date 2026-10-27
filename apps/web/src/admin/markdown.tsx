import type { ReactNode } from 'react';

/**
 * Minimal, XSS-safe Markdown preview for the CMS: builds React elements only
 * (never innerHTML). Supports ## headings, - lists, > quotes, **bold**, _italic_
 * and [links](https://…) with http(s) URLs only.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith('**')) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('_')) out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    else {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!;
      const href = lm[2].trim();
      out.push(
        /^https?:\/\//i.test(href) ? (
          <a key={key} href={href} target="_blank" rel="noreferrer noopener" className="font-semibold text-green-700 underline">
            {lm[1]}
          </a>
        ) : (
          <span key={key} className="text-danger" title="Only http(s) links are allowed">
            {lm[1]}
          </span>
        ),
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function MarkdownPreview({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-ink-700">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.trim() !== '');
        if (!lines.length) return null;
        // A block may mix a heading line with following lines.
        return (
          <div key={bi} className="space-y-2">
            {(() => {
              const nodes: ReactNode[] = [];
              let list: string[] = [];
              const flush = () => {
                if (list.length) {
                  nodes.push(
                    <ul key={`ul-${bi}-${nodes.length}`} className="list-disc space-y-1 pl-5 marker:text-green-600">
                      {list.map((li, k) => (
                        <li key={k}>{inline(li, `li-${bi}-${k}`)}</li>
                      ))}
                    </ul>,
                  );
                  list = [];
                }
              };
              lines.forEach((l, li) => {
                const k = `${bi}-${li}`;
                if (/^\s*[-*]\s+/.test(l)) {
                  list.push(l.replace(/^\s*[-*]\s+/, ''));
                  return;
                }
                flush();
                if (l.startsWith('## ')) nodes.push(<h3 key={k} className="pt-1 font-display text-[20px] font-semibold tracking-[-0.01em] text-ink-900">{inline(l.slice(3), k)}</h3>);
                else if (l.startsWith('# ')) nodes.push(<h2 key={k} className="pt-1 font-display text-[24px] font-semibold tracking-[-0.015em] text-ink-900">{inline(l.slice(2), k)}</h2>);
                else if (l.startsWith('> ')) nodes.push(<blockquote key={k} className="rounded-r-2xl border-l-4 border-green-300 bg-green-50/70 px-4 py-2.5 italic text-ink-600">{inline(l.slice(2), k)}</blockquote>);
                else nodes.push(<p key={k}>{inline(l, k)}</p>);
              });
              flush();
              return nodes;
            })()}
          </div>
        );
      })}
    </div>
  );
}
