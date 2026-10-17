import { Fragment, type ReactNode } from 'react';

/**
 * Renders the light inline markup used by the bundled course data (b, strong,
 * i, em, u, s, code, br, span.highlight) as React elements. Anything else is
 * reduced to its text, so no HTML is ever injected.
 */
const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'CODE', 'BR', 'SPAN', 'SUP', 'SUB']);

function toReact(node: Node, key: number): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  const children = [...el.childNodes].map((c, i) => toReact(c, i));
  if (!ALLOWED.has(el.tagName)) return <Fragment key={key}>{children}</Fragment>;
  switch (el.tagName) {
    case 'BR':
      return <br key={key} />;
    case 'B':
    case 'STRONG':
      return <strong key={key} className="font-semibold">{children}</strong>;
    case 'I':
    case 'EM':
      return <em key={key}>{children}</em>;
    case 'U':
      return <u key={key}>{children}</u>;
    case 'S':
      return <s key={key}>{children}</s>;
    case 'SUP':
      return <sup key={key}>{children}</sup>;
    case 'SUB':
      return <sub key={key}>{children}</sub>;
    case 'CODE':
      return <code key={key} className="bg-fill rounded px-1 text-[0.92em]">{children}</code>;
    default: // SPAN
      return el.classList.contains('highlight') ? (
        <mark key={key} className="rounded bg-[color-mix(in_srgb,var(--yellow)_35%,transparent)] px-0.5 text-inherit">{children}</mark>
      ) : (
        <span key={key} className="text-ink-blue font-semibold">{children}</span>
      );
  }
}

const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;

export function RichText({ html, className }: { html: string; className?: string }) {
  if (!parser || !/[<&]/.test(html)) return <span className={className}>{html}</span>;
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  return <span className={className}>{[...doc.body.childNodes].map((n, i) => toReact(n, i))}</span>;
}

/** Plain text version (for speech synthesis, search, aria labels). */
export const stripTags = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
