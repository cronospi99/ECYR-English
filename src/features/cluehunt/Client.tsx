import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { makeId } from '@/lib/relay';
import { loadPack, packSlugs } from '@/lib/clueHunt/packs';
import type { HuntCard, HuntCheckpoint, HuntOpts, HuntPack, TeamProg } from '@/lib/clueHunt/types';
import { allCards, cardsOf, cleanProg, cpDone, cpDoneCount, emptyProg, hintCount, isUnlocked, lastSolveAt, score, solvedCount, tryUnlock, trySolve, useHint, type SolveResult } from '@/lib/clueHunt/progress';
import { B, BiText, Backdrop, Diya, fmtElapsed, fmtTime, useAppReady, useHuntFonts, useLive, useTick } from './ui';
import { EMBLEMS, ICON_IMG, emblemOf, img, shortLabel } from './art';
import { HuntClient, cleanName } from './live';
import { sfx, unlockAudio } from './sfx';

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};
const savedName = () => ls.get('hunt:name');
const savedEmb = () => { const e = ls.get('hunt:emb'); return EMBLEMS.some((x) => x.id === e) ? e : 'diya'; };

/* ------------------------------------------------------------------ join */
export function HuntJoin() {
  useHuntFonts(); useAppReady();
  const { code: param } = useParams();
  const nav = useNavigate();
  const [code, setCode] = useState((param ?? '').toUpperCase());
  const [name, setName] = useState(savedName());
  const [emb, setEmb] = useState(savedEmb());
  const ok = /^[A-Z0-9]{4,8}$/.test(code) && cleanName(name).length >= 2;
  const go = () => { if (!ok) return; unlockAudio(); ls.set('hunt:name', cleanName(name)); ls.set('hunt:emb', emb); nav(`/hunt/play/${code}`); };
  const slugs = packSlugs();
  return (
    <div className="ch scroll">
      <Backdrop />
      <main className="ch-page">
        <div className="ch-hero">
          <img className="orn" src={img('x_lotusorn')} alt="" />
          <h1 className="ch-gold">Diwali Treasure &amp; Clue Hunt</h1>
          <h2>Chasse au Trésor et Énigmes</h2>
        </div>
        <form className="ch-panel" onSubmit={(e) => { e.preventDefault(); go(); }} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label className="ch-lbl" htmlFor="h-code"><B en="Room code" fr="Code de la salle" /></label>
            <input id="h-code" className="ch-in" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder="ABCD" autoCapitalize="characters" autoComplete="off" inputMode="text" style={{ textAlign: 'center', letterSpacing: '.2em', fontSize: 30, fontWeight: 800, minHeight: 64 }} />
          </div>
          <div>
            <label className="ch-lbl" htmlFor="h-name"><B en="Team name" fr="Nom de l’équipe" /></label>
            <input id="h-name" className="ch-in" value={name} onChange={(e) => setName(e.target.value.slice(0, 18))} placeholder="Team Lotus" autoComplete="off" autoFocus={!!param} />
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="ch-lbl"><B en="Team emblem" fr="Emblème de l’équipe" /></legend>
            <div className="ch-emgrid">
              {EMBLEMS.map((e) => (
                <button key={e.id} type="button" className="ch-em" aria-pressed={emb === e.id} onClick={() => setEmb(e.id)}>
                  <img src={img(e.img)} alt="" /><span>{e.name.en}<em className="ch-fr" style={{ display: 'block' }}>{e.name.fr}</em></span>
                </button>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="ch-btn" style={{ minHeight: 60, fontSize: 22 }} disabled={!ok}><B en="Join" fr="Rejoindre" /></button>
        </form>
        <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
          {slugs.map((s) => <Link key={s} to={`/hunt/local/${s}`} className="ch-btn alt" onClick={unlockAudio}><B en="Play on this device" fr="Jouer sur cet appareil" /></Link>)}
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, margin: 0 }}><B stack en="No room? Your progress stays on this phone." fr="Pas de salle ? Ta progression reste sur ce téléphone." /></p>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ live phone */
export function HuntPlay() {
  useHuntFonts(); useAppReady();
  const { code = '' } = useParams();
  const nav = useNavigate();
  const [client, setClient] = useState<HuntClient | null>(null);
  useEffect(() => {
    const name = savedName();
    if (cleanName(name).length < 2) { nav(`/hunt/join/${code}`, { replace: true }); return; }
    let peer = '';
    try { peer = sessionStorage.getItem('hunt:peer:' + code) ?? ''; } catch { /* ignore */ }
    if (!peer) { peer = 'p' + makeId(); try { sessionStorage.setItem('hunt:peer:' + code, peer); } catch { /* ignore */ } }
    const c = new HuntClient(code.toUpperCase(), peer, cleanName(name), savedEmb());
    setClient(c);
    if (import.meta.env.DEV) (window as unknown as { __hc: unknown }).__hc = c;
    return () => c.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);
  useLive(client); useTick(1000);
  if (!client) return <div className="ch"><Backdrop /></div>;
  if (client.status !== 'ok') {
    return (
      <div className="ch"><Backdrop /><div className="ch-page ch-wait"><div className="big"><B stack en={client.status === 'kicked' ? 'You were removed from the room.' : 'The room is full.'} fr={client.status === 'kicked' ? 'Tu as été retiré de la salle.' : 'La salle est pleine.'} /></div>
        <Link to="/hunt/join" className="ch-btn" style={{ marginTop: 20 }}><B en="Back" fr="Retour" /></Link></div></div>
    );
  }
  const ph = client.phase, pack = client.pack;
  const waiting = !client.pub || !pack;
  const finished = !!pack && ph !== 'lobby' && allCards(pack, client.opts).length > 0 && solvedCount(client.prog, pack, client.opts) === allCards(pack, client.opts).length;
  return (
    <div className="ch scroll">
      <Backdrop lanterns={false} />
      <main className="ch-page">
        {client.net !== 'open' && <div role="status" className="ch-chip ch-pulse" style={{ marginBottom: 8 }}><B en="Connecting…" fr="Connexion…" /></div>}
        {waiting && <div className="ch-wait"><div className="big ch-pulse"><B stack en="Joining the room…" fr="Connexion à la salle…" /></div></div>}
        {!waiting && ph === 'lobby' && (
          <div className="ch-wait">
            <img src={img(emblemOf(client.emb).img)} alt="" style={{ width: 120, height: 120, objectFit: 'contain' }} />
            <h1 className="serif" style={{ margin: '8px 0', fontSize: 34 }}>{client.name}</h1>
            <div className="big ch-pulse"><B stack en="Waiting for the teacher to start…" fr="En attente du départ de l’enseignant…" /></div>
            <p style={{ color: 'var(--muted)' }}><B en={`${client.pub!.teams.length} teams in the room`} fr={`${client.pub!.teams.length} équipes dans la salle`} /></p>
            <div className="ch-diyas">{pack!.checkpoints.map((c) => <Diya key={c.id} lit={false} size={44} />)}</div>
          </div>
        )}
        {!waiting && ph !== 'lobby' && (ph === 'ended' || finished) && <Final pack={pack!} prog={client.prog} opts={client.opts} name={client.name} emb={client.emb} total={client.elapsed()} ended={ph === 'ended'} />}
        {!waiting && (ph === 'live' || ph === 'paused') && !finished && (
          <>
            <TopBar name={client.name} emb={client.emb} pack={pack!} prog={client.prog} opts={client.opts} time={fmtTime(client.left())} rank={client.rank()} />
            <Board pack={pack!} prog={client.prog} opts={client.opts} api={{ unlock: (c, t) => client.unlock(c, t), answer: (c, t) => client.answer(c, t), hint: (c) => client.hint(c) }} />
          </>
        )}
      </main>
      {ph === 'paused' && <div className="ch-pause" role="alert"><div><div style={{ fontSize: 60 }} aria-hidden>⏸</div><B stack en="Paused by your teacher" fr="En pause par ton enseignant" /></div></div>}
    </div>
  );
}

/* ------------------------------------------------------------------ on this device */
export function HuntLocal() {
  useHuntFonts(); useAppReady();
  const { pack: slug = '' } = useParams();
  const [pack, setPack] = useState<HuntPack | null | undefined>(undefined);
  useEffect(() => { let on = true; void loadPack(slug).then((p) => on && setPack(p)); return () => { on = false; }; }, [slug]);
  if (pack === null) return <div className="ch"><div className="ch-wait" style={{ paddingTop: '30vh' }}><B stack en="Hunt not found" fr="Chasse introuvable" /></div></div>;
  if (!pack) return <div className="ch"><Backdrop /></div>;
  return <LocalGame pack={pack} slug={slug} />;
}
const LOCAL_OPTS: HuntOpts = { codes: false, drafts: false };
function LocalGame({ pack, slug }: { pack: HuntPack; slug: string }) {
  const key = `hunt:local:${slug}`;
  const load = () => { try { const v = JSON.parse(ls.get(key) || 'null') as { prog: TeamProg; start: number } | null; return v ? { prog: cleanProg(v.prog), start: Number(v.start) || Date.now() } : { prog: emptyProg(), start: Date.now() }; } catch { return { prog: emptyProg(), start: Date.now() }; } };
  const st = useRef(load());
  const [, force] = useState(0);
  useTick(1000);
  const persist = () => { ls.set(key, JSON.stringify(st.current)); force((n) => n + 1); };
  const api = useMemo(() => ({
    unlock: (cp: string, text: string) => { const ok = tryUnlock(pack, st.current.prog, cp, text); persist(); return ok; },
    answer: (card: string, text: string) => { const r = trySolve(pack, st.current.prog, card, text, LOCAL_OPTS, Date.now() - st.current.start); persist(); return r; },
    hint: (card: string) => { useHint(pack, st.current.prog, card, LOCAL_OPTS); persist(); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [pack]);
  const name = savedName() || 'Your team';
  const emb = savedEmb();
  const total = allCards(pack, LOCAL_OPTS).length, done = solvedCount(st.current.prog, pack, LOCAL_OPTS) === total;
  return (
    <div className="ch scroll">
      <Backdrop lanterns={false} />
      <main className="ch-page">
        {done ? <Final pack={pack} prog={st.current.prog} opts={LOCAL_OPTS} name={name} emb={emb} total={lastSolveAt(st.current.prog)} ended local onReset={() => { st.current = { prog: emptyProg(), start: Date.now() }; persist(); }} />
          : (
            <>
              <TopBar name={name} emb={emb} pack={pack} prog={st.current.prog} opts={LOCAL_OPTS} time={fmtElapsed(Date.now() - st.current.start)} local />
              <Board pack={pack} prog={st.current.prog} opts={LOCAL_OPTS} api={api} />
              <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}><B stack en="Your progress is saved on this device." fr="Ta progression est sauvegardée sur cet appareil." /></p>
            </>
          )}
        <Link to="/hunt/join" className="ch-btn alt" style={{ marginTop: 12, display: 'flex' }}><B en="Back" fr="Retour" /></Link>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ shared pieces */
function TopBar({ name, emb, pack, prog, opts, time, rank, local }: { name: string; emb: string; pack: HuntPack; prog: TeamProg; opts: HuntOpts; time: string; rank?: number; local?: boolean }) {
  const total = allCards(pack, opts).length, done = solvedCount(prog, pack, opts);
  return (
    <header className="ch-bar" style={{ flexWrap: 'wrap' }}>
      <div className="nm"><img className="ch-emb" src={img(emblemOf(emb).img)} alt="" style={{ width: 34, height: 34 }} /><span>{name}</span></div>
      <span className="ch-chip" aria-label="Points"><b>{score(prog)}</b> pts</span>
      <span className="ch-chip" aria-label={local ? 'Time · Temps' : 'Time left · Temps restant'}>⏱ {time}</span>
      <div style={{ flexBasis: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="ch-prog" style={{ flex: 1 }} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Cards · Cartes"><b style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{done}/{total} <B en="cards" fr="cartes" />{rank ? <> · #{rank}</> : null}</span>
        <span style={{ display: 'flex', gap: 2 }}>{pack.checkpoints.map((cp) => <Diya key={cp.id} lit={cpDone(prog, cp, opts)} size={26} />)}</span>
      </div>
    </header>
  );
}

interface Api { unlock: (cp: string, text: string) => boolean; answer: (card: string, text: string) => SolveResult; hint: (card: string) => void }

function Board({ pack, prog, opts, api }: { pack: HuntPack; prog: TeamProg; opts: HuntOpts; api: Api }) {
  const first = pack.checkpoints.find((c) => isUnlocked(prog, c, opts) && !cpDone(prog, c, opts)) ?? pack.checkpoints[0];
  const [open, setOpen] = useState<string | null>(null);
  const cur = open ?? first?.id ?? null;
  const [toast, setToast] = useState('');
  const say = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(''), 2600); }, []);
  return (
    <>
      {pack.checkpoints.map((cp) => (
        <Checkpoint key={cp.id} cp={cp} pack={pack} prog={prog} opts={opts} api={api} open={cur === cp.id} onToggle={() => setOpen(cur === cp.id ? '' : cp.id)} say={say} />
      ))}
      {toast && <div className="ch-toast" role="status">{toast}</div>}
    </>
  );
}

function Checkpoint({ cp, pack, prog, opts, api, open, onToggle, say }: { cp: HuntCheckpoint; pack: HuntPack; prog: TeamProg; opts: HuntOpts; api: Api; open: boolean; onToggle: () => void; say: (m: string) => void }) {
  const unlocked = isUnlocked(prog, cp, opts), done = cpDone(prog, cp, opts), cards = cardsOf(cp, opts);
  const solved = cards.filter((c) => prog.solved[c.id]).length;
  const [code, setCode] = useState(''), [bad, setBad] = useState(false);
  const was = useRef(done);
  useEffect(() => { if (done && !was.current) { sfx.diya(); say('🪔 Diya lit! · Diya allumé !'); } was.current = done; }, [done, say]);
  const tryCode = () => {
    unlockAudio();
    if (api.unlock(cp.id, code)) { sfx.unlock(); say('🔓 Checkpoint opened! · Étape ouverte !'); setBad(false); setCode(''); } else { sfx.bad(); setBad(true); }
  };
  return (
    <section className={`ch-cp ${done ? 'done' : ''}`} aria-label={cp.title.en}>
      <button type="button" className="hd" aria-expanded={open} onClick={onToggle}>
        <img className="ico" src={img(ICON_IMG[cp.icon])} alt="" style={unlocked ? undefined : { filter: 'grayscale(1) brightness(.5)' }} />
        <span className="tt"><B stack en={cp.title.en} fr={cp.title.fr} /></span>
        <span className="st">{!unlocked ? <B stack en="🔒 Locked" fr="Verrouillé" /> : done ? <B stack en="✓ Done" fr="Terminé" /> : <>{solved}/{cards.length}</>}<Diya lit={done} size={30} /></span>
      </button>
      {open && (
        <div className="body">
          <p style={{ margin: 0, color: 'var(--muted)' }}><BiText v={cp.blurb} stack /></p>
          {!unlocked ? (
            <form className="ch-lock" onSubmit={(e) => { e.preventDefault(); tryCode(); }}>
              <p><B stack en="Find the poster hidden in the room and type its code word." fr="Trouvez l’affiche cachée dans la salle et tapez son mot-code." /></p>
              <div><label className="ch-lbl" htmlFor={`cd-${cp.id}`}><B en="Code word" fr="Mot-code" /></label>
                <input id={`cd-${cp.id}`} className="ch-in" value={code} onChange={(e) => { setCode(e.target.value); setBad(false); }} autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-invalid={bad} aria-describedby={bad ? `cde-${cp.id}` : undefined} style={{ textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 800 }} /></div>
              {bad && <div id={`cde-${cp.id}`} role="alert" style={{ color: 'var(--bad)', fontWeight: 700 }}><B stack en="That is not the code word. Look again!" fr="Ce n’est pas le mot-code. Cherche encore !" /></div>}
              <button type="submit" className="ch-btn" disabled={!code.trim()}><B en="Unlock" fr="Débloquer" /></button>
            </form>
          ) : cards.map((c) => <Card key={c.id} c={c} pack={pack} prog={prog} api={api} say={say} />)}
        </div>
      )}
    </section>
  );
}

type Fb = { kind: 'ok' | 'bad' | 'nudge' | 'empty'; n: number } | null;
function Card({ c, pack, prog, api, say }: { c: HuntCard; pack: HuntPack; prog: TeamProg; api: Api; say: (m: string) => void }) {
  const s = prog.solved[c.id];
  const [val, setVal] = useState(''), [fb, setFb] = useState<Fb>(null), [ask, setAsk] = useState(false);
  const hinted = prog.hints.includes(c.id);
  const label = s ? c.label : shortLabel(c);
  const check = () => {
    unlockAudio();
    if (!val.trim()) { setFb({ kind: 'empty', n: Date.now() }); return; }
    const r = api.answer(c.id, val);
    if (r.ok) { sfx.ok(); setFb(null); say(`+${r.pts} pts ✨`); }
    else if (r.reason === 'nudge') { sfx.tap(); setFb({ kind: 'nudge', n: Date.now() }); }
    else { sfx.bad(); setFb({ kind: 'bad', n: Date.now() }); }
  };
  return (
    <article className={`ch-card ${s ? 'solved' : ''}`} aria-label={label.en}>
      <div className="lb"><span>{label.en}<em className="ch-fr"> · {label.fr}</em></span>{s && <span className="pts">+{s.pts}</span>}</div>
      <p className="en" lang="en">{c.prompt.en}</p>
      <p className="fr" lang="fr">{c.prompt.fr}</p>
      {s ? (
        <div className="ch-ans" role="status">
          <b>✓ {c.answer.en}</b>{c.answer.fr !== c.answer.en && <em className="ch-fr" style={{ fontFamily: 'Fraunces,serif' }}> · {c.answer.fr}</em>}
          <div className="ff">💡 {c.funFact.en}<br /><em>{c.funFact.fr}</em></div>
        </div>
      ) : (
        <>
          <form onSubmit={(e) => { e.preventDefault(); check(); }}>
            <label className="ch-lbl" htmlFor={`a-${c.id}`} style={{ marginTop: 12, color: '#6b3a8a' }}><B en="Your answer" fr="Ta réponse" /></label>
            <div className="row" style={{ marginTop: 0 }}>
              <input id={`a-${c.id}`} className="ch-in" value={val} onChange={(e) => { setVal(e.target.value); setFb(null); }} autoComplete="off" autoCapitalize="off" spellCheck={false} enterKeyHint="send" />
              <button type="submit" className="ch-btn"><B stack en="Check" fr="Vérifier" /></button>
            </div>
          </form>
          <div className={`ch-fb ${fb?.kind === 'bad' || fb?.kind === 'empty' ? 'bad' : ''}`} role="status" aria-live="polite">
            {fb?.kind === 'bad' && <B en="Not yet. Try again!" fr="Pas encore. Essaie encore !" />}
            {fb?.kind === 'nudge' && <span style={{ color: '#7a4a00' }}><B en="Almost! Write it in English or French" fr="Presque ! Écris-le en anglais ou en français" /></span>}
            {fb?.kind === 'empty' && <B en="Write an answer" fr="Écris une réponse" />}
          </div>
          {hinted ? (
            <div className="ch-hint" role="note">💡 {c.hint.en}<br /><span className="fr">{c.hint.fr}</span></div>
          ) : ask ? (
            <div className="ch-hint" role="alert">
              <B stack en={`A hint costs ${pack.scoring.hintCost} points. Use it?`} fr={`Un indice coûte ${pack.scoring.hintCost} points. L’utiliser ?`} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" className="ch-btn sm" onClick={() => { api.hint(c.id); setAsk(false); }}><B en="Yes" fr="Oui" /></button>
                <button type="button" className="ch-btn sm alt" style={{ color: '#4a1a00', borderColor: '#4a1a00' }} onClick={() => setAsk(false)}><B en="No" fr="Non" /></button>
              </div>
            </div>
          ) : (
            <button type="button" className="ch-link" onClick={() => setAsk(true)}>💡 <B en="Hint" fr="Indice" /> (−{pack.scoring.hintCost})</button>
          )}
        </>
      )}
    </article>
  );
}

function Final({ pack, prog, opts, name, emb, total, ended, local, onReset }: { pack: HuntPack; prog: TeamProg; opts: HuntOpts; name: string; emb: string; total: number; ended: boolean; local?: boolean; onReset?: () => void }) {
  const done = solvedCount(prog, pack, opts), n = allCards(pack, opts).length;
  const t = lastSolveAt(prog) || total;
  useEffect(() => { if (ended) sfx.win(); }, [ended]);
  return (
    <div className="ch-final" aria-live="polite">
      <div className="ch-diyas">{pack.checkpoints.map((cp) => <Diya key={cp.id} lit={cpDone(prog, cp, opts)} size={56} />)}</div>
      <h1 className="ch-gold" style={{ font: '800 30px/1.1 Fraunces,serif', margin: 0 }}>{ended ? <B stack en="Well done!" fr="Bien joué !" /> : <B stack en="All cards solved!" fr="Toutes les cartes résolues !" />}</h1>
      <img src={img(emblemOf(emb).img)} alt="" style={{ width: 96, height: 96, objectFit: 'contain', marginTop: 8 }} />
      <div className="nm">{name}</div>
      <div className="sc ch-gold">{score(prog)}</div>
      <div style={{ color: 'var(--muted)', fontWeight: 700 }}><B en="points" fr="points" /></div>
      <div className="stats">
        <div><b>{done}/{n}</b><span><B stack en="cards" fr="cartes" /></span></div>
        <div><b>{cpDoneCount(prog, pack, opts)}/{pack.checkpoints.length}</b><span><B stack en="diyas lit" fr="diyas allumés" /></span></div>
        <div><b>{fmtElapsed(t)}</b><span><B stack en="time" fr="temps" /></span></div>
      </div>
      <div style={{ color: 'var(--muted)' }}><B en={`${hintCount(prog)} hints used`} fr={`${hintCount(prog)} indices utilisés`} /></div>
      <div className="ch-show"><B stack en="Show this screen to your teacher" fr="Montre cet écran à ton enseignant" /></div>
      {local && onReset && <button type="button" className="ch-btn alt" style={{ marginTop: 14 }} onClick={onReset}><B en="Start over" fr="Recommencer" /></button>}
    </div>
  );
}
