import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Music, VolumeX, Volume2 } from 'lucide-react';
import { relayConfigured } from '@/lib/relay';
import { loadPack } from '@/lib/clueHunt/packs';
import type { HuntPack } from '@/lib/clueHunt/types';
import { JoinQr } from '@/components/ui/JoinQr';
import { B, BiText, N, pn, Backdrop, Diya, Stage, Toggle, fmtTime, useAppReady, useHuntFonts, useLive, useTick } from './ui';
import { HuntHost, MAX_TEAMS, type FeedItem, type PubTeam } from './live';
import { emblemOf, ICON_IMG, img } from './art';
import { downloadQrPng, downloadQrSvg, envBase, joinUrl, publicBase, setPublicBase, shortUrl } from './url';
import { Fireworks } from './Fireworks';
import { isMuted, musicOn, setMuted, sfx, startMusic, stopMusic, unlockAudio } from './sfx';

export default function HostRoute() {
  useHuntFonts(); useAppReady();
  const { pack: slug = '' } = useParams();
  const [pack, setPack] = useState<HuntPack | null | undefined>(undefined);
  const [host, setHost] = useState<HuntHost | null>(null);
  useEffect(() => { let on = true; void loadPack(slug).then((p) => on && setPack(p)); return () => { on = false; }; }, [slug]);
  useEffect(() => {
    if (!pack || !relayConfigured()) return;
    const h = new HuntHost(slug, pack, HuntHost.restore(slug));
    setHost(h);
    if (import.meta.env.DEV) (window as unknown as { __hh: unknown }).__hh = h;
    return () => { h.close(); stopMusic(); };
  }, [pack, slug]);
  if (pack === null) return <div className="ch"><div className="ch-wait" style={{ paddingTop: '30vh' }}><B stack en="Hunt not found" fr="Chasse introuvable" /></div></div>;
  if (pack && !relayConfigured()) return <div className="ch"><Backdrop /><div className="ch-wait" style={{ position: 'relative', paddingTop: '28vh' }}><div className="big"><B stack en="The live server is not configured." fr="Le serveur en direct n’est pas configuré." /></div><p style={{ color: 'var(--muted)' }}><B stack en="Set VITE_RELAY_URL, or use the Bingo mode." fr="Définissez VITE_RELAY_URL, ou utilisez le mode Bingo." /></p><Link className="ch-btn" to={`/hunt/${slug}`}><B en="Back" fr="Retour" /></Link></div></div>;
  if (!pack || !host) return <div className="ch"><Backdrop /></div>;
  return <HostScreen host={host} slug={slug} />;
}

function HostScreen({ host, slug }: { host: HuntHost; slug: string }) {
  useLive(host); useTick(250);
  const [, force] = useState(0);
  const p = host.pack, ph = host.phase;
  const seen = useRef(host.feed.reduce((n, f) => Math.max(n, f.id), 0));
  // sounds for what the teams do
  useEffect(() => {
    for (const f of host.feed) if (f.id > seen.current) { seen.current = f.id; if (f.kind === 'solve') sfx.ok(); else if (f.kind === 'diya') sfx.diya(); else if (f.kind === 'join') sfx.join(); else if (f.kind === 'unlock') sfx.unlock(); }
  });
  const was = useRef(ph);
  useEffect(() => { if (was.current !== 'ended' && ph === 'ended') sfx.win(); was.current = ph; }, [ph]);
  const left = host.left();
  return (
    <div className="ch" onPointerDown={unlockAudio}>
      <Backdrop lanterns={false} />
      <Stage>
        <div className="ch-host">
          <div className={`ch-hh ${ph === 'lobby' ? '' : 'compact'}`}>
            <div className="ttl">{ph !== 'ended' && <><h1 className="ch-gold">{p.title.en}</h1><h2>{p.title.fr}</h2></>}</div>
            {ph !== 'lobby' && ph !== 'ended' && <div className={`ch-clock ${ph === 'live' && left < 60000 ? 'low' : ''}`} aria-live="off">{fmtTime(left)}{ph === 'paused' && <div style={{ fontSize: 22 }} className="ch-pulse"><B en="Paused" fr="En pause" /></div>}</div>}
            {ph !== 'lobby' && ph !== 'ended' && <Controls host={host} />}
            <div className="ch-ctl">
              <button type="button" className="ch-btn alt" aria-pressed={musicOn()} onClick={() => { unlockAudio(); if (musicOn()) stopMusic(); else startMusic(); force((n) => n + 1); }}><Music size={20} /><B en="Music" fr="Musique" /></button>
              <button type="button" className="ch-btn alt" aria-label="Sound · Son" aria-pressed={!isMuted()} onClick={() => { setMuted(!isMuted()); force((n) => n + 1); }}>{isMuted() ? <VolumeX size={22} /> : <Volume2 size={22} />}</button>
              <Link to={`/hunt/${slug}`} className="ch-btn alt"><B en="Exit" fr="Quitter" /></Link>
            </div>
          </div>
          {ph === 'lobby' && <Lobby host={host} slug={slug} />}
          {(ph === 'live' || ph === 'paused') && <Live host={host} />}
          {ph === 'ended' && <End host={host} slug={slug} />}
        </div>
      </Stage>
    </div>
  );
}

function Controls({ host }: { host: HuntHost }) {
  const [sure, setSure] = useState(false);
  useEffect(() => { if (!sure) return; const t = setTimeout(() => setSure(false), 4000); return () => clearTimeout(t); }, [sure]);
  return (
    <div className="ch-ctl">
      {host.phase === 'live' ? <button type="button" className="ch-btn alt" onClick={() => host.pause()}><B en="Pause" fr="Pause" /></button> : <button type="button" className="ch-btn" onClick={() => host.resume()}><B en="Resume" fr="Reprendre" /></button>}
      <button type="button" className="ch-btn alt" onClick={() => host.addMinutes(5)}><B en="+5 min" fr="+5 min" /></button>
      <button type="button" className="ch-btn danger sm" onClick={() => { if (sure) host.end(); else setSure(true); }}>{sure ? <B en="Confirm end" fr="Confirmer la fin" /> : <B en="End" fr="Terminer" />}</button>
    </div>
  );
}

function Lobby({ host, slug }: { host: HuntHost; slug: string }) {
  const url = joinUrl(host.code), set = host.set;
  const [base, setBase] = useState(publicBase());
  const drafts = host.pack.checkpoints.reduce((n, c) => n + c.cards.filter((k) => !k.enabled).length, 0);
  const teams = host.list, many = teams.length > 12;
  const applyBase = (v: string) => { setBase(v); setPublicBase(v); };
  return (
    <div className="ch-main ch-lobby">
      <div className="ch-panel ch-qrp">
        <div className="ch-h" style={{ fontSize: 34 }}><B stack en="Scan to join" fr="Scannez pour rejoindre" /></div>
        <JoinQr url={url} code={host.code} title={host.pack.title.en} size={360} label="QR" />
        <div className="code" aria-label={`Room code ${host.code.split('').join(' ')}`}>{host.code}</div>
        <div className="url">{shortUrl(joinUrl())}</div>
        <div style={{ fontSize: 20, color: 'var(--muted)' }}>{host.net === 'open' ? <B en="Server connected" fr="Serveur connecté" /> : <span className="ch-pulse"><B en="Connecting…" fr="Connexion…" /></span>}</div>
      </div>
      <div className="ch-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="ch-h" style={{ fontSize: 34 }}><><N n={teams.length} bare en={['Team', 'Teams']} fr={['Équipe', 'Équipes']} /> {teams.length}/{MAX_TEAMS}</></div>
        {!teams.length && <div className="ch-pulse" style={{ margin: 'auto', textAlign: 'center', fontSize: 30, color: 'var(--muted)' }}><B stack en="Waiting for teams to join…" fr="En attente des équipes…" /></div>}
        <div className="ch-teams" style={many ? { gridTemplateColumns: 'repeat(3,1fr)' } : undefined}>
          {teams.map((t) => (
            <div key={t.peer} className={`ch-team ${t.online ? '' : 'off'}`} style={many ? { height: 46, fontSize: 20 } : undefined}>
              <img className="ch-emb" src={img(emblemOf(t.emb).img)} alt={emblemOf(t.emb).name.en} style={many ? { width: 32, height: 32 } : undefined} />
              <span className="nm">{t.name}</span>
              <button type="button" className="x" onClick={() => host.kick(t.peer)} aria-label={`Remove ${t.name} · Retirer ${t.name}`}>✕</button>
            </div>
          ))}
        </div>
      </div>
      <div className="ch-panel ch-set">
        <div className="ch-h"><B en="Settings" fr="Réglages" /></div>
        <Toggle on={set.codes} onChange={(v) => host.configure({ codes: v })} en="Checkpoint secret words" fr="Mots secrets des étapes" />
        <Toggle on={set.drafts} onChange={(v) => host.configure({ drafts: v })} en={`Include draft ${pn(drafts, ['card', 'cards'], ['carte', 'cartes']).en} (${drafts})`} fr={`Inclure ${drafts > 1 ? 'les cartes brouillon' : 'la carte brouillon'} (${drafts})`} disabled={!drafts} />
        <div className="ch-step" role="group" aria-label="Minutes · Minutes">
          <span style={{ flex: 1 }}><B stack en="Countdown (minutes)" fr="Compte à rebours (minutes)" /></span>
          <button type="button" aria-label="−5" onClick={() => host.configure({ minutes: set.minutes - 5 })}>−</button><b>{set.minutes}</b><button type="button" aria-label="+5" onClick={() => host.configure({ minutes: set.minutes + 5 })}>+</button>
        </div>
        <div><label className="ch-lbl" htmlFor="ch-base"><B en="Public URL for the QR" fr="URL publique du QR" /></label>
          <input id="ch-base" className="ch-in" value={base} onChange={(e) => applyBase(e.target.value)} placeholder={envBase()} inputMode="url" /></div>
        <div className="row">
          <button type="button" className="ch-btn alt sm" onClick={() => downloadQrSvg(url, `qr-${host.code}.svg`)}><B en="Download QR (SVG)" fr="Télécharger QR (SVG)" /></button>
          <button type="button" className="ch-btn alt sm" onClick={() => downloadQrPng(url, `qr-${host.code}.png`)}><B en="PNG" fr="PNG" /></button>
        </div>
        <a className="ch-btn alt sm" href={`/hunt/${slug}/print`} target="_blank" rel="noreferrer"><B en="Print checkpoint posters" fr="Imprimer les affiches" /></a>
        <button type="button" className="ch-btn" style={{ minHeight: 76, fontSize: 28, marginTop: 'auto' }} disabled={!teams.some((t) => t.online)} onClick={() => { unlockAudio(); host.start(); }}><B en="Start" fr="Commencer" /></button>
      </div>
    </div>
  );
}

const feedText = (f: FeedItem) => {
  const c = f.card;
  switch (f.kind) {
    case 'join': return { en: `${f.team} joined`, fr: `${f.team} a rejoint`, mark: '🪔' };
    case 'unlock': return { en: `${f.team} opened “${c?.en}”`, fr: `${f.team} a ouvert « ${c?.fr} »`, mark: '🔓' };
    case 'solve': return { en: `${f.team} solved ${c?.en} ✨`, fr: `${f.team} a résolu ${c?.fr} ✨`, mark: '✨' };
    case 'diya': return { en: `${f.team} lit a diya: ${c?.en}`, fr: `${f.team} a allumé un diya : ${c?.fr}`, mark: '🪔' };
    case 'hint': return { en: `${f.team} used a hint on ${c?.en}`, fr: `${f.team} a pris un indice : ${c?.fr}`, mark: '💡' };
    default: return { en: `${f.team} left`, fr: `${f.team} est partie`, mark: '' };
  }
};

function Live({ host }: { host: HuntHost }) {
  const rank = host.ranking(), p = host.pack, total = host.totalCards();
  const n = rank.length, cols = n <= 10 ? 1 : n <= 20 ? 2 : 3, rows = Math.max(1, Math.ceil(n / cols)), dense = n > 6;
  const feed = host.feed.slice(-7);
  return (
    <div className="ch-main ch-live">
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="ch-cpleg">{p.checkpoints.map((cp) => <span key={cp.id} className="ch-chip"><img className="ch-emb" src={img(ICON_IMG[cp.icon])} alt="" />{cp.title.en}<em className="ch-fr"> · {cp.title.fr}</em></span>)}</div>
        {!n && <div className="ch-panel" style={{ margin: 'auto', fontSize: 30 }}><B stack en="No teams yet" fr="Aucune équipe" /></div>}
        <div className={`ch-board ${dense ? 'dense' : ''}`} style={{ ['--rows' as string]: rows, flex: 1 }}>
          {rank.map((t, i) => <Row key={t.peer} t={t} i={i} total={total} />)}
        </div>
      </div>
      <div className="ch-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="ch-h" style={{ fontSize: 30 }}><B en="Live feed" fr="En direct" /></div>
        <div className="ch-feed" aria-live="polite">
          {feed.map((f) => { const x = feedText(f); return <div key={f.id} className={`it ${f.kind}`}><img className="ch-emb" src={img(emblemOf(f.emb).img)} alt="" /><span>{x.en}<em className="ch-fr">{x.fr}</em></span></div>; })}
        </div>
      </div>
    </div>
  );
}

function Row({ t, i, total }: { t: PubTeam; i: number; total: number }) {
  return (
    <div className={`ch-row ${i === 0 && t.score > 0 ? 'first' : ''}`} style={t.online ? undefined : { opacity: 0.6 }}>
      <div className="rk">{i + 1}</div>
      <div className="nm"><img className="ch-emb" src={img(emblemOf(t.emb).img)} alt="" /><span>{t.name}</span></div>
      <div className="sc">{t.score}<small><N n={t.hints} en={['hint', 'hints']} fr={['indice', 'indices']} /></small></div>
      <div className="meta">
        <div className="dy" aria-label={`${t.cps.filter(Boolean).length}/${t.cps.length}`}>{t.cps.map((on, k) => <Diya key={k} lit={on} size={44} />)}</div>
        <div className="cd"><div className="ch-prog" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={t.solved}><b style={{ width: `${total ? (t.solved / total) * 100 : 0}%` }} /></div>{t.solved}/{total}</div>
      </div>
    </div>
  );
}

function End({ host, slug }: { host: HuntHost; slug: string }) {
  const rank = host.ranking(), top = rank.slice(0, 3), rest = rank.slice(3), cps = host.pack.checkpoints;
  const order = [top[1], top[0], top[2]].map((t, i) => (t ? { t, place: [2, 1, 3][i]! } : null)).filter(Boolean) as { t: PubTeam; place: number }[];
  return (
    <div className="ch-end">
      <Fireworks />
      <h1 className="ch-gold" style={{ font: '800 84px/1 Fraunces,serif', margin: '-90px 0 0', position: 'relative', zIndex: 2, textAlign: 'center' }}>Light up the celebration<em style={{ display: 'block', fontSize: 46, fontWeight: 600, color: '#ffd6ec', WebkitTextFillColor: '#ffd6ec', marginTop: 6 }}>Allumons la fête</em></h1>
      <div style={{ display: 'flex', gap: 22, margin: '18px 0 0', position: 'relative', zIndex: 2 }}>{cps.map((cp) => <div key={cp.id} style={{ textAlign: 'center' }}><Diya lit size={96} /></div>)}</div>
      <div className="ch-podium">
        {order.map(({ t, place }) => (
          <div key={t.peer} className={`ch-pod p${place}`}>
            <div className="pl">{place}</div>
            <img className="ch-emb" src={img(emblemOf(t.emb).img)} alt="" />
            <div className="nm">{t.name}</div>
            <div className="sc">{t.score}</div>
            <div style={{ fontSize: 22, color: 'var(--muted)' }}>{t.solved}/{host.totalCards()} <N n={host.totalCards()} bare en={['card', 'cards']} fr={['carte', 'cartes']} /> · <N n={t.hints} en={['hint', 'hints']} fr={['indice', 'indices']} /></div>
          </div>
        ))}
        {!order.length && <div className="ch-panel" style={{ fontSize: 34 }}><B stack en="No teams played" fr="Aucune équipe n’a joué" /></div>}
      </div>
      {rest.length > 0 && <div className="ch-rest">{rest.slice(0, 14).map((t, i) => <span key={t.peer} className="ch-chip"><b>{i + 4}</b><img className="ch-emb" src={img(emblemOf(t.emb).img)} alt="" />{t.name} · {t.score}</span>)}</div>}
      <div className="ch-ctl" style={{ position: 'absolute', bottom: 0, right: 0, zIndex: 3 }}>
        <button type="button" className="ch-btn" onClick={() => { HuntHost.forget(slug); location.reload(); }}><B en="New hunt" fr="Nouvelle chasse" /></button>
        <Link to={`/hunt/${slug}`} className="ch-btn alt"><B en="Back to hub" fr="Retour" /></Link>
      </div>
      <BiText v={host.pack.title} className="ch-sr" />
    </div>
  );
}
