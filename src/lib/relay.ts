/* WebSocket client for the live-game relay (relay/ on Cloudflare, or scripts/relay-dev.mjs
   locally) shared by Class Wars and Impostor. Gameplay traffic goes here, never through
   Supabase, so no Supabase Realtime quota is used. Set VITE_RELAY_URL=wss://… in Vercel.

   Keep traffic low: send positions ≤ 10–15 times/s and only while moving (volatile),
   and let the host broadcast one snapshot per tick; render at 60 fps by interpolating. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Envelope = { f: string; d: any };
export type NetStatus = "connecting" | "open" | "closed";

export function relayBase(): string {
  const env = (import.meta.env.VITE_RELAY_URL as string | undefined)?.trim();
  if (env) return env.replace(/\/$/, "");
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.hostname}:8787`;
}

/** True when a production relay is configured (dev falls back to ws://host:8787). */
export function relayConfigured(): boolean {
  return !!(import.meta.env.VITE_RELAY_URL as string | undefined)?.trim() || import.meta.env.DEV;
}

/* Demo rooms (code starting with "DEMO") never touch the network: every peer lives
   in this browser tab and messages go through this in-memory bus instead. */
type LocalPeer = { id: string; role: "host" | "player"; deliver: (e: Envelope) => void; kick: () => void };
const localRooms = new Map<string, Map<string, LocalPeer>>();
export const isDemoCode = (code: string) => code.startsWith("DEMO");

export class Relay {
  private local: LocalPeer | null = null;
  private ws: WebSocket | null = null;
  private listeners = new Set<(e: Envelope) => void>();
  private statusListeners = new Set<(s: NetStatus) => void>();
  private queue: string[] = [];
  private retry = 0;
  private closed = false;
  private ping: ReturnType<typeof setInterval> | null = null;
  status: NetStatus = "connecting";

  private code: string;
  private id: string;
  private role: "host" | "player";

  constructor(code: string, id: string, role: "host" | "player") {
    this.code = code;
    this.id = id;
    this.role = role;
    if (isDemoCode(code)) this.joinLocal();
    else this.open();
  }

  private joinLocal() {
    if (!localRooms.has(this.code)) localRooms.set(this.code, new Map());
    const room = localRooms.get(this.code)!;
    room.get(this.id)?.kick();
    const me: LocalPeer = {
      id: this.id,
      role: this.role,
      deliver: (e) => this.listeners.forEach((fn) => fn(e)),
      kick: () => { this.closed = true; this.setStatus("closed"); }
    };
    this.local = me;
    room.set(this.id, me);
    room.forEach((p) => { if (p.id !== this.id) setTimeout(() => p.deliver({ f: "_sys", d: { type: "peer-join", id: this.id, role: this.role } }), 0); });
    this.status = "open";
  }

  private localSend(t: string | undefined, d: unknown) {
    const room = localRooms.get(this.code);
    if (!room || !this.local || this.closed) return;
    const env: Envelope = { f: this.id, d: JSON.parse(JSON.stringify(d)) };
    room.forEach((p) => {
      if (p.id === this.id) return;
      if (t === "host" ? p.role !== "host" : t && t !== p.id) return;
      setTimeout(() => p.deliver(env), 0);
    });
  }

  private setStatus(s: NetStatus) {
    this.status = s;
    this.statusListeners.forEach((fn) => fn(s));
  }

  private open() {
    if (this.closed) return;
    this.setStatus("connecting");
    const url = `${relayBase()}/room/${encodeURIComponent(this.code)}?id=${encodeURIComponent(this.id)}&role=${this.role}`;
    let ws: WebSocket;
    try { ws = new WebSocket(url); } catch { return this.reconnect(); }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.setStatus("open");
      this.queue.splice(0).forEach((m) => ws.send(m));
      this.ping = setInterval(() => this.raw({ t: "_ping" }), 20000);
    };
    ws.onmessage = (ev) => {
      let env: Envelope;
      try { env = JSON.parse(String(ev.data)); } catch { return; }
      this.listeners.forEach((fn) => fn(env));
    };
    ws.onclose = (ev) => {
      if (ws !== this.ws) return;
      if (this.ping) clearInterval(this.ping);
      if (ev.code === 4000) { this.closed = true; this.setStatus("closed"); return; }
      this.reconnect();
    };
    ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
  }

  private reconnect() {
    if (this.closed) return;
    this.setStatus("connecting");
    const wait = Math.min(8000, 500 * 2 ** this.retry++);
    setTimeout(() => this.open(), wait);
  }

  private raw(obj: unknown, queue = false) {
    const s = JSON.stringify(obj);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(s);
    else if (queue) this.queue.push(s);
  }

  /* to: "host" | peer id | undefined (everyone else). Volatile messages (positions) are not queued. */
  send(d: unknown, to?: string, volatile = false) {
    if (this.local) return this.localSend(to, d);
    this.raw(to ? { t: to, d } : { d }, !volatile);
  }

  on(fn: (e: Envelope) => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  onStatus(fn: (s: NetStatus) => void) {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => { this.statusListeners.delete(fn); };
  }

  close() {
    if (this.local) {
      const room = localRooms.get(this.code);
      if (room?.get(this.id) === this.local) {
        room.delete(this.id);
        room.forEach((p) => setTimeout(() => p.deliver({ f: "_sys", d: { type: "peer-leave", id: this.id, role: this.role } }), 0));
      }
      this.local = null;
      this.closed = true;
      return;
    }
    this.closed = true;
    if (this.ping) clearInterval(this.ping);
    try { this.ws?.close(1000); } catch { /* ignore */ }
  }
}

export function makeId() {
  const b = new Uint8Array(9);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(36).padStart(2, "0")).join("").slice(0, 14);
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeCode() {
  const b = new Uint8Array(4);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => CODE_CHARS[x % CODE_CHARS.length]).join("");
}
