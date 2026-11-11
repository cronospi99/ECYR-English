import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  Dumbbell,
  Gamepad2,
  GraduationCap,
  Headphones,
  Mic,
  PenLine,
  ShieldCheck,
  Sigma,
  TriangleAlert,
} from 'lucide-react';
import type { AssignmentKind, AssignmentVia, EffectiveStatus } from '@/lib/assignments';

export const KIND_META: Record<AssignmentKind, { label: string; icon: LucideIcon; color: string }> = {
  unit: { label: 'Unit', icon: GraduationCap, color: 'var(--blue)' },
  grammar: { label: 'Grammar', icon: Sigma, color: 'var(--indigo)' },
  practice: { label: 'Practice', icon: Dumbbell, color: 'var(--teal)' },
  game: { label: 'Game', icon: Gamepad2, color: 'var(--green)' },
  ielts: { label: 'IELTS', icon: ClipboardList, color: 'var(--red)' },
  reading: { label: 'Reading', icon: BookOpen, color: 'var(--skill-reading)' },
  writing: { label: 'Writing', icon: PenLine, color: 'var(--skill-writing)' },
  speaking: { label: 'Speaking', icon: Mic, color: 'var(--skill-speaking)' },
  listening: { label: 'Listening', icon: Headphones, color: 'var(--skill-listening)' },
  custom: { label: 'Another', icon: ClipboardList, color: 'var(--orange)' },
};

export const STATUS_META: Record<EffectiveStatus, { label: string; icon: LucideIcon; color: string }> = {
  pending: { label: 'Pending', icon: Circle, color: 'var(--label-2)' },
  overdue: { label: 'Overdue', icon: TriangleAlert, color: 'var(--red)' },
  done: { label: 'Done', icon: CheckCircle2, color: 'var(--green)' },
  late: { label: 'Handed in late', icon: Clock, color: 'var(--orange)' },
  excused: { label: 'Exempt', icon: ShieldCheck, color: 'var(--indigo)' },
};

export const VIA_LABEL: Record<AssignmentVia, string> = {
  auto: 'Detected automatically',
  manual: 'Marked manually',
  submission: 'Handed in with a work',
};

export const DUE_COLOR = { overdue: 'var(--red)', soon: 'var(--orange)', normal: 'var(--label-2)', none: 'var(--label-3)' } as const;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
