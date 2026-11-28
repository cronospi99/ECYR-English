/* QR as SVG / module matrix with the same lib the app uses (qrcode-generator). Pure: also used by scripts. */
import qrcode from 'qrcode-generator';

export function qrMatrix(text: string): boolean[][] {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c)));
}

/** Standalone SVG (white background, quiet zone of 4 modules). */
export function qrSvg(text: string, px = 1024, fg = '#1b0832'): string {
  const m = qrMatrix(text), n = m.length, Q = 4;
  let d = '';
  m.forEach((row, r) => row.forEach((on, c) => { if (on) d += `M${c + Q},${r + Q}h1v1h-1z`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + Q * 2} ${n + Q * 2}" width="${px}" height="${px}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="${fg}"/></svg>\n`;
}
