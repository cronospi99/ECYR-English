import "../styles.css";

import { Engine } from "../core/engine";
import { detectTaxiQuality, isIOS, QUALITY } from "../core/quality";
import { loadCarPack } from "../city/carpack";
import { setRealHumans } from "../city/humans";
import { loadSurfaces, setSurfaceAnisotropy } from "../city/surfaces";
import { DayNight } from "../city/daynight";
import { setTextureAnisotropy } from "../city/textures";
import { loadAppearance } from "../game/appearance";
import { Lobby } from "../ui/lobby";
import { NetClient } from "../net/client";
import { PeerGuest, PeerHost, clearCodeInUrl, codeInUrl, joinUrl, useRelayTransport } from "../net/peer";
import { NO_SESSION, type NetHandlers, type Session } from "../net/session";
import { Speech } from "../learn/speech";
import { createEnvironment } from "../world/environment";
import { TaxiMode } from "./mode";
import { TRAFFIC_LAYER } from "./traffic";

/**
 * Taxi Rush's own entry point (taxi.html).
 *
 * Builds only what the racing mode needs: the engine, the sky, the car pack, the
 * class room (lobby + network) and the mode itself. No walking city, no citizens,
 * no HUD, no menu — those belong to Da World (src/main.ts).
 */

const container = document.querySelector<HTMLElement>("#app");
if (!container) throw new Error("#app container is missing from the document");

const loaderBar = document.querySelector<HTMLElement>("#loaderBar");
const setProgress = (fraction: number): void => {
  if (loaderBar) loaderBar.style.width = `${Math.round(fraction * 100)}%`;
};

async function boot(): Promise<void> {
  // class mode over the platform's WebSocket relay instead of PeerJS / WebRTC
  useRelayTransport(true);
  const quality = detectTaxiQuality();
  setTextureAnisotropy(QUALITY[quality].anisotropy);
  setSurfaceAnisotropy(QUALITY[quality].anisotropy);
  if (quality !== "low") loadSurfaces();
  // Realistic people (driver + passengers): skinned man/woman bodies streamed in the
  // background. Until they land — and on the lowest tier — Character keeps the boxes.
  setRealHumans(quality !== "low");

  const engine = new Engine(container!, quality);
  (window as unknown as Record<string, unknown>).__engine = engine;
  // iOS safe mode: no MSAA on the half-float composer target (WebKit drops or breaks it).
  if (isIOS()) engine.post.setSamples(0);
  // A lost GPU context (iOS does this to background tabs): stop drawing until it is back;
  // three.js re-uploads every geometry and texture on the first frame after restoration.
  engine.canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); engine.stop(); }, false);
  engine.canvas.addEventListener("webglcontextrestored", () => { engine.start(); }, false);
  // the street traffic lives on its own layer (kept out of the reflection probe)
  engine.camera.layers.enable(TRAFFIC_LAYER);
  const environment = createEnvironment(engine.scene, engine.renderer);
  environment.setShadowQuality(QUALITY[quality].shadowMap, QUALITY[quality].shadowRadius);
  environment.setReflections(QUALITY[quality].reflections);
  const dayNight = new DayNight(16.2);

  setProgress(0.2);
  await loadCarPack();
  setProgress(1);

  // --- the class room ---------------------------------------------------------
  const appearance = loadAppearance();
  const speech = new Speech();
  let taxi: TaxiMode | null = null;
  let net: Session = NO_SESSION;
  let myName = "You";

  // Everybody drives their own cab; the mode itself listens to the room's
  // extension messages, so the handlers only have to keep the lobby honest.
  const netHandlers: NetHandlers = {
    onReady: () => {
      lobby.toggle(false);
      taxi?.openSetup();
    },
    onDenied: (reason) => lobby.fail(reason),
    onJoined: () => {},
    onLeft: () => {},
    onPositions: () => {},
    onProgress: () => {},
    onWon: () => {},
    onGoal: () => {},
    onMode: () => {},
    onTarget: () => {},
    onClosed: () => {},
  };

  function leaveRoom(): void {
    net.close();
    net = NO_SESSION;
  }

  function openRoom(name: string): Promise<void> {
    leaveRoom();
    return new Promise<void>((resolve, reject) => {
      let opened = false;
      const created = new PeerHost(name, appearance, {
        onOpen: (code) => {
          opened = true;
          lobby.showRoom(code, joinUrl(code));
          resolve();
        },
        onRoster: (peers) => lobby.setRoster(peers),
        onError: (reason) => {
          if (opened) lobby.fail(reason);
          else reject(new Error(reason));
        },
        onJoined: netHandlers.onJoined,
        onLeft: netHandlers.onLeft,
        onPositions: netHandlers.onPositions,
        onProgress: netHandlers.onProgress,
        onWon: netHandlers.onWon,
      });
      net = created;
      myName = name;
    });
  }

  // The class lobby gets a layer of its own, above the garage.
  const lobbyLayer = document.createElement("div");
  lobbyLayer.className = "ui-layer ecyr-taxi-lobby";
  lobbyLayer.style.zIndex = "90";
  container!.appendChild(lobbyLayer);

  const lobby = new Lobby(lobbyLayer, {
    // Taxi Rush has no walking character to customise.
    onCharacter: () => {},
    onHost: (name) => openRoom(name),
    onJoin: (code, name) => {
      leaveRoom();
      myName = name;
      const guest = new PeerGuest(netHandlers, {
        code,
        name,
        look: appearance,
        onStatus: (text) => lobby.setStatus(text),
      });
      net = guest;
      return guest.join();
    },
    onServerJoin: (details) => {
      leaveRoom();
      myName = details.name;
      const client = new NetClient(netHandlers);
      net = client;
      return client.join({
        url: details.url,
        room: details.room,
        name: details.name,
        role: details.asTeacher ? "teacher" : "student",
        look: appearance,
        passphrase: details.passphrase,
      });
    },
    onEnter: () => {
      lobby.toggle(false);
      taxi?.openSetup();
    },
    onCloseRoom: () => leaveRoom(),
    onCancel: () => taxi?.openSetup(),
  });

  // The lobby talks about taxis, not walking.
  const words: [string, string][] = [
    ["Host this world", "Host the taxi shift"],
    ["walk the same city", "drive the same city"],
    ["▶ Enter the city", "▶ Back to the garage"],
    ["Close the world", "Close the room"],
    ["Join the world", "Join the shift"],
    ["Opening the world…", "Opening the room…"],
    ["dropped back into their own city", "dropped back into their own garage"],
  ];
  const walker = document.createTreeWalker(lobbyLayer, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    let t = n.nodeValue ?? "";
    for (const [a, b] of words) t = t.split(a).join(b);
    if (t !== n.nodeValue) n.nodeValue = t;
  }

  // --- the mode ---------------------------------------------------------------
  taxi = new TaxiMode({
    engine,
    environment,
    dayNight,
    traffic: null,
    setWalking: () => {},
    speak: (text) => speech.speak(text),
    session: () => net,
    myName: () => myName,
    standalone: true,
    onClass: () => lobby.open(),
    onHome: () => {
      const bridge = (window as unknown as { ECYRBridge?: { exit?: () => void } }).ECYRBridge;
      if (window.parent !== window && bridge?.exit) bridge.exit();
      else location.href = "/";
    },
    onExit: () => taxi?.openSetup(),
  });
  (window as unknown as Record<string, unknown>).__taxi = () => taxi;

  engine.onUpdate((dt, elapsed) => {
    if (taxi?.active) taxi.update(dt, elapsed);
  });
  engine.start();

  // Arrived by scanning somebody's QR code: ask only who this is.
  const scanned = codeInUrl();
  taxi.openSetup();
  if (scanned) {
    lobby.openWithCode(scanned);
    clearCodeInUrl();
  }

  // The first frame is rendered by now, so the splash can go.
  requestAnimationFrame(() => {
    document.querySelector("#loader")?.classList.add("is-hidden");
    window.setTimeout(() => document.querySelector("#loader")?.remove(), 700);
    const start = performance.now();
    const FADE_MS = 1400;
    const fade = (): void => {
      const t = Math.min((performance.now() - start) / FADE_MS, 1);
      engine.post.setTransition(t * t * (3 - 2 * t));
      if (t < 1) requestAnimationFrame(fade);
    };
    engine.post.setTransition(0);
    fade();
  });
}

boot().catch((error) => {
  console.error(error);
  const loader = document.querySelector("#loader");
  if (loader) {
    loader.innerHTML = `<h1>Oh no</h1><p class="loader-error">Taxi Rush could not start.<br>${String(error)}</p>`;
  }
});
