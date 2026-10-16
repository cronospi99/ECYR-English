import { useState } from 'react';
import { Briefcase, CloudOff, Lock, Plus } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { PageLoader } from '@/components/ui/Misc';
import { isSupabaseConfigured } from '@/lib/supabase';
import { KIND_INFO, PORTFOLIO_KINDS, type PortfolioItem } from '@/lib/portfolio';
import { useAuth } from '@/store/auth';
import { PortfolioListView } from './PortfolioList';
import { UploadSheet } from './UploadSheet';
import { usePortfolio } from './usePortfolio';

export { PortfolioList } from './PortfolioList';

export default function PortfolioPage() {
  const ready = useAuth((s) => s.ready);
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);
  const uid = session?.user.id ?? null;

  if (!isSupabaseConfigured || (ready && !uid)) return <NeedsAccount offline={!isSupabaseConfigured} />;
  if (!ready || !uid) return <PageLoader />;
  return <Portfolio uid={uid} hasTeacher={Boolean(profile?.teacher_id)} isTeacher={profile?.role === 'teacher'} />;
}

function Portfolio({ uid, hasTeacher, isTeacher }: { uid: string; hasTeacher: boolean; isTeacher: boolean }) {
  const state = usePortfolio(uid);
  const [sheet, setSheet] = useState<{ open: boolean; item: PortfolioItem | null }>({ open: false, item: null });
  const openNew = () => setSheet({ open: true, item: null });

  return (
    <Page
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <Briefcase size={15} className="text-ink-blue" aria-hidden /> Portafolio
        </span>
      }
      title="Mis trabajos"
      subtitle={
        isTeacher
          ? 'Guarda aquí tus propios materiales y trabajos.'
          : hasTeacher
            ? 'Sube lo que ya hiciste — redacciones, tareas, exámenes, certificados, audios o fotos de tu cuaderno. Tu profesor puede verlos y dejarte una revisión.'
            : 'Sube lo que ya hiciste — redacciones, tareas, exámenes, certificados, audios o fotos de tu cuaderno — y tenlo todo en tu cuenta.'
      }
      actions={
        <Button variant="brand" onClick={openNew}>
          <Plus size={18} strokeWidth={2.5} aria-hidden /> Subir trabajo
        </Button>
      }
    >
      <PortfolioListView state={state} owner onAdd={openNew} onEdit={(item) => setSheet({ open: true, item })} />

      <UploadSheet
        open={sheet.open}
        item={sheet.item}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSaved={state.put}
      />
    </Page>
  );
}

function NeedsAccount({ offline }: { offline: boolean }) {
  return (
    <Page
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <Briefcase size={15} className="text-ink-blue" aria-hidden /> Portafolio
        </span>
      }
      title="Mis trabajos"
    >
      <Card className="mx-auto max-w-[560px] overflow-hidden">
        <div className="brand-gradient relative flex h-32 items-end justify-center gap-2 overflow-hidden pb-5" aria-hidden>
          {PORTFOLIO_KINDS.slice(0, 6).map((k, i) => (
            <span key={k} style={{ transform: `translateY(${[6, -6, 2, -10, 0, 8][i]}px) rotate(${[-8, 4, -3, 6, -5, 9][i]}deg)` }}>
              <IconTile icon={KIND_INFO[k].icon} color="rgb(255 255 255 / 0.22)" size={42} />
            </span>
          ))}
        </div>
        <div className="p-6 text-center">
          <span className="bg-card text-label-2 relative z-10 mx-auto -mt-12 mb-3 flex h-12 w-12 items-center justify-center rounded-full shadow-card ring-4 ring-[var(--card)]">
            {offline ? <CloudOff size={22} aria-hidden /> : <Lock size={22} aria-hidden />}
          </span>
          <h2 className="text-title-2">{offline ? 'Necesita conexión con el servidor' : 'Guarda tus trabajos en tu cuenta'}</h2>
          <p className="text-body text-label-2 mx-auto mt-2 max-w-[420px] text-pretty">
            {offline
              ? 'Este despliegue funciona sin cuentas, así que no hay dónde guardar archivos. Tu progreso de lecciones sigue guardado en este navegador.'
              : 'Sube redacciones, tareas, exámenes, certificados, audios y fotos de tu cuaderno. Quedan privados en tu cuenta y solo tu profesor puede verlos y revisarlos.'}
          </p>
          <ButtonLink to="/profile" variant="brand" size="lg" className="mt-5 w-full sm:w-auto">
            {offline ? 'Ir a mi perfil' : 'Iniciar sesión o crear cuenta'}
          </ButtonLink>
        </div>
      </Card>
    </Page>
  );
}
