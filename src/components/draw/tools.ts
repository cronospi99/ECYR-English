import {
  ArrowUpRight,
  Brush,
  Circle,
  Eraser,
  Grid3x3,
  Highlighter,
  PaintBucket,
  Pencil,
  Pipette,
  Rows3,
  Slash,
  Square,
  SquareDashed,
  Type,
  SprayCan,
  Rainbow,
  Feather,
  Zap,
  Triangle,
  Star,
  Heart,
  Hexagon,
  MessageCircle,
  Smile,
  PenTool,
  type LucideIcon,
} from 'lucide-react';
import type { Background, Tool } from './engine';

export interface ToolMeta {
  id: Tool;
  label: string;
  key: string;
  icon: LucideIcon;
  /** Default size in board units (board = 1000 units wide). */
  size: number;
}

export const TOOLS: Record<Tool, ToolMeta> = {
  pencil: { id: 'pencil', label: 'Lápiz', key: 'P', icon: Pencil, size: 5 },
  brush: { id: 'brush', label: 'Pincel suave', key: 'B', icon: Brush, size: 16 },
  highlighter: { id: 'highlighter', label: 'Resaltador', key: 'H', icon: Highlighter, size: 26 },
  eraser: { id: 'eraser', label: 'Borrador', key: 'E', icon: Eraser, size: 28 },
  fill: { id: 'fill', label: 'Cubeta de relleno', key: 'G', icon: PaintBucket, size: 0 },
  line: { id: 'line', label: 'Línea', key: 'L', icon: Slash, size: 6 },
  arrow: { id: 'arrow', label: 'Flecha', key: 'A', icon: ArrowUpRight, size: 6 },
  rect: { id: 'rect', label: 'Rectángulo', key: 'R', icon: Square, size: 6 },
  ellipse: { id: 'ellipse', label: 'Elipse', key: 'O', icon: Circle, size: 6 },
  text: { id: 'text', label: 'Texto', key: 'T', icon: Type, size: 0 },
  eyedropper: { id: 'eyedropper', label: 'Cuentagotas', key: 'I', icon: Pipette, size: 0 },
  crayon: { id: 'crayon', label: 'Crayón', key: 'C', icon: PenTool, size: 12 },
  calligraphy: { id: 'calligraphy', label: 'Caligrafía', key: 'K', icon: Feather, size: 14 },
  spray: { id: 'spray', label: 'Aerosol', key: 'S', icon: SprayCan, size: 18 },
  neon: { id: 'neon', label: 'Neón', key: 'N', icon: Zap, size: 8 },
  rainbow: { id: 'rainbow', label: 'Arcoíris', key: 'W', icon: Rainbow, size: 14 },
  triangle: { id: 'triangle', label: 'Triángulo', key: 'Y', icon: Triangle, size: 6 },
  star: { id: 'star', label: 'Estrella', key: 'Q', icon: Star, size: 6 },
  heart: { id: 'heart', label: 'Corazón', key: 'U', icon: Heart, size: 6 },
  hexagon: { id: 'hexagon', label: 'Hexágono', key: 'X', icon: Hexagon, size: 6 },
  bubble: { id: 'bubble', label: 'Globo de diálogo', key: 'M', icon: MessageCircle, size: 5 },
  stamp: { id: 'stamp', label: 'Stickers', key: 'D', icon: Smile, size: 0 },
};

export const TOOL_GROUPS: Tool[][] = [
  ['pencil', 'brush', 'highlighter', 'eraser', 'fill'],
  ['crayon', 'calligraphy', 'spray', 'neon', 'rainbow'],
  ['line', 'arrow', 'rect', 'ellipse', 'triangle', 'star', 'heart', 'hexagon', 'bubble'],
  ['text', 'stamp', 'eyedropper'],
];

export const COMPACT_TOOLS: Tool[] = ['pencil', 'brush', 'spray', 'rainbow', 'eraser', 'fill', 'stamp'];

export const KEY_TO_TOOL: Record<string, Tool> = Object.fromEntries(
  Object.values(TOOLS).map((t) => [t.key.toLowerCase(), t.id]),
);

/** 18 swatches: neutrals, a rainbow, then skin / earth / pastel tones. */
export const PALETTE: { hex: string; name: string }[] = [
  { hex: '#111111', name: 'Negro' },
  { hex: '#555b66', name: 'Gris oscuro' },
  { hex: '#a3a9b4', name: 'Gris claro' },
  { hex: '#ffffff', name: 'Blanco' },
  { hex: '#e53935', name: 'Rojo' },
  { hex: '#fb8c00', name: 'Naranja' },
  { hex: '#fdd835', name: 'Amarillo' },
  { hex: '#43a047', name: 'Verde' },
  { hex: '#00acc1', name: 'Turquesa' },
  { hex: '#1e88e5', name: 'Azul' },
  { hex: '#5e35b1', name: 'Morado' },
  { hex: '#d81b60', name: 'Rosa' },
  { hex: '#8d5524', name: 'Marrón' },
  { hex: '#f1c27d', name: 'Piel' },
  { hex: '#ffab91', name: 'Melocotón' },
  { hex: '#a5d6a7', name: 'Verde pastel' },
  { hex: '#90caf9', name: 'Azul cielo' },
  { hex: '#ce93d8', name: 'Lila' },
];

export const COMPACT_PALETTE = ['#111111', '#ffffff', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#5e35b1', '#d81b60', '#8d5524'];

export const BACKGROUNDS: { id: Background; label: string; icon: LucideIcon }[] = [
  { id: 'white', label: 'Blanco', icon: Square },
  { id: 'grid', label: 'Cuadrícula', icon: Grid3x3 },
  { id: 'lined', label: 'Rayado', icon: Rows3 },
  { id: 'none', label: 'Transparente', icon: SquareDashed },
];

export const SIZE_MIN = 1;
export const SIZE_MAX = 80;
export const TEXT_MIN = 14;
export const TEXT_MAX = 140;
export const COMPACT_SIZES = [4, 10, 24];
