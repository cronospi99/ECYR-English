/**
 * /api/tts — natural neural voices for ECYR English (Vercel Serverless Function, Node).
 *
 * Two steps, so audio is generated once and then served from Vercel's CDN to everyone:
 *
 *   POST /api/tts   Authorization: Bearer <Supabase access token>
 *                   { items: [{ t: text, v: voice, r?: rate %, p?: pitch Hz }] }
 *                   → { sigs: string[] }      (one signature per chunk; signed-in users only)
 *
 *   GET  /api/tts?v=<voice>&r=<rate>&p=<pitch>&t=<text>&s=<sig>
 *                   → audio/mpeg, cached by the CDN for a year (same URL = same audio)
 *
 * A GET whose URL is already in the CDN cache never reaches this function. A new
 * one needs a valid signature, and only a signed-in user can get one, so the
 * endpoint is not a free public TTS API. Texts are synthesised in chunks of up
 * to ~1,000 characters (the client splits long texts and plays them back to
 * back), so even a 7-minute reading never runs into the function's time limit.
 *
 * Voices come from Microsoft Edge's "Read aloud" service. It is not an official
 * API: if it fails, the app falls back to the device's voice by itself.
 *
 * ENV (Vercel → Settings → Environment Variables)
 *   TTS_SIGNING_SECRET   required — any long random string (e.g. `openssl rand -hex 32`).
 *                        It is NOT a Supabase key; never use the service_role key here.
 *   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY   already set for the app (public values).
 *   EDGE_TTS_VERSION     optional — browser version the voice service expects.
 *   EDGE_TTS_FORMAT      optional — default audio-24khz-48kbitrate-mono-mp3.
 *   EDGE_TTS_MODE        optional — "auto" (default: Edge read-aloud WebSocket, then
 *                        the Azure REST path if Microsoft refuses this server), "rest" or "ws".
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import WebSocket from 'ws';

// ===================================================================== voice service

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WSS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
/**
 * The browser version the service expects in Sec-MS-GEC-Version and the
 * User-Agent. Microsoft rotates what it accepts, so on a refused handshake the
 * next one is tried, and the one that worked is kept for this instance.
 * EDGE_TTS_VERSION (Vercel env) goes first when set.
 */
const VERSIONS = [...new Set([process.env.EDGE_TTS_VERSION, '143.0.3650.75', '140.0.3485.14', '135.0.3179.54', '130.0.2849.68'].filter((v): v is string => !!v))];
let goodVersion: string | null = null;
const OUTPUT_FORMAT = process.env.EDGE_TTS_FORMAT || 'audio-24khz-48kbitrate-mono-mp3';
const WIN_EPOCH = 11644473600;

export class EdgeTtsError extends Error {
  code: 'handshake' | 'no_audio' | 'timeout' | 'network';
  constructor(message: string, code: EdgeTtsError['code']) {
    super(message);
    this.code = code;
  }
}

/** Seconds to add to our clock, learned from the server's Date header after a 403. */
let clockSkew = 0;

/** The rolling "Sec-MS-GEC" token: SHA-256 of the 5-minute Windows-epoch tick + the client token. */
export function secMsGec(nowSec = Date.now() / 1000 + clockSkew): string {
  let ticks = Math.floor(nowSec + WIN_EPOCH);
  ticks -= ticks % 300;
  return createHash('sha256')
    .update(`${BigInt(ticks) * 10_000_000n}${TRUSTED_CLIENT_TOKEN}`, 'ascii')
    .digest('hex')
    .toUpperCase();
}

/** "en-US-AvaNeural" → "Microsoft Server Speech Text to Speech Voice (en-US, AvaNeural)". */
export function longVoiceName(short: string): string {
  const m = /^([a-z]{2,3}-[A-Z]{2,4})-([A-Za-z]+Neural)$/.exec(short);
  return m ? `Microsoft Server Speech Text to Speech Voice (${m[1]}, ${m[2]})` : short;
}

export const escapeXml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

/** "Sat Oct 17 2026 10:00:00 GMT+0000 (Coordinated Universal Time)", as the service expects. */
const timestamp = () => new Date().toUTCString().replace(/^(\w+), (\d+) (\w+) (\d+) (.+) GMT$/, '$1 $3 $2 $4 $5 GMT+0000 (Coordinated Universal Time)');

export interface SynthOptions {
  voice: string;
  /** Percent change, e.g. -10 for 10 % slower. */
  rate?: number;
  /** Hz change. */
  pitch?: number;
  timeoutMs?: number;
}

export function ssml(text: string, o: SynthOptions, shortName = false): string {
  const lang = /^([a-z]{2,3}-[A-Z]{2,4})/.exec(o.voice)?.[1] ?? 'en-US';
  const sign = (n: number) => (n >= 0 ? '+' : '');
  const rate = Math.round(o.rate ?? 0);
  const pitch = Math.round(o.pitch ?? 0);
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>` +
    `<voice name='${shortName ? o.voice : longVoiceName(o.voice)}'><prosody pitch='${sign(pitch)}${pitch}Hz' rate='${sign(rate)}${rate}%' volume='+0%'>` +
    `${escapeXml(text)}</prosody></voice></speak>`
  );
}

/** Binary frames start with a 2-byte big-endian header length; the audio follows the headers. */
export function parseBinary(buf: Buffer): { path: string; audio: Buffer | null } {
  if (buf.length < 2) return { path: '', audio: null };
  const headLen = buf.readUInt16BE(0);
  const head = buf.subarray(2, 2 + headLen).toString('utf8');
  const path = /Path:\s*([^\r\n]+)/i.exec(head)?.[1]?.trim() ?? '';
  const audio = buf.subarray(2 + headLen);
  return { path, audio: /Content-Type:\s*audio/i.test(head) && audio.length ? audio : null };
}

/** Overridable in tests. */
export const transport = {
  url: (version: string) =>
    `${WSS_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec()}` +
    `&Sec-MS-GEC-Version=1-${version}&ConnectionId=${randomUUID().replace(/-/g, '')}`,
};

function connect(version: string, cookie: boolean): WebSocket {
  const major = version.split('.')[0];
  const headers: Record<string, string> = {
    Pragma: 'no-cache',
    'Cache-Control': 'no-cache',
    Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36 Edg/${major}.0.0.0`,
  };
  if (cookie) headers.Cookie = `muid=${randomBytes(16).toString('hex').toUpperCase()};`;
  return new WebSocket(transport.url(version), { headers });
}

function synthOnce(text: string, o: SynthOptions, version: string, cookie = true): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ws = connect(version, cookie);
    const parts: Buffer[] = [];
    let done = false;
    const finish = (err: Error | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        ws.terminate();
      } catch {
        /* already closed */
      }
      if (err) reject(err);
      else if (!parts.length) reject(new EdgeTtsError('The voice service returned no audio.', 'no_audio'));
      else resolve(Buffer.concat(parts));
    };
    const timer = setTimeout(() => finish(new EdgeTtsError('The voice service took too long.', 'timeout')), o.timeoutMs ?? 25_000);

    ws.on('unexpected-response', (_req, res) => {
      // A 403 can be our clock being off for the Sec-MS-GEC token: learn the skew for the retry.
      const date = res.headers.date ? Date.parse(res.headers.date) : NaN;
      if (res.statusCode === 403 && !Number.isNaN(date)) clockSkew = (date - Date.now()) / 1000;
      const err = new EdgeTtsError(`HTTP ${res.statusCode} (v${version}${cookie ? '' : ', no cookie'})`, 'handshake');
      let body = '';
      res.on('data', (c: Buffer) => (body += c.toString('utf8').slice(0, 300)));
      res.on('end', () => {
        if (body) err.message += ` ${body.replace(/\s+/g, ' ').slice(0, 200)}`;
        finish(err);
      });
      res.on('error', () => finish(err));
      setTimeout(() => finish(err), 1500);
    });
    ws.on('error', (e) => finish(new EdgeTtsError(e.message || 'Network error.', 'network')));
    ws.on('open', () => {
      ws.send(
        `X-Timestamp:${timestamp()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"${OUTPUT_FORMAT}"}}}}\r\n`,
      );
      ws.send(`X-RequestId:${randomUUID().replace(/-/g, '')}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp()}Z\r\nPath:ssml\r\n\r\n${ssml(text, o)}`);
    });
    ws.on('message', (data, isBinary) => {
      const buf = Array.isArray(data) ? Buffer.concat(data) : Buffer.isBuffer(data) ? data : Buffer.from(data);
      if (isBinary) {
        const { path, audio } = parseBinary(buf);
        if (path === 'audio' && audio) parts.push(audio);
      } else if (/Path:\s*turn\.end/i.test(buf.toString('utf8').split('\r\n\r\n')[0] ?? '')) {
        finish(null);
      }
    });
    ws.on('close', () => finish(null));
  });
}

// ------------------------------------------------- second path: Azure REST --
// The same neural voices through Azure's regular speech REST endpoint, with a
// short-lived token issued to the Microsoft Translator app. Used when the
// read-aloud WebSocket refuses this server (Microsoft blocks data-centre IPs there).

const TRANSLATOR_ENDPOINT = 'https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0';
const TRANSLATOR_KEY = 'oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw==';

/** Overridable in tests. */
export const http = { fetch: (input: string, init?: RequestInit) => fetch(input, init) };

/** The Translator app's request signature: HMAC-SHA256 of app + URL + date + id, lower-cased. */
export function translatorSignature(url: string, now = new Date(), id = randomUUID().replace(/-/g, '')): string {
  const date = now.toUTCString().toLowerCase();
  const toSign = `MSTranslatorAndroidApp${encodeURIComponent(url.split('://')[1] ?? url)}${date}${id}`.toLowerCase();
  const sig = createHmac('sha256', Buffer.from(TRANSLATOR_KEY, 'base64')).update(toSign).digest('base64');
  return `MSTranslatorAndroidApp::${sig}::${date}::${id}`;
}

let restToken: { t: string; r: string; until: number } | null = null;

async function restEndpoint(): Promise<{ t: string; r: string }> {
  if (restToken && restToken.until > Date.now()) return restToken;
  const id = randomUUID().replace(/-/g, '');
  const res = await http.fetch(TRANSLATOR_ENDPOINT, {
    method: 'POST',
    headers: {
      'Accept-Language': 'en-US',
      'X-ClientVersion': '4.0.530a 5fe1dc6c',
      'X-UserId': '0f04d16a175c411e',
      'X-HomeGeographicRegion': 'en-US',
      'X-ClientTraceId': id,
      'X-MT-Signature': translatorSignature(TRANSLATOR_ENDPOINT, new Date(), id),
      'User-Agent': 'okhttp/4.5.0',
      'Content-Type': 'application/json; charset=utf-8',
    },
  }).catch((e: unknown) => {
    throw new EdgeTtsError(`token: ${e instanceof Error ? e.message : e}`, 'network');
  });
  if (!res.ok) throw new EdgeTtsError(`token HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 120)}`, 'handshake');
  const j = (await res.json().catch(() => null)) as { t?: string; r?: string } | null;
  if (!j?.t || !j?.r) throw new EdgeTtsError('token: unexpected answer', 'handshake');
  // The token is a JWT: keep it until a minute before it expires (about 10 minutes).
  let exp = Date.now() + 8 * 60_000;
  try {
    const payload = JSON.parse(Buffer.from(j.t.split('.')[1] ?? '', 'base64url').toString('utf8')) as { exp?: number };
    if (payload.exp) exp = payload.exp * 1000 - 60_000;
  } catch {
    /* not a JWT we can read: use the default */
  }
  restToken = { t: j.t, r: j.r, until: exp };
  return restToken;
}

async function synthRest(text: string, o: SynthOptions, retried = false): Promise<Buffer> {
  const ep = await restEndpoint();
  const res = await http
    .fetch(`https://${ep.r}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        Authorization: ep.t.startsWith('Bearer ') ? ep.t : `Bearer ${ep.t}`,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': OUTPUT_FORMAT,
        'User-Agent': 'okhttp/4.5.0',
      },
      body: ssml(text, o, true),
    })
    .catch((e: unknown) => {
      throw new EdgeTtsError(`rest: ${e instanceof Error ? e.message : e}`, 'network');
    });
  if ((res.status === 401 || res.status === 403) && !retried) {
    restToken = null;
    return synthRest(text, o, true);
  }
  if (!res.ok) throw new EdgeTtsError(`rest HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 120)}`, res.status === 400 ? 'no_audio' : 'handshake');
  const audio = Buffer.from(await res.arrayBuffer());
  if (audio.length < 128) throw new EdgeTtsError('rest: empty audio', 'no_audio');
  return audio;
}

/** After the WebSocket refused this server, go straight to REST for a while (exported for tests). */
export const providers = { wsBlockedUntil: 0 };
/** EDGE_TTS_MODE: "auto" (default: WebSocket, then REST), "rest" or "ws". */
const MODE = (process.env.EDGE_TTS_MODE || 'auto').toLowerCase();

/**
 * One chunk of text to MP3: the read-aloud WebSocket first, and on a refused
 * handshake the Azure REST path (remembered for 30 minutes). With Multilingual
 * voices that a path does not know, the base voice is used.
 */
export async function synthesize(text: string, o: SynthOptions): Promise<Buffer> {
  const tryRest = async (why: string) => {
    try {
      return await synthRest(text, o);
    } catch (e) {
      if (e instanceof EdgeTtsError && e.code === 'no_audio' && /MultilingualNeural$/.test(o.voice)) {
        return synthRest(text, { ...o, voice: o.voice.replace(/MultilingualNeural$/, 'Neural') });
      }
      if (e instanceof EdgeTtsError) throw new EdgeTtsError(`${why}${why ? ' | ' : ''}${e.message}`, e.code);
      throw e;
    }
  };
  if (MODE === 'rest' || (MODE === 'auto' && providers.wsBlockedUntil > Date.now())) return tryRest('');
  try {
    return await synthesizeWs(text, o);
  } catch (e) {
    if (MODE === 'ws' || !(e instanceof EdgeTtsError) || (e.code !== 'handshake' && e.code !== 'network')) throw e;
    providers.wsBlockedUntil = Date.now() + 30 * 60_000;
    return tryRest(e.message);
  }
}

/**
 * One chunk of text to MP3. On a refused handshake, tries the other browser
 * versions (and once without the cookie) before giving up; the error then
 * lists every answer Microsoft gave, for the logs and the app's diagnosis.
 */
async function synthesizeWs(text: string, o: SynthOptions): Promise<Buffer> {
  const order = goodVersion ? [goodVersion, ...VERSIONS.filter((v) => v !== goodVersion)] : VERSIONS;
  const attempts: [string, boolean][] = [...order.map((v) => [v, true] as [string, boolean]), [order[0]!, false]];
  const refused: string[] = [];
  for (const [version, cookie] of attempts) {
    try {
      const audio = await synthOnce(text, o, version, cookie);
      goodVersion = version;
      return audio;
    } catch (e) {
      if (!(e instanceof EdgeTtsError)) throw e;
      if (e.code === 'handshake') {
        refused.push(e.message);
        continue;
      }
      if (e.code === 'network' && refused.length === 0) {
        refused.push(`network: ${e.message}`);
        continue;
      }
      // Some newer "…MultilingualNeural" voices are not in every region: fall back to the base voice.
      if (e.code === 'no_audio' && /MultilingualNeural$/.test(o.voice)) {
        return synthOnce(text, { ...o, voice: o.voice.replace(/MultilingualNeural$/, 'Neural') }, version, cookie);
      }
      throw e;
    }
  }
  throw new EdgeTtsError(`Voice service refused every handshake: ${refused.join(' | ')}`, 'handshake');
}

// ===================================================================== endpoint

export const MAX_TEXT = 1000;
const MAX_ITEMS = 80;
/** Neural English and Spanish voices only (e.g. en-US-AvaNeural, en-GB-RyanNeural, es-CO-SalomeNeural). */
const VOICE_RE = /^(en|es)-[A-Z]{2}-[A-Z][A-Za-z]{1,30}Neural$/;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Same text, same voice, same settings → same URL, so the CDN can share it. */
export interface Chunk {
  t: string;
  v: string;
  r: number;
  p: number;
}

export function normalize(raw: { t?: unknown; v?: unknown; r?: unknown; p?: unknown }): Chunk | { error: string } {
  const t = String(raw.t ?? '').replace(/\s+/g, ' ').trim();
  const v = String(raw.v ?? '');
  const r = clamp(Math.round(Number(raw.r) || 0), -50, 50);
  const p = clamp(Math.round(Number(raw.p) || 0), -20, 20);
  if (!t) return { error: 'Nothing to read.' };
  if (t.length > MAX_TEXT) return { error: `Text over ${MAX_TEXT} characters: split it.` };
  if (!VOICE_RE.test(v)) return { error: 'Unknown voice.' };
  return { t, v, r, p };
}

export function sign(secret: string, n: Chunk): string {
  return createHmac('sha256', secret).update(`v1|${n.v}|${n.r}|${n.p}|${n.t}`).digest('base64url').slice(0, 32);
}

function sigOk(secret: string, n: Chunk, s: string): boolean {
  const a = Buffer.from(sign(secret, n));
  const b = Buffer.from(String(s));
  return a.length === b.length && timingSafeEqual(a, b);
}

// --- who is calling (POST only) ---

const sessions = new Map<string, { id: string; until: number }>();
const usage = new Map<string, { n: number; since: number }>();
const SIGNS_PER_HOUR = 2000;

/** Overridable in tests. */
export const auth = {
  async userId(token: string): Promise<string | null> {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    const r = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: key } });
    if (!r.ok) return null;
    const u = (await r.json().catch(() => null)) as { id?: string } | null;
    return u?.id ?? null;
  },
};

async function caller(req: IncomingMessage): Promise<string | null> {
  const m = /^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization ?? ''));
  if (!m) return null;
  const token = m[1]!;
  const hit = sessions.get(token);
  if (hit && hit.until > Date.now()) return hit.id;
  const id = await auth.userId(token);
  if (id) {
    if (sessions.size > 500) sessions.clear();
    sessions.set(token, { id, until: Date.now() + 5 * 60_000 });
  }
  return id;
}

function allow(user: string, n: number): boolean {
  const now = Date.now();
  const u = usage.get(user);
  if (!u || now - u.since > 3_600_000) {
    usage.set(user, { n, since: now });
    return n <= SIGNS_PER_HOUR;
  }
  u.n += n;
  return u.n <= SIGNS_PER_HOUR;
}

// --- plumbing ---

type Req = IncomingMessage & { query?: Record<string, string | string[] | undefined>; body?: unknown };

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}
const fail = (res: ServerResponse, status: number, message: string, code: string) => send(res, status, { error: { message, code } });

function query(req: Req): Record<string, string> {
  const out: Record<string, string> = {};
  const q = req.query ?? Object.fromEntries(new URL(req.url ?? '/', 'http://x').searchParams);
  for (const [k, v] of Object.entries(q)) if (v != null) out[k] = Array.isArray(v) ? String(v[0]) : String(v);
  return out;
}

async function readJson(req: Req): Promise<unknown> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 256 * 1024) throw new Error('too large');
    chunks.push(c as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export default async function handler(req: Req, res: ServerResponse) {
  const secret = process.env.TTS_SIGNING_SECRET || '';
  if (!secret) return fail(res, 503, 'TTS_SIGNING_SECRET is not set in Vercel.', 'not_configured');

  if (req.method === 'POST') {
    const user = await caller(req).catch(() => null);
    if (!user) return fail(res, 401, 'Sign in to use the natural voices.', 'signed_out');
    let body: { items?: unknown };
    try {
      body = (await readJson(req)) as { items?: unknown };
    } catch {
      return fail(res, 400, 'The request was not valid JSON.', 'bad_request');
    }
    const items = Array.isArray(body?.items) ? body.items.slice(0, MAX_ITEMS) : [];
    if (!items.length) return fail(res, 400, 'Nothing to sign.', 'bad_request');
    if (!allow(user, items.length)) return fail(res, 429, 'Too many new audios this hour. Try again later.', 'limit');
    const sigs = items.map((it) => {
      const n = normalize((it ?? {}) as Record<string, unknown>);
      return 'error' in n ? null : sign(secret, n);
    });
    return send(res, 200, { sigs });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'GET or POST only.', 'bad_request');

  const q = query(req);
  const n = normalize(q);
  if ('error' in n) return fail(res, 400, n.error, 'bad_request');
  if (!q.s || !sigOk(secret, n, q.s)) return fail(res, 403, 'This audio link is not signed.', 'bad_signature');

  let audio: Buffer;
  try {
    audio = await synthesize(n.t, { voice: n.v, rate: n.r, pitch: n.p });
  } catch (e) {
    const code = e instanceof EdgeTtsError ? e.code : 'network';
    const detail = e instanceof Error ? e.message : String(e);
    console.error('[tts] synthesis failed:', code, detail);
    return send(res, 502, { error: { message: 'The voice service did not answer. Use the device voice for now.', code: `upstream_${code}`, detail: detail.slice(0, 600) } });
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Length', String(audio.length));
  // Same URL is always the same audio: let the browser and Vercel's CDN keep it.
  res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
  res.setHeader('Accept-Ranges', 'none');
  res.end(req.method === 'HEAD' ? undefined : audio);
}
