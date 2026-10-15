/**
 * Printable homework: any activity in the app can describe itself as a
 * Worksheet, and this turns it into a PDF in the browser (jsPDF, no server).
 * Students get the exercises; the answer key goes on its own last page, so a
 * teacher can print with or without it.
 */
export interface Worksheet {
  title: string;
  subtitle?: string;
  level?: string;
  /** Short line under the header, e.g. what to do or where it comes from. */
  intro?: string;
  sections: WsSection[];
  /** Printed small at the end (sources, acknowledgements). */
  credits?: string;
}

export type WsSection =
  | { kind: 'text'; title?: string; paragraphs: string[] }
  | { kind: 'rules'; title?: string; rules: { h: string; body?: string; examples?: string[] }[] }
  | { kind: 'table'; title?: string; rows: string[][] }
  | { kind: 'words'; title?: string; items: { en: string; es?: string; note?: string }[] }
  | { kind: 'mc'; title: string; items: { q: string; options: string[]; answer: number }[] }
  | { kind: 'tf'; title: string; ng?: boolean; items: { q: string; answer: 'T' | 'F' | 'NG' }[] }
  | { kind: 'write'; title: string; items: { q: string; answer?: string }[]; lines?: number };

export interface PdfOptions {
  answerKey: boolean;
  /** Name / date / grade lines in the header. */
  studentFields: boolean;
  /** Who prepared it, printed in the header when given. */
  teacher?: string;
}

// jsPDF's built-in fonts speak Windows-1252: keep Spanish accents and curly
// quotes, swap the few symbols we use, drop emoji and the rest.
const SWAP: Record<string, string> = { '→': '->', '←': '<-', '✓': 'v', '✔': 'v', '✗': 'x', '…': '...', '—': '-', '–': '-', 'ɪ': 'i', '·': '·' };
function clean(s: string) {
  return String(s ?? '')
    .replace(/[→←✓✔✗…—–ɪ]/g, (c) => SWAP[c] ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff‘’“”•€]/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();
}

const INK: [number, number, number] = [28, 28, 30];
const MUTED: [number, number, number] = [110, 110, 118];
const BRAND: [number, number, number] = [47, 107, 255];
const LINE: [number, number, number] = [205, 205, 212];

export async function worksheetPdf(ws: Worksheet, opt: PdfOptions): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 46;
  const CW = W - M * 2;
  let y = 0;

  const font = (size: number, style: 'normal' | 'bold' | 'italic' = 'normal', color = INK) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const room = (h: number) => {
    if (y + h > H - 54) {
      doc.addPage();
      y = 54;
    }
  };
  const para = (text: string, size = 11, style: 'normal' | 'bold' | 'italic' = 'normal', indent = 0, color = INK, gap = 4) => {
    font(size, style, color);
    const lines = doc.splitTextToSize(clean(text), CW - indent) as string[];
    const lh = size * 1.32;
    for (const l of lines) {
      room(lh);
      doc.text(l, M + indent, y + size);
      y += lh;
    }
    y += gap;
  };
  const heading = (text: string, n?: number) => {
    room(40);
    y += 8;
    font(13, 'bold', BRAND);
    doc.text(clean(n != null ? `${n}. ${text}` : text), M, y + 13);
    y += 20;
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(1);
    doc.line(M, y, M + 36, y);
    y += 10;
  };
  const writeLines = (count: number, indent = 18) => {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.6);
    for (let i = 0; i < count; i++) {
      room(22);
      y += 20;
      doc.line(M + indent, y, M + CW, y);
    }
    y += 8;
  };

  // ---- header
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 6, 'F');
  y = 34;
  font(10, 'bold', BRAND);
  doc.text('ECYR ENGLISH', M, y);
  font(9, 'normal', MUTED);
  doc.text(clean(['Homework', ws.level, opt.teacher ? `Prof. ${opt.teacher}` : ''].filter(Boolean).join('  ·  ')), W - M, y, { align: 'right' });
  y += 14;
  para(ws.title, 20, 'bold', 0, INK, 2);
  if (ws.subtitle) para(ws.subtitle, 11, 'normal', 0, MUTED, 2);
  if (opt.studentFields) {
    y += 6;
    font(10, 'normal', MUTED);
    const cols: [string, number][] = [
      ['Name:', 0.5],
      ['Date:', 0.28],
      ['Score:', 0.22],
    ];
    let x = M;
    for (const [label, part] of cols) {
      const w = CW * part;
      doc.text(label, x, y + 10);
      doc.setDrawColor(...LINE);
      doc.line(x + doc.getTextWidth(label) + 4, y + 12, x + w - 12, y + 12);
      x += w;
    }
    y += 26;
  }
  if (ws.intro) para(ws.intro, 10.5, 'italic', 0, MUTED, 6);

  // ---- body
  const keys: { title: string; lines: string[] }[] = [];
  let n = 0;
  for (const s of ws.sections) {
    switch (s.kind) {
      case 'text':
        if (s.title) heading(s.title);
        s.paragraphs.forEach((p) => para(p, 11, 'normal', 0, INK, 7));
        break;
      case 'rules':
        if (s.title) heading(s.title);
        for (const r of s.rules) {
          para(r.h, 11.5, 'bold', 0, INK, 1);
          if (r.body) para(r.body, 10.5, 'normal', 10, INK, 2);
          r.examples?.forEach((e) => para(`•  ${e}`, 10.5, 'italic', 16, MUTED, 1));
          y += 5;
        }
        break;
      case 'table': {
        if (s.title) heading(s.title);
        const cols = Math.max(...s.rows.map((r) => r.length));
        const cw = CW / cols;
        s.rows.forEach((row, ri) => {
          font(10, ri === 0 ? 'bold' : 'normal');
          const cells = row.map((c) => doc.splitTextToSize(clean(c), cw - 10) as string[]);
          const h = Math.max(...cells.map((c) => c.length)) * 13 + 8;
          room(h);
          if (ri === 0) {
            doc.setFillColor(238, 242, 255);
            doc.rect(M, y, CW, h, 'F');
          }
          cells.forEach((c, ci) => doc.text(c, M + ci * cw + 5, y + 14));
          doc.setDrawColor(...LINE);
          doc.line(M, y + h, M + CW, y + h);
          y += h;
        });
        y += 10;
        break;
      }
      case 'words': {
        if (s.title) heading(s.title);
        const half = CW / 2;
        for (let i = 0; i < s.items.length; i += 2) {
          room(30);
          const top = y;
          let bottom = y;
          s.items.slice(i, i + 2).forEach((it, k) => {
            y = top;
            font(10.5, 'bold');
            const x = M + k * half;
            doc.text(clean(it.en), x, y + 11);
            if (it.es) {
              font(10, 'normal', MUTED);
              doc.text(clean(it.es), x + doc.getTextWidth(clean(it.en)) + 14, y + 11);
            }
            y += 14;
            if (it.note) {
              font(9.5, 'italic', MUTED);
              const l = doc.splitTextToSize(clean(it.note), half - 14) as string[];
              doc.text(l, x, y + 9);
              y += l.length * 12;
            }
            bottom = Math.max(bottom, y + 4);
          });
          y = bottom;
        }
        y += 6;
        break;
      }
      case 'mc': {
        heading(s.title, ++n);
        const key: string[] = [];
        s.items.forEach((it, i) => {
          room(40);
          para(`${i + 1}.  ${it.q}`, 11, 'normal', 0, INK, 1);
          const opts = it.options.map((o, k) => `${'abcdef'[k]}) ${clean(o)}`);
          const inline = opts.join('      ');
          font(10.5);
          if (doc.getTextWidth(inline) < CW - 24) para(inline, 10.5, 'normal', 18, MUTED, 6);
          else opts.forEach((o) => para(o, 10.5, 'normal', 18, MUTED, 1));
          key.push(`${i + 1}. ${'abcdef'[it.answer]}) ${it.options[it.answer]}`);
        });
        keys.push({ title: `${n}. ${s.title}`, lines: key });
        break;
      }
      case 'tf': {
        heading(s.title, ++n);
        para(s.ng ? 'Write T (true), F (false) or NG (not given).' : 'Write T (true) or F (false).', 10, 'italic', 0, MUTED, 4);
        s.items.forEach((it, i) => para(`${i + 1}.  ${it.q}     ______`, 11, 'normal', 0, INK, 5));
        keys.push({ title: `${n}. ${s.title}`, lines: s.items.map((it, i) => `${i + 1}. ${it.answer}`) });
        break;
      }
      case 'write': {
        heading(s.title, ++n);
        s.items.forEach((it, i) => {
          para(`${i + 1}.  ${it.q}`, 11, 'normal', 0, INK, 0);
          writeLines(s.lines ?? 1);
        });
        const lines = s.items.filter((it) => it.answer).map((it) => `${s.items.indexOf(it) + 1}. ${it.answer}`);
        if (lines.length) keys.push({ title: `${n}. ${s.title}`, lines });
        break;
      }
    }
  }

  if (ws.credits) {
    y += 10;
    para(ws.credits, 8.5, 'italic', 0, MUTED, 0);
  }

  // ---- answer key on its own page
  if (opt.answerKey && keys.length) {
    doc.addPage();
    y = 50;
    font(10, 'bold', BRAND);
    doc.text('ECYR ENGLISH · ANSWER KEY', M, y);
    y += 10;
    para(ws.title, 15, 'bold', 0, INK, 8);
    for (const k of keys) {
      para(k.title, 11, 'bold', 0, INK, 2);
      k.lines.forEach((l) => para(l, 10, 'normal', 12, INK, 0));
      y += 8;
    }
  }

  // ---- footers
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    font(8.5, 'normal', MUTED);
    doc.text('ECYR English · ecyr-english', M, H - 26);
    doc.text(`${p} / ${pages}`, W - M, H - 26, { align: 'right' });
  }
  return doc.output('blob');
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const fileName = (title: string) =>
  `${title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'tarea'}.pdf`;
