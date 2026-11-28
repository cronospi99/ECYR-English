import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { extrasOf, loadPack } from '@/lib/clueHunt/packs';
import type { HuntPack } from '@/lib/clueHunt/types';
import { B, BiText, Backdrop, useAppReady, useHuntFonts } from './ui';
import { img } from './art';

/* Teacher hub: pick the mode, support links (teacher-only ones too) and what is still pending confirmation. */
export default function HuntHub() {
  useHuntFonts(); useAppReady();
  const { pack: slug = '' } = useParams();
  const [pack, setPack] = useState<HuntPack | null | undefined>(undefined);
  const [showPend, setShowPend] = useState(false);
  useEffect(() => { let on = true; void loadPack(slug).then((p) => on && setPack(p)); return () => { on = false; }; }, [slug]);
  if (pack === null) return <div className="ch"><Backdrop /><div className="ch-wait" style={{ position: 'relative', paddingTop: '30vh' }}><B stack en="Hunt not found" fr="Chasse introuvable" /></div></div>;
  if (!pack) return <div className="ch"><Backdrop /></div>;
  const ex = extrasOf(slug);
  const pendingCards = pack.checkpoints.flatMap((cp) => cp.cards.filter((c) => c.needsConfirmation || !c.enabled).map((c) => ({ cp, c })));
  const active = pack.checkpoints.reduce((n, cp) => n + cp.cards.filter((c) => c.enabled).length, 0);
  return (
    <div className="ch scroll">
      <Backdrop />
      <main className="ch-page" style={{ maxWidth: 1100 }}>
        <div className="ch-top"><Link to="/games" className="ch-btn alt sm" aria-label="Back to games · Retour aux jeux"><ArrowLeft size={18} /><B en="Games" fr="Jeux" /></Link></div>
        <div className="ch-hero" style={{ paddingTop: 8 }}>
          <img className="orn" src={img('x_lotusorn')} alt="" />
          <h1 className="ch-gold">{pack.title.en}</h1>
          <h2>{pack.title.fr}</h2>
          <p style={{ maxWidth: '60ch' }}><BiText v={pack.subtitle} stack /></p>
        </div>
        <h2 className="ch-h" style={{ fontSize: 24 }}><B en="Choose a mode" fr="Choisissez un mode" /></h2>
        <div className="ch-hub">
          <Link to={`/hunt/${slug}/host`} className="ch-panel ch-mode">
            <img src={img('diya')} alt="" />
            <h3><B stack en="Treasure & Clue Hunt (QR)" fr="Chasse au trésor et énigmes (QR)" /></h3>
            <p><B stack en={`Teams join from their phones with a QR code. ${active} ${active === 1 ? 'card' : 'cards'} in ${pack.checkpoints.length} ${pack.checkpoints.length === 1 ? 'checkpoint' : 'checkpoints'}, live scoreboard on the big screen.`} fr={`Les équipes rejoignent depuis leur téléphone avec un QR code. ${active} cartes dans ${pack.checkpoints.length} étapes, tableau en direct sur grand écran.`} /></p>
            <span className="ch-btn"><B en="Open the host screen" fr="Ouvrir l’écran de l’animateur" /></span>
          </Link>
          {ex.bingo && (
            <Link to={`/hunt/${slug}/bingo`} className="ch-panel ch-mode">
              <img src={img('lantern')} alt="" />
              <h3><B stack en={ex.bingo.title.en} fr={ex.bingo.title.fr} /></h3>
              <p><BiText v={ex.bingo.blurb} stack /></p>
              <span className="ch-btn"><B en="Play on the big screen" fr="Jouer sur grand écran" /></span>
            </Link>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, margin: '16px 0', flexWrap: 'wrap' }}>
          <a className="ch-btn alt" href={`/hunt/${slug}/print`} target="_blank" rel="noreferrer"><B en="Print checkpoint posters" fr="Imprimer les affiches" /></a>
          <Link className="ch-btn alt" to="/hunt/join"><B en="Student join page" fr="Page des élèves" /></Link>
        </div>
        <div className="ch-hub" style={{ alignItems: 'start' }}>
          <section className="ch-panel" aria-labelledby="sl">
            <h2 id="sl" className="ch-h"><B en="Support links" fr="Liens d’appui" /></h2>
            <ul style={{ paddingLeft: 18, margin: '10px 0 0' }}>
              {pack.supportLinks.map((l) => (
                <li key={l.url} style={{ margin: '8px 0' }}>
                  <a href={l.url} target="_blank" rel="noreferrer">{l.label.en}</a><br /><em className="ch-fr" style={{ fontSize: 14 }}>{l.label.fr}</em>
                  {l.teacherOnly && <span className="ch-chip" style={{ marginLeft: 8, fontSize: 12, padding: '2px 10px' }}><B en="Teacher only" fr="Enseignants" /></span>}
                </li>
              ))}
            </ul>
          </section>
          <section className="ch-panel" aria-labelledby="pd">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <h2 id="pd" className="ch-h" style={{ margin: 0 }}><B en="Teacher notes" fr="Notes de l’enseignant" /></h2>
              <button type="button" className="ch-btn alt sm" aria-expanded={showPend} aria-controls="pd-body" onClick={() => setShowPend((v) => !v)}>
                {showPend ? <B en="Hide" fr="Masquer" /> : <B en={`Show (${pendingCards.length + pack.pending.length})`} fr={`Afficher (${pendingCards.length + pack.pending.length})`} />}
              </button>
            </div>
            {showPend && (
              <div id="pd-body">
                <p style={{ margin: '10px 0 0', color: 'var(--muted)', fontSize: 14 }}><B stack en="Pending confirmation. For the teacher only: students never see this." fr="À confirmer. Pour l’enseignant uniquement : les élèves ne voient jamais ceci." /></p>
                {pendingCards.length > 0 && (
                  <ul className="ch-pend">
                    {pendingCards.map(({ c }) => <li key={c.id}><b>{c.label.en}</b>: <em>{c.enabled ? 'needs confirmation · à confirmer' : 'draft, off by default · brouillon, désactivé'}</em></li>)}
                  </ul>
                )}
                <ul className="ch-pend" lang="es">{pack.pending.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

/* The Bingo (a standalone HTML game) full screen; its back button returns to the hub. */
export function HuntBingo() {
  const { pack: slug = '' } = useParams();
  const nav = useNavigate();
  const ex = extrasOf(slug);
  useAppReady();
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { source?: string; type?: string } | null;
      if (e.origin !== location.origin || d?.source !== 'ecyr-game' || d.type !== 'exit') return;
      if (document.fullscreenElement) void document.exitFullscreen();
      nav(`/hunt/${slug}`);
    };
    addEventListener('message', onMsg);
    document.title = `${ex.bingo?.title.en ?? 'Bingo'} · ECYR English`;
    return () => { removeEventListener('message', onMsg); document.title = 'ECYR English'; };
  }, [nav, slug, ex.bingo]);
  if (!ex.bingo) return null;
  return <div className="fixed inset-0 bg-black"><iframe src={ex.bingo.src} title={ex.bingo.title.en} allow="autoplay; fullscreen" className="h-full w-full border-0" /></div>;
}
