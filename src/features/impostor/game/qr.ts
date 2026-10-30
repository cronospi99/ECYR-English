import qrcode from "qrcode-generator";

/* QR code as an SVG data URL (crisp at any size), drawn with the app's qrcode-generator. */
export function qrDataUrl(text: string, dark: string, light: string, margin = 1): string {
  try {
    const q = qrcode(0, "M");
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c},${r}h1v1h-1z`;
    const s = n + margin * 2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-margin} ${-margin} ${s} ${s}" shape-rendering="crispEdges"><rect x="${-margin}" y="${-margin}" width="${s}" height="${s}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  } catch {
    return "";
  }
}
