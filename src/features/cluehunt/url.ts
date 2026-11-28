import { qrMatrix, qrSvg } from '@/lib/clueHunt/qr';

const KEY = 'hunt:baseUrl';
/** Public base URL for the join QR: host setting > VITE_PUBLIC_APP_URL > location.origin. */
export function envBase(): string { return ((import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim() || location.origin).replace(/\/+$/, ''); }
export function publicBase(): string {
  try { const v = localStorage.getItem(KEY)?.trim(); if (v) return v.replace(/\/+$/, ''); } catch { /* ignore */ }
  return envBase();
}
export function setPublicBase(v: string) { try { const c = v.trim().replace(/\/+$/, ''); if (c) localStorage.setItem(KEY, c); else localStorage.removeItem(KEY); } catch { /* ignore */ } }
export const joinUrl = (code?: string) => `${publicBase()}/hunt/join${code ? `/${code}` : ''}`;
export const shortUrl = (u: string) => u.replace(/^https?:\/\//, '');

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function downloadQrSvg(text: string, name = 'qr-join.svg') { save(new Blob([qrSvg(text)], { type: 'image/svg+xml' }), name); }
export function downloadQrPng(text: string, name = 'qr-join.png', px = 1024) {
  const m = qrMatrix(text), n = m.length, Q = 4, cell = Math.floor(px / (n + Q * 2));
  const size = cell * (n + Q * 2), cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d')!; c.fillStyle = '#fff'; c.fillRect(0, 0, size, size); c.fillStyle = '#1b0832';
  m.forEach((row, r) => row.forEach((on, k) => { if (on) c.fillRect((k + Q) * cell, (r + Q) * cell, cell, cell); }));
  cv.toBlob((b) => { if (b) save(b, name); }, 'image/png');
}
