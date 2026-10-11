// Class Mode — multijugador P2P con PeerJS (docente = host, estudiantes = clientes).
// Usa window.Peer (vendor/peerjs.min.js) y la nube pública de señalización de PeerJS.
const PREFIX = 'edef-english-defenders-';
const MAX_PLAYERS = 7;

// Servidores ICE: STUN para descubrir IPs y TURN para relevar el tráfico cuando
// los dos dispositivos están tras NAT/cortafuegos estrictos (datos móviles, wifi
// del colegio). Sin TURN, muchos estudiantes se quedaban en "cargando".
// STUN sólo sirve para DESCUBRIR la dirección pública. Cuando los dos dispositivos
// están en redes distintas y con NAT estricto (datos móviles, wifi de colegio con
// cortafuegos), no hay ruta directa posible y hace falta un servidor TURN que
// RELEVE el tráfico. Sin TURN válido la partida sólo funciona dentro de la misma
// red, que es justo el síntoma que se ve en clase.
const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

// TURN de respaldo histórico. El proyecto gratuito "Open Relay" dejó de aceptar
// estas credenciales abiertas, así que puede no responder: se conserva por si
// alguna red aún lo alcanza, pero NO se debe contar con él.
const LEGACY_TURN = {
  urls: [
    'turn:openrelay.metered.ca:80',
    'turn:openrelay.metered.ca:443',
    'turn:openrelay.metered.ca:443?transport=tcp',
  ],
  username: 'openrelayproject',
  credential: 'openrelayproject',
};

/* ---------- TURN propio ----------
   Es lo único que garantiza que la clase se conecte desde cualquier red. Se guarda
   en el navegador del docente y de los alumnos (cada uno lo pone una vez), o se
   pasa por la URL, que es lo cómodo para repartirlo con el QR:
     ...?turn=turn:mi.servidor:3478&turnuser=USUARIO&turnpass=CLAVE            */
const TURN_KEY = 'ed:turn';
export function getTurn() {
  const p = new URLSearchParams(location.search);
  const url = p.get('turn');
  if (url) {
    const cfg = { urls: url.split(','), username: p.get('turnuser') || '', credential: p.get('turnpass') || '' };
    try { localStorage.setItem(TURN_KEY, JSON.stringify(cfg)); } catch {}
    return cfg;
  }
  try {
    const raw = localStorage.getItem(TURN_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    return cfg && cfg.urls && cfg.urls.length ? cfg : null;
  } catch { return null; }
}
export function setTurn(urls, username, credential) {
  const list = String(urls || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!list.length) { try { localStorage.removeItem(TURN_KEY); } catch {} return null; }
  const cfg = { urls: list, username: username || '', credential: credential || '' };
  try { localStorage.setItem(TURN_KEY, JSON.stringify(cfg)); } catch {}
  return cfg;
}
export function iceServers() {
  const mine = getTurn();
  return mine ? [...STUN_SERVERS, mine, LEGACY_TURN] : [...STUN_SERVERS, LEGACY_TURN];
}

/* Diagnóstico: ¿qué candidatos consigue este dispositivo?
     host  — sólo la red local (funciona únicamente en la misma wifi)
     srflx — dirección pública vista por STUN (suele bastar entre redes normales)
     relay — el TURN responde: funciona incluso con NAT estricto o datos móviles
   Devuelve además si el TURN configurado está vivo. */
export function testIce(timeoutMs = 8000) {
  return new Promise((resolve) => {
    const types = new Set();
    let pc;
    try {
      pc = new RTCPeerConnection({ iceServers: iceServers() });
    } catch (e) {
      resolve({ ok: false, error: String(e), types: [] });
      return;
    }
    const done = () => {
      clearTimeout(timer);
      try { pc.close(); } catch {}
      const list = [...types];
      resolve({
        ok: true, types: list,
        relay: list.includes('relay'),
        publicAddr: list.includes('srflx') || list.includes('relay'),
      });
    };
    const timer = setTimeout(done, timeoutMs);
    pc.onicecandidate = (e) => {
      if (!e.candidate) { done(); return; }
      const t = e.candidate.type || (e.candidate.candidate.match(/ typ (\w+)/) || [])[1];
      if (t) types.add(t);
      if (types.has('relay')) done();   // ya sabemos lo que importa
    };
    try {
      pc.createDataChannel('probe');
      pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => done());
    } catch { done(); }
  });
}

// Por defecto usa la nube gratuita de PeerJS. Con ?peerhost=servidor:puerto
// se puede apuntar a un peerjs-server propio (p. ej. en la red del colegio).
function peerOpts() {
  const base = { debug: 0, config: { iceServers: iceServers(), sdpSemantics: 'unified-plan' } };
  const p = new URLSearchParams(location.search).get('peerhost');
  if (!p) return base;
  const [host, port] = p.split(':');
  return { ...base, host, port: Number(port) || 443, path: '/', secure: location.protocol === 'https:' && host !== 'localhost' };
}

function randomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 5; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

export class ClassHost {
  constructor({ onReady, onError, onRoster, onAnswer }) {
    this.onReady = onReady;
    this.onError = onError;
    this.onRoster = onRoster;
    this.onAnswer = onAnswer;   // modo "pantalla central": llega la respuesta de un móvil
    this.conns = new Map();
    this.destroyed = false;
    this._idTries = 0;
    this._boot();
  }

  _boot() {
    this.code = randomCode();
    this.peer = new Peer(PREFIX + this.code, peerOpts());
    this.peer.on('open', () => { if (!this.destroyed) this.onReady(this.code); });
    this.peer.on('connection', (c) => this._welcome(c));
    this.peer.on('disconnected', () => { if (!this.destroyed) { try { this.peer.reconnect(); } catch {} } });
    this.peer.on('error', (e) => {
      if (this.destroyed) return;
      if (e.type === 'unavailable-id' && this._idTries < 4) {
        // código en uso: destruye este peer y reintenta con otro código
        this._idTries++;
        try { this.peer.destroy(); } catch {}
        this._boot();
      } else if (e.type === 'network' || e.type === 'disconnected') {
        try { this.peer.reconnect(); } catch {}
      } else {
        this.onError(e);
      }
    });
  }

  _welcome(conn) {
    // Los manejadores se enganchan YA, no dentro de conn.on('open'): el estudiante
    // manda su "join" en cuanto abre SU lado, y si eso llegaba antes de que el
    // docente registrara el listener, el mensaje se perdía sin remedio. Resultado:
    // la conexión quedaba abierta, el alumno esperando para siempre y el docente
    // sin verlo en la lista. Ahora ningún mensaje puede llegar antes de tiempo.
    conn.on('data', (msg) => this._onData(conn, msg));
    conn.on('close', () => { this.conns.delete(conn); this._roster(); });
    conn.on('error', () => { this.conns.delete(conn); this._roster(); });
  }

  _onData(conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'join') {
      const known = this.conns.get(conn);
      // El aforo se comprueba aquí, que es cuando de verdad hay un jugador nuevo.
      if (!known && this.conns.size >= MAX_PLAYERS) {
        try { conn.send({ t: 'full' }); } catch {}
        setTimeout(() => { try { conn.close(); } catch {} }, 500);
        return;
      }
      const name = String(msg.name || 'Student').slice(0, 16);
      // Reenviar "join" es válido: el alumno lo repite hasta recibir la bienvenida,
      // así que responder siempre (aunque ya esté registrado) es lo correcto.
      this.conns.set(conn, { name, stat: known?.stat ?? null });
      try { conn.send({ t: 'welcome', players: this.roster() }); } catch {}
      this._roster();
    } else if (msg.t === 'ping') {
      try { conn.send({ t: 'pong' }); } catch {}
    } else if (msg.t === 'stat') {
      const p = this.conns.get(conn);
      if (p) p.stat = {
        sun: msg.sun | 0, killed: msg.killed | 0,
        correct: msg.correct | 0, asked: msg.asked | 0,
        state: ['playing', 'won', 'lost', 'quiz', 'paused'].includes(msg.state) ? msg.state : 'playing',
      };
    } else if (msg.t === 'answer') {
      // respuesta del móvil en el modo por turnos; `turn` descarta las tardías
      const p = this.conns.get(conn);
      this.onAnswer?.({ name: p?.name || 'Student', index: msg.i | 0, turn: msg.turn | 0 });
    } else if (msg.t === 'bye') {
      this.conns.delete(conn);
      this._roster();
      setTimeout(() => { try { conn.close(); } catch {} }, 200);
    }
  }

  // Envía un mensaje a UN estudiante por su nombre (el resto no lo recibe).
  sendTo(name, msg) {
    for (const [conn, p] of this.conns) {
      if (p.name === name) { try { conn.send(msg); } catch {} return true; }
    }
    return false;
  }

  roster() { return [...this.conns.values()].map(p => p.name); }
  _roster() { if (!this.destroyed) this.onRoster(this.roster()); }

  broadcast(msg) { for (const conn of this.conns.keys()) { try { conn.send(msg); } catch {} } }

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

  destroy() { this.destroyed = true; try { this.peer.destroy(); } catch {} }
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
    this.attempt = 0;
    this._boot();
  }

  _boot() {
    this.peer = new Peer(peerOpts());
    this._openTimer = setTimeout(() => {
      if (!this.destroyed && !this.joined) this._retry('the network is slow');
    }, 12000);

    this.peer.on('open', () => {
      if (this.destroyed) return;
      this._connectToHost();
    });
    this.peer.on('disconnected', () => {
      if (!this.destroyed && !this.joined) { try { this.peer.reconnect(); } catch {} }
    });
    this.peer.on('error', (e) => {
      if (this.destroyed) return;
      if (e.type === 'peer-unavailable') {
        // el código no existe o el docente aún no está listo: reintenta
        this._retry('waiting for the teacher…');
      } else if (e.type === 'network' || e.type === 'disconnected' || e.type === 'socket-error') {
        this._retry('reconnecting…');
      } else {
        this.onStatus('error', e.type);
      }
    });
  }

  _connectToHost() {
    clearTimeout(this._connTimer);
    this.conn = this.peer.connect(PREFIX + this.code, { reliable: true });
    // si la conexión de datos no abre en 8 s, reintenta
    this._connTimer = setTimeout(() => {
      if (!this.destroyed && !this.joined) this._retry('still trying…');
    }, 8000);

    this.conn.on('open', () => {
      if (this.destroyed) return;
      clearTimeout(this._openTimer);
      clearTimeout(this._connTimer);
      // El "join" se repite hasta que llega la bienvenida. Con la nube de PeerJS el
      // primer mensaje se puede perder si el otro extremo aún no está escuchando,
      // y entonces el alumno se quedaba esperando eternamente con la línea abierta.
      this._joinTries = 0;
      const sendJoin = () => {
        if (this.destroyed || this.joined) { clearInterval(this._joinTimer); return; }
        if (this._joinTries >= 8) {
          clearInterval(this._joinTimer);
          this.onStatus('nowelcome');
          return;
        }
        this._joinTries++;
        try { this.conn.send({ t: 'join', name: this.name }); } catch {}
        if (this._joinTries > 1) this.onStatus('handshake', this._joinTries);
      };
      clearInterval(this._joinTimer);
      sendJoin();
      this._joinTimer = setInterval(sendJoin, 1800);
      this.onStatus('waiting');
    });
    this.conn.on('data', (msg) => {
      if (this.destroyed || !msg || typeof msg !== 'object') return;
      if (msg.t === 'welcome') {
        clearInterval(this._joinTimer);
        this.joined = true;
        this.onStatus('joined', msg.players);
      }
      else if (msg.t === 'full') this.onStatus('full');
      else if (msg.t === 'start') this.onStart(msg.cfg);
      else if (msg.t === 'board') this.onBoard(msg.rows);
      else if (msg.t === 'end') this.onEnd?.(msg.rows);
      else if (msg.t === 'ask') this.onAsk?.(msg);
      else if (msg.t === 'wait') this.onWait?.(msg);
      else if (msg.t === 'result') this.onResult?.(msg);
    });
    this.conn.on('close', () => { if (!this.destroyed) this.onStatus('closed'); });
    this.conn.on('error', () => { if (!this.destroyed && !this.joined) this._retry('connection error'); });
  }

  _retry(reason) {
    if (this.destroyed || this.joined) return;
    this.attempt++;
    if (this.attempt > 6) {
      this.onStatus('failed');
      return;
    }
    this.onStatus('retrying', `${reason} (try ${this.attempt}/6)`);
    // destruye y recrea desde cero: la vía más fiable con la nube de PeerJS
    try { this.conn?.close(); } catch {}
    try { this.peer?.destroy(); } catch {}
    clearTimeout(this._openTimer);
    clearTimeout(this._connTimer);
    clearInterval(this._joinTimer);
    setTimeout(() => { if (!this.destroyed) this._boot(); }, 1200);
  }

  sendStat(stat) { try { this.conn?.send({ t: 'stat', ...stat }); } catch {} }
  // respuesta del alumno en el modo por turnos
  sendAnswer(index, turn) { try { this.conn?.send({ t: 'answer', i: index, turn }); } catch {} }
  leave() { try { this.conn?.send({ t: 'bye' }); } catch {} this.destroy(); }
  destroy() {
    this.destroyed = true;
    clearTimeout(this._openTimer);
    clearTimeout(this._connTimer);
    clearInterval(this._joinTimer);
    try { this.conn?.close(); } catch {}
    try { this.peer?.destroy(); } catch {}
  }
}

export function joinURL(code) {
  const base = location.origin + location.pathname;
  // El QR lleva el TURN del docente: así los alumnos lo heredan al escanear y no
  // tienen que configurar nada en su teléfono para conectarse desde otra red.
  const turn = getTurn();
  const q = turn
    ? '?' + new URLSearchParams({
        turn: turn.urls.join(','),
        turnuser: turn.username || '',
        turnpass: turn.credential || '',
      }).toString()
    : '';
  return `${base}${q}#join=${code}`;
}

export function makeQR(text) {
  // qrcode-generator (window.qrcode). Dibujamos en un <canvas> y exportamos PNG:
  // es más fiable que el GIF data-URL en algunos navegadores/hosts.
  if (typeof window.qrcode !== 'function') throw new Error('QR library not loaded');
  const qr = window.qrcode(0, 'M');
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
