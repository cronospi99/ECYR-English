// @ts-nocheck
import qrcode from 'qrcode-generator';
import { Relay, makeId, relayConfigured } from '@/lib/relay';
// Class Mode — el MISMO sistema que Impostor y Class Wars: el docente (host) y los
// alumnos se conectan por WebSocket al relay de la plataforma (Cloudflare), así que
// funciona desde CUALQUIER red (datos móviles, otra wifi, la del colegio) sin STUN/TURN
// ni servidores propios. Los mensajes entre host y alumnos no han cambiado.
const MAX_PLAYERS = 7;
// 6 caracteres (el relay admite 3-8): las salas se comparten con otros juegos, así
// que un código más largo hace casi imposible chocar con una sala ajena.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function randomCode() {
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => CODE_CHARS[x % CODE_CHARS.length]).join('');
}

export class ClassHost {
  constructor({ onReady, onError, onRoster, onAnswer }) {
    this.onReady = onReady;
    this.onError = onError;
    this.onRoster = onRoster;
    this.onAnswer = onAnswer;   // modo "pantalla central": llega la respuesta de un móvil
    this.conns = new Map();     // id de relay -> { name, stat }
    this.destroyed = false;
    this.code = randomCode();
    if (!relayConfigured()) {
      setTimeout(() => this.onError({ type: 'the live game server is not set up (VITE_RELAY_URL)' }), 0);
      return;
    }
    this.relay = new Relay(this.code, makeId(), 'host');
    let opened = false;
    this.relay.onStatus((s) => {
      if (this.destroyed) return;
      if (s === 'open' && !opened) { opened = true; this.onReady(this.code); }
      else if (s === 'closed') this.onError({ type: 'room replaced, reload the page' });
    });
    this.relay.on((e) => this._onEnvelope(e));
  }

  _onEnvelope(e) {
    if (this.destroyed) return;
    if (e.f === '_sys') {
      // un alumno se fue (o perdió la conexión)
      if (e.d?.type === 'peer-leave' && this.conns.delete(e.d.id)) this._roster();
      return;
    }
    this._onData(e.f, e.d);
  }

  _onData(id, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'join') {
      const known = this.conns.get(id);
      // El aforo se comprueba aquí, que es cuando de verdad hay un jugador nuevo.
      if (!known && this.conns.size >= MAX_PLAYERS) { this.relay.send({ t: 'full' }, id); return; }
      const name = String(msg.name || 'Student').slice(0, 16);
      // Reenviar "join" es válido: el alumno lo repite hasta recibir la bienvenida.
      this.conns.set(id, { name, stat: known?.stat ?? null });
      this.relay.send({ t: 'welcome', players: this.roster() }, id);
      this._roster();
    } else if (msg.t === 'ping') {
      this.relay.send({ t: 'pong' }, id);
    } else if (msg.t === 'stat') {
      const p = this.conns.get(id);
      if (p) p.stat = {
        sun: msg.sun | 0, killed: msg.killed | 0,
        correct: msg.correct | 0, asked: msg.asked | 0,
        state: ['playing', 'won', 'lost', 'quiz', 'paused'].includes(msg.state) ? msg.state : 'playing',
      };
    } else if (msg.t === 'answer') {
      // respuesta del móvil en el modo por turnos; `turn` descarta las tardías
      const p = this.conns.get(id);
      this.onAnswer?.({ name: p?.name || 'Student', index: msg.i | 0, turn: msg.turn | 0 });
    } else if (msg.t === 'bye') {
      this.conns.delete(id);
      this._roster();
    }
  }

  // Envía un mensaje a UN estudiante por su nombre (el resto no lo recibe).
  sendTo(name, msg) {
    for (const [id, p] of this.conns) {
      if (p.name === name) { this.relay?.send(msg, id); return true; }
    }
    return false;
  }

  roster() { return [...this.conns.values()].map(p => p.name); }
  _roster() { if (!this.destroyed) this.onRoster(this.roster()); }

  broadcast(msg) { if (this.conns.size) this.relay?.send(msg); }

  start(cfg) { this.broadcast({ t: 'start', cfg }); }

  // el docente termina la sesión para todos, enviando el ranking final
  end(rows) { this.broadcast({ t: 'end', rows }); }

  // tabla de posiciones: host + estudiantes
  board(selfName, selfStat) {
    const rows = [{ name: `⭐ ${selfName}`, ...selfStat, host: true }];
    for (const p of this.conns.values()) if (p.stat) rows.push({ name: p.name, ...p.stat });
    rows.sort((a, b) => (b.killed + b.correct * 2) - (a.killed + a.correct * 2));
    this.broadcast({ t: 'board', rows });
    return rows;
  }

  destroy() { this.destroyed = true; this.relay?.close(); }
}

export class ClassClient {
  constructor(code, name, { onStart, onBoard, onStatus, onEnd, onAsk, onWait, onResult }) {
    this.code = code.toUpperCase();
    this.name = name;
    this.onStart = onStart;
    this.onBoard = onBoard;
    this.onStatus = onStatus;
    this.onEnd = onEnd;
    // modo "pantalla central": el juego corre en el proyector y aquí sólo se responde
    this.onAsk = onAsk;       // te toca: aquí va la pregunta
    this.onWait = onWait;     // le toca a otro
    this.onResult = onResult; // cómo salió la respuesta
    this.destroyed = false;
    this.joined = false;
    this.hostId = null;
    this._boot();
  }

  _boot() {
    if (!relayConfigured()) { setTimeout(() => this.onStatus('error', 'live game server not set up'), 0); return; }
    this.relay = new Relay(this.code, makeId(), 'player');
    let everOpen = false;
    // si en 20 s no hay conexión con el servidor, avisa (el Relay sigue reintentando solo)
    this._openTimer = setTimeout(() => {
      if (!this.destroyed && !everOpen) this.onStatus('failed');
    }, 20000);
    this.relay.onStatus((s) => {
      if (this.destroyed) return;
      if (s === 'open') {
        everOpen = true;
        clearTimeout(this._openTimer);
        this._startJoin();
      } else if (s === 'connecting' && everOpen && !this.joined) {
        this.onStatus('retrying', 'reconnecting…');
      } else if (s === 'closed') {
        this.onStatus('closed');
      }
    });
    this.relay.on((e) => this._onEnvelope(e));
  }

  // El "join" se repite hasta que llega la bienvenida: si el docente aún no ha
  // abierto la sala (o su mensaje se cruza con la conexión), no se pierde.
  _startJoin() {
    clearInterval(this._joinTimer);
    this._joinTries = 0;
    const sendJoin = () => {
      if (this.destroyed || this.joined) { clearInterval(this._joinTimer); return; }
      if (this._joinTries >= 8) {
        clearInterval(this._joinTimer);
        this.onStatus('nowelcome');
        return;
      }
      this._joinTries++;
      this.relay.send({ t: 'join', name: this.name }, 'host');
      if (this._joinTries > 1) this.onStatus('handshake', this._joinTries);
    };
    sendJoin();
    this._joinTimer = setInterval(sendJoin, 1800);
    this.onStatus('waiting');
  }

  _onEnvelope(e) {
    if (this.destroyed) return;
    if (e.f === '_sys') {
      const d = e.d || {};
      if (d.type === 'welcome') this.hostId = (d.peers || []).find(p => p.role === 'host')?.id ?? this.hostId;
      else if (d.type === 'peer-join' && d.role === 'host') this.hostId = d.id;
      else if (d.type === 'peer-leave' && d.role === 'host' && this.joined) { this.joined = false; this.onStatus('closed'); }
      return;
    }
    if (this.hostId && e.f !== this.hostId) return;   // sólo se hace caso al docente
    const msg = e.d;
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'welcome') {
      clearInterval(this._joinTimer);
      this.joined = true;
      this.hostId = e.f;
      this.onStatus('joined', msg.players);
    }
    else if (msg.t === 'full') this.onStatus('full');
    else if (msg.t === 'start') this.onStart(msg.cfg);
    else if (msg.t === 'board') this.onBoard(msg.rows);
    else if (msg.t === 'end') this.onEnd?.(msg.rows);
    else if (msg.t === 'ask') this.onAsk?.(msg);
    else if (msg.t === 'wait') this.onWait?.(msg);
    else if (msg.t === 'result') this.onResult?.(msg);
  }

  sendStat(stat) { this.relay?.send({ t: 'stat', ...stat }, 'host', true); }
  // respuesta del alumno en el modo por turnos
  sendAnswer(index, turn) { this.relay?.send({ t: 'answer', i: index, turn }, 'host'); }
  leave() { this.relay?.send({ t: 'bye' }, 'host'); this.destroy(); }
  destroy() {
    this.destroyed = true;
    clearTimeout(this._openTimer);
    clearInterval(this._joinTimer);
    this.relay?.close();
  }
}

export function joinURL(code) {
  return `${location.origin}${location.pathname}#join=${code}`;
}

export function makeQR(text) {
  // qrcode-generator (window.qrcode). Dibujamos en un <canvas> y exportamos PNG:
  // es más fiable que el GIF data-URL en algunos navegadores/hosts.
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const cell = 8, margin = 4;
  const size = (n + margin * 2) * cell;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000';
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect((col + margin) * cell, (row + margin) * cell, cell, cell);
      }
    }
  }
  return c.toDataURL('image/png');
}
