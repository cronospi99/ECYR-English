import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { B, Backdrop } from './ui';

if (import.meta.env.DEV) (window as unknown as { __auth: unknown }).__auth = useAuth; // dev only: lets browser tests act as a teacher

export function TeacherOnly({ children }: { children: ReactNode }) {
  const ready = useAuth((s) => s.ready);
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);
  const [waited, setWaited] = useState(false);
  useEffect(() => { const t = setTimeout(() => setWaited(true), 5000); return () => clearTimeout(t); }, []);
  if (!ready || (session && !profile && !waited)) return <div className="ch"><Backdrop /><div className="ch-wait" style={{ position: 'relative', paddingTop: '30vh' }}>…</div></div>;
  if (profile?.role === 'teacher') return <>{children}</>;
  return (
    <div className="ch scroll">
      <Backdrop />
      <div className="ch-page" style={{ textAlign: 'center', paddingTop: '16vh' }}>
        <div style={{ fontSize: 56 }} aria-hidden>🔒</div>
        <h1 className="serif" style={{ margin: '10px 0' }}><B stack en="Teachers only" fr="Réservé aux enseignants" /></h1>
        <p style={{ color: 'var(--muted)' }}><B stack en={session ? 'Hosting needs an ECYR teacher account. Students join with the code on the big screen.' : 'Sign in with your ECYR teacher account to host. Students join with the code on the big screen.'} fr={session ? 'Animer demande un compte enseignant ECYR. Les élèves entrent avec le code sur le grand écran.' : 'Connectez-vous avec votre compte enseignant ECYR. Les élèves entrent avec le code sur le grand écran.'} /></p>
        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          <Link to="/hunt/join" className="ch-btn"><B en="I have a code" fr="J’ai un code" /></Link>
          {!session && <Link to="/profile" className="ch-btn alt"><B en="Sign in" fr="Se connecter" /></Link>}
        </div>
      </div>
    </div>
  );
}
