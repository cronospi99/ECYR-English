/* Local development relay (Class Wars, Impostor) — same protocol as relay/src/index.ts (Cloudflare Worker).
   Run: npm run relay   (listens on :8787) */
import { WebSocketServer } from "ws";

const port = Number(process.env.PORT || 8787);
const rooms = new Map(); // code -> Map<id, {ws, role}>

const wss = new WebSocketServer({ port, host: "0.0.0.0" });
wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", "http://x");
  const m = url.pathname.match(/^\/room\/([A-Z0-9]{3,8})$/i);
  const id = url.searchParams.get("id") || "";
  const role = url.searchParams.get("role") === "host" ? "host" : "player";
  if (!m || !/^[\w-]{4,40}$/.test(id)) return ws.close(1008, "bad request");
  const code = m[1].toUpperCase();
  if (!rooms.has(code)) rooms.set(code, new Map());
  const room = rooms.get(code);
  const old = room.get(id);
  if (old) try { old.ws.close(4000, "replaced"); } catch {}
  room.set(id, { ws, role });
  const sys = (d) => JSON.stringify({ f: "_sys", d });
  for (const [pid, p] of room) if (pid !== id) p.ws.send(sys({ type: "peer-join", id, role }));
  ws.send(sys({ type: "welcome", peers: [...room].filter(([pid]) => pid !== id).map(([pid, p]) => ({ id: pid, role: p.role })) }));

  ws.on("message", (raw) => {
    let env;
    try { env = JSON.parse(String(raw)); } catch { return; }
    if (env.t === "_ping") return ws.send(sys({ type: "pong" }));
    const out = JSON.stringify({ f: id, d: env.d });
    for (const [pid, p] of room) {
      if (pid === id) continue;
      if (env.t === "host" ? p.role !== "host" : env.t && env.t !== pid) continue;
      if (p.ws.readyState === 1) p.ws.send(out);
    }
  });
  ws.on("close", () => {
    if (room.get(id)?.ws !== ws) return;
    room.delete(id);
    for (const [, p] of room) p.ws.send(sys({ type: "peer-leave", id, role }));
    if (!room.size) rooms.delete(code);
  });
});
console.log(`ecyr relay listening on ws://0.0.0.0:${port}`);
