import { Link } from 'react-router-dom';
import { BookOpen, Headphones, Mic, PenLine, Shuffle, ChevronRight, Wrench, Languages, ClipboardList, Palette } from 'lucide-react';
import { ExternalResources } from '@/features/library/ExternalResources';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { IconTile } from '@/components/ui/IconTile';
import { useProgress } from '@/store/progress';

const AREAS = [
  {
    to: '/practice/reading',
    icon: BookOpen,
    color: 'var(--skill-reading)',
    title: 'Reading',
    body: 'Library of original A1–C2 readings (news, interviews, science, opinion…) with glossary and questions, plus 32 travel guides.',
    skill: 'reading' as const,
  },
  {
    to: '/practice/listening',
    icon: Headphones,
    color: 'var(--skill-listening)',
    title: 'Listening',
    body: 'Library of A1–C2 audios with several voices and accents (dialogues, podcasts, classes, announcements), IELTS-style questions and dictations.',
    skill: 'listening' as const,
  },
  {
    to: '/practice/speaking',
    icon: Mic,
    color: 'var(--skill-speaking)',
    title: 'Speaking',
    body: '3,600+ questions by level and topic. Answer with your microphone and compare with the model answer.',
    skill: 'speaking' as const,
  },
  {
    to: '/practice/writing',
    icon: PenLine,
    color: 'var(--skill-writing)',
    title: 'Writing',
    body: 'Writing tasks for every unit with assessment criteria and AI Coach feedback.',
    skill: 'writing' as const,
  },
  {
    to: '/practice/vocabulary',
    icon: Languages,
    color: 'var(--pink)',
    title: 'Vocabulary',
    body: 'Linking words by function, hundreds of adjectives by category and adverbs by type, with examples, audio, quiz and PDF task.',
    skill: 'vocabulary' as const,
  },
  {
    to: '/practice/workshops',
    icon: ClipboardList,
    color: 'var(--teal)',
    title: 'Grammar workshops',
    body: 'One workshop per topic from A1 to C1: the rule, typical mistakes, four exercise types and the task ready as a PDF.',
    skill: 'grammar' as const,
  },
  {
    to: '/practice/verbs',
    icon: Wrench,
    color: 'var(--indigo)',
    title: 'Verb Lab',
    body: 'More than 1,000 verbs with their 3 forms, 384 C1 academic verbs, -ed pronunciation, a timed quiz, phrasal verbs by family and the 10 verb patterns.',
    skill: 'grammar' as const,
  },
  {
    to: '/practice/phrasal-verbs',
    icon: Shuffle,
    color: 'var(--orange)',
    title: 'Phrasal Verbs',
    body: 'More than 1,250 phrasal verbs from A1 to C1 in mind maps, with translation, 4 examples each and quiz mode.',
    skill: 'vocabulary' as const,
  },
  {
    to: '/practice/draw',
    icon: Palette,
    color: 'var(--purple)',
    title: 'Whiteboard',
    body: 'Draw like in Paint or Gartic Phone: brushes, fill, shapes, text and “What’s the drawing?” vocabulary challenges.',
    skill: null,
  },
];

export default function PracticePage() {
  const skillXp = useProgress((s) => s.skillXp);
  return (
    <Page title="Practice" subtitle="Train each skill separately. Everything earns XP and brings you closer to the summit.">
      <div className="grid gap-4 md:grid-cols-2">
        {AREAS.map((a) => (
          <Link key={a.to} to={a.to}>
            <Card className="flex h-full items-start gap-4 p-5 transition-transform active:scale-[0.99]">
              <IconTile icon={a.icon} color={a.color} size={52} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-title-3">{a.title}</h3>
                  {a.skill && <span className="text-label-2 text-[13px] tabular-nums">{skillXp[a.skill] ?? 0} XP</span>}
                </div>
                <p className="text-label-2 text-subhead mt-1 text-pretty">{a.body}</p>
              </div>
              <ChevronRight className="text-label-3 mt-1 shrink-0" />
            </Card>
          </Link>
        ))}
      </div>
      <ExternalResources className="mt-8" />
    </Page>
  );
}
