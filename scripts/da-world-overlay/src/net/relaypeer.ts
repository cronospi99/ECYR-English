/**
 * Class mode over the platform's WebSocket relay.
 *
 * Taxi Rush used PeerJS: WebRTC data channels, brokered by PeerJS's public
 * cloud, with free TURN servers as a fallback — three things outside the
 * platform's control, and a connection that hangs on strict school networks.
 * Language Defenders, Impostor and Class Wars already talk through the
 * platform's relay (`relay/` on Cloudflare, `scripts/relay-dev.mjs` locally),
 * which works from any network. This file lets the unchanged `PeerHost` and
 * `PeerGuest` (peer.ts) run over it: `RelayPeer` looks just enough like a
 * PeerJS `Peer` — `on`, `connect`, `destroy`, and `connection` events carrying
 * objects with `send` / `on` / `close` — that none of the room logic changes.
 *
 * Wire format is the relay's: a host registers `role=host` in room CODE; every
 * student joins as `role=player` and talks only to the host (`t: "host"`). The
 * host talks to each student by id. The room code IS the relay room, so the QR
 * code and the six-character code work as before.
 *
 * Where the relay lives: `?relay=wss://…` on the page (the platform passes its
 * VITE_RELAY_URL that way when it embeds the game; the link and QR the host
 * shares keep it), else `window.ECYR_RELAY_URL`, else this host on :8787 —
 * what `node scripts/relay-dev.mjs` listens on.
 */

type Fn = (...a: any[]) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

class Emitter {
  private handlers = new Map<string, Fn[]>();
  on(event: string, fn: Fn): this {
    const l = this.handlers.get(event) ?? [];
    l.push(fn);
    this.handlers.set(event, l);
    return this;
  }
  protected emit(event: string, ...args: unknown[]): void {
    for (const fn of this.handlers.get(event) ?? []) {
      try { fn(...args); } catch (e) { console.warn(e); }
    }
  }
}

export function relayUrl(): string {
  const q = new URLSearchParams(location.search).get("relay")?.trim();
  const w = (window as unknown as { ECYR_RELAY_URL?: string }).ECYR_RELAY_URL;
  const env = (import.meta.env.VITE_RELAY_URL as string | undefined)?.trim();
  const base = q || w || env;
  if (base) return base.replace(/\/$/, "");
  return `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:8787`;
}

function makeId(): string {
  const b = new Uint8Array(9);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(36).padStart(2, "0")).join("").slice(0, 14);
}

/** One end of a conversation: the host's view of a student, or a student's view of the host. */
export class RelayConn extends Emitter {
  open = false;
  constructor(readonly peer: string, private readonly out: (d: unknown) => void) { super(); }
  send(d: unknown): void { if (this.open) this.out(d); }
  close(): void { if (this.open) { this.open = false; this.emit("close"); } }
  /** @internal */ _open(): void { this.open = true; this.emit("open"); }
  /** @internal */ _data(d: unknown): void { this.emit("data", d); }
  /** @internal */ _closed(): void { if (this.open) { this.open = false; } this.emit("close"); }
}

interface Env { f: string; d: any } // eslint-disable-line @typescript-eslint/no-explicit-any

export class RelayPeer extends Emitter {
  private ws: WebSocket | null = null;
  private closed = false;
  private retry = 0;
  private ping: ReturnType<typeof setInterval> | null = null;
  private opened = false;
  private readonly id = makeId();
  private readonly role: "host" | "player";
  private readonly room: string;
  private hostId: string | null = null;
  private readonly conns = new Map<string, RelayConn>();
  private hostConn: RelayConn | null = null;

  /** Host: `new RelayPeer("daworld-CODE")`. Guest: `new RelayPeer()`, then `connect("daworld-CODE")`. */
  constructor(id?: string, _options?: unknown) {
    super();
    this.role = typeof id === "string" ? "host" : "player";
    this.room = typeof id === "string" ? id.replace(/^daworld-/, "") : "";
    if (this.role === "host") setTimeout(() => this.openSocket(this.room), 0);
    else setTimeout(() => this.emit("open"), 0);
  }

  /** Guest: reach the host of `daworld-CODE`. */
  connect(target: string): RelayConn {
    const room = target.replace(/^daworld-/, "");
    const conn = new RelayConn("host", (d) => this.raw({ t: "host", d }));
    this.hostConn = conn;
    this.openSocket(room);
    return conn;
  }

  reconnect(): void { /* the socket reconnects itself */ }

  destroy(): void {
    this.closed = true;
    if (this.ping) clearInterval(this.ping);
    for (const c of this.conns.values()) c._closed();
    this.hostConn?._closed();
    try { this.ws?.close(1000); } catch { /* ignore */ }
  }

  private raw(obj: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  private openSocket(room: string): void {
    if (this.closed) return;
    const url = `${relayUrl()}/room/${encodeURIComponent(room)}?id=${encodeURIComponent(this.id)}&role=${this.role}`;
    let ws: WebSocket;
    try { ws = new WebSocket(url); } catch { this.again(room); return; }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.ping = setInterval(() => this.raw({ t: "_ping" }), 20000);
      if (this.role === "host" && !this.opened) { this.opened = true; this.emit("open", this.id); }
    };
    ws.onmessage = (ev) => {
      let env: Env;
      try { env = JSON.parse(String(ev.data)); } catch { return; }
      this.onEnvelope(env);
    };
    ws.onclose = (ev) => {
      if (ws !== this.ws || this.closed) return;
      if (this.ping) clearInterval(this.ping);
      if (ev.code === 4000) { this.emit("error", { type: "unavailable-id" }); return; }
      this.again(room);
    };
    ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
  }

  private again(room: string): void {
    if (this.closed) return;
    setTimeout(() => this.openSocket(room), Math.min(8000, 500 * 2 ** this.retry++));
  }

  private onEnvelope(e: Env): void {
    if (e.f === "_sys") {
      const d = e.d ?? {};
      if (this.role === "host") {
        if (d.type === "welcome" && (d.peers ?? []).some((p: { role: string }) => p.role === "host")) {
          // somebody else already holds this code: take another one
          this.emit("error", { type: "unavailable-id" });
        } else if (d.type === "peer-join" && d.role === "player") this.addGuest(d.id);
        else if (d.type === "peer-leave" && d.role === "player") { this.conns.get(d.id)?._closed(); this.conns.delete(d.id); }
      } else {
        if (d.type === "welcome") { const h = (d.peers ?? []).find((p: { role: string }) => p.role === "host"); if (h) this.hostSeen(h.id); }
        else if (d.type === "peer-join" && d.role === "host") this.hostSeen(d.id);
        else if (d.type === "peer-leave" && d.role === "host") { this.hostId = null; this.hostConn?._closed(); }
      }
      return;
    }
    if (this.role === "host") {
      let c = this.conns.get(e.f);
      if (!c) c = this.addGuest(e.f); // a guest that joined before we were listening
      c._data(e.d);
    } else if (e.f === this.hostId) this.hostConn?._data(e.d);
  }

  private addGuest(id: string): RelayConn {
    const known = this.conns.get(id);
    if (known) return known;
    const conn = new RelayConn(id, (d) => this.raw({ t: id, d }));
    this.conns.set(id, conn);
    this.emit("connection", conn);
    setTimeout(() => conn._open(), 0); // after the listener has attached its own
    return conn;
  }

  private hostSeen(id: string): void {
    this.hostId = id;
    if (this.hostConn && !this.hostConn.open) this.hostConn._open();
  }
}
