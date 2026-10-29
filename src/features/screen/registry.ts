/** Every widget of the classroom screen: label, icon, colour, default size and component. */
import type { ComponentType } from 'react';
import {
  CalendarClock,
  ChartColumn,
  Clock,
  Dices,
  Hand,
  Image,
  ListChecks,
  Mic,
  Palette,
  PlaySquare,
  QrCode,
  Shuffle,
  Timer as TimerIcon,
  TimerReset,
  TrafficCone,
  Trophy,
  Type,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { WidgetKind } from './state';
import type { WidgetProps } from './util';
import Timer from './widgets/Timer';
import Stopwatch from './widgets/Stopwatch';
import Random from './widgets/Random';
import Groups from './widgets/Groups';
import Clock_ from './widgets/Clock';
import Traffic from './widgets/Traffic';
import Symbols from './widgets/Symbols';
import Noise from './widgets/Noise';
import Poll from './widgets/Poll';
import Text from './widgets/Text';
import ImageW from './widgets/ImageW';
import Video from './widgets/Video';
import Dice from './widgets/Dice';
import Score from './widgets/Score';
import Agenda from './widgets/Agenda';
import Draw from './widgets/Draw';
import Qr from './widgets/Qr';
import Countdown from './widgets/Countdown';

export interface WidgetDef {
  kind: WidgetKind;
  label: string;
  icon: LucideIcon;
  color: string;
  w: number;
  h: number;
  minW: number;
  minH: number;
  /** Shows the gear (edit mode) in the header. */
  settings?: boolean;
  /** In the dock itself (the rest go under "Más"). */
  main?: boolean;
  /** Body without padding / own background (text notes, images, video). */
  bleed?: boolean;
  Component: ComponentType<WidgetProps<never>>;
}

const def = (d: Omit<WidgetDef, 'Component'> & { Component: ComponentType<WidgetProps<never>> }) => d;

export const WIDGETS: WidgetDef[] = [
  def({ kind: 'timer', label: 'Temporizador', icon: TimerIcon, color: '#3b82f6', w: 400, h: 360, minW: 260, minH: 240, main: true, Component: Timer as never }),
  def({ kind: 'random', label: 'Ruleta', icon: Shuffle, color: '#ec4899', w: 420, h: 460, minW: 260, minH: 280, main: true, settings: true, Component: Random as never }),
  def({ kind: 'groups', label: 'Grupos', icon: UsersRound, color: '#22c55e', w: 560, h: 440, minW: 320, minH: 260, main: true, settings: true, Component: Groups as never }),
  def({ kind: 'clock', label: 'Reloj', icon: Clock, color: '#6366f1', w: 320, h: 340, minW: 200, minH: 160, main: true, settings: true, Component: Clock_ as never }),
  def({ kind: 'traffic', label: 'Semáforo', icon: TrafficCone, color: '#ef4444', w: 200, h: 440, minW: 140, minH: 260, main: true, Component: Traffic as never }),
  def({ kind: 'symbols', label: 'Símbolos', icon: Hand, color: '#a855f7', w: 340, h: 360, minW: 260, minH: 260, main: true, Component: Symbols as never }),
  def({ kind: 'noise', label: 'Ruido', icon: Mic, color: '#14b8a6', w: 400, h: 340, minW: 280, minH: 260, main: true, Component: Noise as never }),
  def({ kind: 'poll', label: 'Votación', icon: ChartColumn, color: '#f97316', w: 460, h: 400, minW: 300, minH: 260, main: true, settings: true, Component: Poll as never }),
  def({ kind: 'text', label: 'Texto', icon: Type, color: '#eab308', w: 360, h: 240, minW: 180, minH: 120, main: true, settings: true, bleed: true, Component: Text as never }),
  def({ kind: 'stopwatch', label: 'Cronómetro', icon: TimerReset, color: '#0ea5e9', w: 380, h: 300, minW: 260, minH: 200, Component: Stopwatch as never }),
  def({ kind: 'dice', label: 'Dados', icon: Dices, color: '#f59e0b', w: 380, h: 300, minW: 240, minH: 220, Component: Dice as never }),
  def({ kind: 'score', label: 'Marcador', icon: Trophy, color: '#eab308', w: 460, h: 320, minW: 260, minH: 240, settings: true, Component: Score as never }),
  def({ kind: 'agenda', label: 'Agenda', icon: ListChecks, color: '#10b981', w: 360, h: 400, minW: 260, minH: 220, settings: true, Component: Agenda as never }),
  def({ kind: 'draw', label: 'Dibujo', icon: Palette, color: '#d946ef', w: 600, h: 500, minW: 320, minH: 300, bleed: true, Component: Draw as never }),
  def({ kind: 'image', label: 'Imagen', icon: Image, color: '#ec4899', w: 420, h: 320, minW: 180, minH: 140, bleed: true, Component: ImageW as never }),
  def({ kind: 'video', label: 'Video', icon: PlaySquare, color: '#ef4444', w: 560, h: 360, minW: 280, minH: 200, settings: true, bleed: true, Component: Video as never }),
  def({ kind: 'qr', label: 'Código QR', icon: QrCode, color: '#334155', w: 320, h: 380, minW: 200, minH: 240, settings: true, Component: Qr as never }),
  def({ kind: 'countdown', label: 'Cuenta atrás', icon: CalendarClock, color: '#8b5cf6', w: 440, h: 260, minW: 280, minH: 180, settings: true, Component: Countdown as never }),
];

export const widgetDef = (k: WidgetKind) => WIDGETS.find((w) => w.kind === k);
