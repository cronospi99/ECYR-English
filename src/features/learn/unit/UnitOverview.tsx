import {
  BedDouble,
  BookOpen,
  Briefcase,
  Building,
  CalendarClock,
  Clock,
  Compass,
  Eye,
  Flag,
  Flame,
  Gem,
  Globe,
  Heart,
  HeartPulse,
  Hourglass,
  House,
  Laptop,
  Leaf,
  Lightbulb,
  MessageCircle,
  Mic,
  Music,
  Newspaper,
  Orbit,
  Package,
  PenLine,
  Plane,
  Repeat,
  Scale,
  Search,
  ShoppingBag,
  Sparkles,
  Sprout,
  Target,
  User,
  Users,
  Utensils,
  Wand2,
  Wheat,
  Zap,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Unit } from '@/content/types';
import { Clamp, QuoteText, ink, tint } from './ui';

export type StepTab = 'vocab' | 'grammar' | 'practice' | 'produce';

const BOOK_ICONS: Record<string, LucideIcon> = {
  grass: Sprout,
  creeper: Search,
  compass: Compass,
  bed: BedDouble,
  emerald: Gem,
  chest: Package,
  redstone: Zap,
  amethyst: Gem,
  hay: Wheat,
  tnt: Flame,
  heart: Heart,
  ender: Orbit,
};

const THEME_ICONS: [RegExp, LucideIcon][] = [
  [/famil|friend|relationship|people around|introduc/i, Users],
  [/food|eat|restaurant|cook|meal|drink/i, Utensils],
  [/travel|trip|holiday|vacation|moving around|abroad|flight/i, Plane],
  [/city|cities|town|neighbourhood|neighborhood|place|street/i, Building],
  [/past|story|stories|history|memor|yesterday/i, Hourglass],
  [/future|plan|goal|ambition|next/i, CalendarClock],
  [/shop|money|buy|price|market|cloth|fashion|style/i, ShoppingBag],
  [/work|job|career|office|business|profession/i, Briefcase],
  [/tech|computer|digital|internet|information|online|app/i, Laptop],
  [/health|body|sleep|sick|fitness|mind/i, HeartPulse],
  [/home|house|flat|apartment/i, House],
  [/routine|daily|time|clock|habit|early|night/i, Clock],
  [/music|free time|hobby|hobbies|leisure|fun|entertain|film/i, Music],
  [/nature|environment|weather|planet|animal/i, Leaf],
  [/news|media|journal|report/i, Newspaper],
  [/communicat|talk|conversation|language|complain|opinion|agree/i, MessageCircle],
  [/describ|appearance|look|personality|person/i, User],
  [/world|culture|custom|countr/i, Globe],
  [/mystery|myster|crime|evidence/i, Search],
  [/value|ethic|right|wrong|decision/i, Scale],
];

export function unitIcon(u: Unit): LucideIcon {
  if (u.icon && BOOK_ICONS[u.icon]) return BOOK_ICONS[u.icon]!;
  const text = `${u.title} ${u.theme}`;
  return THEME_ICONS.find(([re]) => re.test(text))?.[1] ?? BookOpen;
}

function goalIcon(g: string): { icon: LucideIcon; color: string } {
  const t = g.toLowerCase();
  if (/^(write|draft|compose)|\bwrit/.test(t)) return { icon: PenLine, color: 'var(--purple)' };
  if (/^(use|form|choose|control|combine|add|make)\b|grammar|tense|clause|correctly|verb/.test(t)) return { icon: Wand2, color: 'var(--indigo)' };
  if (/^(tell|narrate)|story/.test(t)) return { icon: BookOpen, color: 'var(--orange)' };
  if (/compare|contrast|concede/.test(t)) return { icon: Scale, color: 'var(--teal)' };
  if (/describ|explain|define/.test(t)) return { icon: Eye, color: 'var(--blue)' };
  if (/^(say|ask|talk|discuss|disagree|agree|speak|introduce|respond|request|give|speculate|criticise|emphasise)/.test(t)) return { icon: MessageCircle, color: 'var(--green)' };
  if (/vocabulary|words/.test(t)) return { icon: Sparkles, color: 'var(--pink)' };
  return { icon: Target, color: 'var(--blue)' };
}

/** Resumen tab: visual cover, goal tiles, outcome line and a tappable roadmap. */
export function UnitOverview({
  u,
  practiceCount,
  onGo,
  extra,
}: {
  u: Unit;
  practiceCount: number;
  onGo: (t: StepTab) => void;
  extra?: React.ReactNode;
}) {
  const color = u.color || 'var(--blue)';
  const Icon = unitIcon(u);
  const world = u.world && !u.world.includes('/') ? u.world : null;
  const steps: { tab: StepTab; label: string; icon: LucideIcon; color: string; value: string }[] = [
    { tab: 'vocab', label: 'Vocabulario', icon: BookOpen, color: 'var(--blue)', value: `${u.vocab.length} palabras` },
    { tab: 'grammar', label: 'Gramática', icon: Wand2, color: 'var(--purple)', value: `${u.grammar.length} ${u.grammar.length === 1 ? 'punto' : 'puntos'}` },
    { tab: 'practice', label: 'Práctica', icon: Repeat, color: 'var(--green)', value: `${practiceCount} preguntas` },
    { tab: 'produce', label: 'Producción', icon: Mic, color: 'var(--orange)', value: `${(u.speaking?.length ?? 0) + (u.writing ? 1 : 0)} tareas` },
  ];

  return (
    <div className="space-y-5">
      {/* cover */}
      <Card className="relative overflow-hidden p-0">
        <div className="relative px-5 pt-5 pb-5 sm:px-7 sm:pt-6" style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #1c1c1e))` }}>
          <Icon size={168} strokeWidth={1.2} className="pointer-events-none absolute -top-5 -right-6 text-white/15" aria-hidden />
          <div className="relative flex items-center gap-4">
            <span className="inline-flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[18px] bg-white/20 text-white shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.35)]">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase opacity-80">Unidad</span>
              <span className="text-[26px] leading-none font-bold">{u.n}</span>
            </span>
            <div className="min-w-0 text-white">
              {world && <div className="truncate text-[12px] font-bold tracking-[0.08em] uppercase opacity-80">{world}</div>}
              <div className="text-[19px] leading-tight font-bold text-balance sm:text-[22px]">{u.theme}</div>
              {(u.classes || u.pages) && (
                <div className="mt-1 text-[13px] opacity-80">{u.classes ? `Clases ${u.classes}` : `Páginas ${u.pages}`}</div>
              )}
            </div>
          </div>
        </div>
        <div className="px-5 pt-4 pb-5 sm:px-7">
          <Clamp text={u.overview.intro} lines={2} className="text-[16px] leading-relaxed" render={(t) => <QuoteText text={t} color={color} />} />
          {/* outcome */}
          <div className="mt-4 flex items-start gap-3 rounded-[16px] p-3.5" style={{ background: tint(color, 12), boxShadow: `inset 0 0 0 1px ${tint(color, 25)}` }}>
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={{ background: color }}>
              <Flag size={16} aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: ink(color) }}>
                Lo que podrás hacer
              </div>
              <p className="text-[15px] leading-snug font-medium text-pretty">{u.overview.outcome}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* goals */}
      <section aria-labelledby="ov-goals">
        <h3 id="ov-goals" className="text-headline mb-3 flex items-center gap-2 px-1">
          <Target size={18} className="text-ios-blue" aria-hidden /> Objetivos
        </h3>
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {u.overview.goals.map((g) => {
            const { icon: GIcon, color: gc } = goalIcon(g);
            return (
              <li key={g} className="bg-card shadow-card flex items-start gap-3 rounded-[18px] p-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]" style={{ background: tint(gc, 15), color: gc }}>
                  <GIcon size={19} aria-hidden />
                </span>
                <span className="text-[15px] leading-snug text-pretty">{g}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* roadmap */}
      <section aria-labelledby="ov-road">
        <h3 id="ov-road" className="text-headline mb-3 flex items-center gap-2 px-1">
          <Compass size={18} className="text-ios-green" aria-hidden /> Tu ruta
        </h3>
        <ol className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {steps.map((s, k) => (
            <li key={s.tab} className="relative">
              <button
                type="button"
                onClick={() => onGo(s.tab)}
                className="bg-card shadow-card group flex h-full w-full flex-col items-start gap-2 rounded-[18px] p-4 text-left transition-transform duration-200 active:scale-[0.98] motion-safe:hover:-translate-y-0.5"
              >
                <span className="flex w-full items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] text-white" style={{ background: s.color }}>
                    <s.icon size={20} aria-hidden />
                  </span>
                  <span className="text-label-3 text-[22px] font-bold tabular-nums">{k + 1}</span>
                </span>
                <span className="text-[16px] font-semibold">{s.label}</span>
                <span className="text-label-2 -mt-1.5 text-[13px]">{s.value}</span>
                <span className="mt-auto inline-flex items-center text-[13px] font-semibold" style={{ color: s.color }}>
                  Ir <ChevronRight size={14} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
              {k < steps.length - 1 && (
                <ChevronRight
                  size={16}
                  className="text-label-3 absolute top-1/2 -right-[13px] z-10 hidden -translate-y-1/2 md:block"
                  aria-hidden
                />
              )}
            </li>
          ))}
        </ol>
        <Button variant="brand" size="lg" className="mt-4 w-full sm:w-auto" onClick={() => onGo('vocab')}>
          Empezar la lección <ChevronRight size={18} />
        </Button>
      </section>

      {extra}

      {/* tips */}
      {u.tips && u.tips.length > 0 && (
        <section aria-labelledby="ov-tips">
          <h3 id="ov-tips" className="text-headline mb-3 flex items-center gap-2 px-1">
            <Lightbulb size={18} className="text-ios-yellow" aria-hidden /> Tips rápidos
          </h3>
          <ul className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {u.tips.map((t, k) => (
              <li key={t} className="bg-card shadow-card w-[78%] shrink-0 snap-start rounded-[18px] p-4 sm:w-auto">
                <span className="mb-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: tint('var(--yellow)', 30), color: ink('var(--orange)') }}>
                  {k + 1}
                </span>
                <p className="text-[14px] leading-snug text-pretty">
                  <QuoteText text={t} color="var(--orange)" />
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
