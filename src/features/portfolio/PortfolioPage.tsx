import { TeacherReviews } from './TeacherReviews';
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
          <Briefcase size={15} className="text-ink-blue" aria-hidden /> Portfolio
        </span>
      }
      title="My work"
      subtitle={
        isTeacher
          ? 'Keep your own materials and work here.'
          : hasTeacher
            ? 'Upload what you’ve already done — essays, assignments, exams, certificates, audios or photos of your notebook. Your teacher can see them and leave you a review.'
            : 'Upload what you’ve already done — essays, assignments, exams, certificates, audios or photos of your notebook — and keep it all in your account.'
      }
      actions={
        <Button variant="brand" onClick={openNew}>
          <Plus size={18} strokeWidth={2.5} aria-hidden /> Upload work
        </Button>
      }
    >
      {!isTeacher && <TeacherReviews />}
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
          <Briefcase size={15} className="text-ink-blue" aria-hidden /> Portfolio
        </span>
      }
      title="My work"
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
          <h2 className="text-title-2">{offline ? 'Needs a connection to the server' : 'Save your work in your account'}</h2>
          <p className="text-body text-label-2 mx-auto mt-2 max-w-[420px] text-pretty">
            {offline
              ? 'This deployment works without accounts, so there is nowhere to save files. Your lesson progress is still saved in this browser.'
              : 'Upload essays, assignments, exams, certificates, audios and photos of your notebook. They stay private in your account and only your teacher can see and review them.'}
          </p>
          <ButtonLink to="/profile" variant="brand" size="lg" className="mt-5 w-full sm:w-auto">
            {offline ? 'Go to my profile' : 'Sign in or create an account'}
          </ButtonLink>
        </div>
      </Card>
    </Page>
  );
}
