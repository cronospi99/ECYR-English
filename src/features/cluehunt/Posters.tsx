import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadPack } from '@/lib/clueHunt/packs';
import type { HuntCard, HuntPack } from '@/lib/clueHunt/types';
import { B, useAppReady, useHuntFonts } from './ui';
import { ICON_IMG, img, shortLabel } from './art';

/* Printable A4: one poster per checkpoint (secret word huge) and, optionally, the cut-out cards. */
export default function Posters() {
  useHuntFonts(); useAppReady();
  const { pack: slug = '' } = useParams();
  const [pack, setPack] = useState<HuntPack | null | undefined>(undefined);
  const [cards, setCards] = useState(false), [drafts, setDrafts] = useState(false);
  useEffect(() => { let on = true; void loadPack(slug).then((p) => on && setPack(p)); return () => { on = false; }; }, [slug]);
  if (!pack) return <div className="ch ch-print scroll"><div className="ch-wait" style={{ color: '#2a0c4a' }}>{pack === null ? 'Not found · Introuvable' : '…'}</div></div>;
  const strips: { c: HuntCard; cp: string }[] = pack.checkpoints.flatMap((cp) => cp.cards.filter((c) => c.enabled || drafts).map((c) => ({ c, cp: cp.title.en })));
  const pages: typeof strips[] = [];
  for (let i = 0; i < strips.length; i += 5) pages.push(strips.slice(i, i + 5));
  return (
    <div className="ch ch-print scroll">
      <div className="ch-printbar">
        <Link to={`/hunt/${slug}`} style={{ color: '#ffd977' }}><B en="Back" fr="Retour" /></Link>
        <button type="button" className="ch-btn sm" onClick={() => window.print()}><B en="Print" fr="Imprimer" /></button>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={cards} onChange={(e) => setCards(e.target.checked)} style={{ width: 22, height: 22 }} /><B en="Cut-out cards pages" fr="Pages de cartes à découper" /></label>
        {cards && <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={drafts} onChange={(e) => setDrafts(e.target.checked)} style={{ width: 22, height: 22 }} /><B en="Include drafts" fr="Inclure les brouillons" /></label>}
      </div>
      {pack.checkpoints.map((cp) => (
        <section key={cp.id} className="ch-sheet" aria-label={cp.title.en}>
          <div style={{ font: '700 6mm Barlow', color: '#8f3d0e' }}>{pack.title.en} · {pack.title.fr}</div>
          <img className="ic" src={img(ICON_IMG[cp.icon])} alt="" />
          <div className="big">{cp.code}</div>
          <h2>{cp.title.en}</h2>
          <h3>{cp.title.fr}</h3>
          <p style={{ fontSize: '6mm', maxWidth: '150mm', margin: '8mm 0 0' }}>Type this secret word on your phone.<br /><em style={{ color: '#8f3d0e' }}>Tapez ce mot secret sur votre téléphone.</em></p>
          <div className="tag">🪔 Treasure &amp; Clue Hunt · Chasse au Trésor</div>
        </section>
      ))}
      {cards && pages.map((pg, i) => (
        <section key={i} className="ch-sheet" style={{ justifyContent: 'flex-start' }}>
          <h2 style={{ fontSize: '9mm', marginBottom: '5mm' }}>{pack.title.en} · ✂ {i + 1}/{pages.length}</h2>
          <div className="ch-strips">
            {pg.map(({ c }) => { const l = shortLabel(c); return <div key={c.id} className="ch-strip"><b>{l.en} · {l.fr}</b><div>{c.prompt.en}</div><div className="fr">{c.prompt.fr}</div></div>; })}
          </div>
        </section>
      ))}
    </div>
  );
}
