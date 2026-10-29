import { useEffect, useState } from 'react';
import { Eye, EyeOff, Shuffle, Sparkles, Timer, RotateCcw } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { DrawingBoard } from '@/components/draw/DrawingBoard';
import { levelMeta } from '@/content/levels';
import type { CefrLevel } from '@/content/types';
import { ink, tint } from '@/lib/color';
import { cn } from '@/lib/cn';

/** English word → Spanish. Concrete objects first, ideas and idioms at the top levels. */
const WORDS: Record<CefrLevel, [string, string][]> = {
  A1: [
    ['cat', 'gato'], ['dog', 'perro'], ['house', 'casa'], ['sun', 'sol'], ['tree', 'árbol'],
    ['apple', 'manzana'], ['car', 'coche'], ['fish', 'pez'], ['book', 'libro'], ['ball', 'pelota'],
    ['bird', 'pájaro'], ['flower', 'flor'], ['chair', 'silla'], ['cake', 'pastel'], ['hat', 'sombrero'],
  ],
  A2: [
    ['bicycle', 'bicicleta'], ['umbrella', 'paraguas'], ['kitchen', 'cocina'], ['mountain', 'montaña'], ['beach', 'playa'],
    ['sandwich', 'sándwich'], ['train', 'tren'], ['guitar', 'guitarra'], ['rainbow', 'arcoíris'], ['castle', 'castillo'],
    ['island', 'isla'], ['camera', 'cámara'], ['ladder', 'escalera de mano'], ['bridge', 'puente'], ['snowman', 'muñeco de nieve'],
  ],
  B1: [
    ['lighthouse', 'faro'], ['volcano', 'volcán'], ['waterfall', 'cascada'], ['backpack', 'mochila'], ['traffic jam', 'atasco'],
    ['haircut', 'corte de pelo'], ['birthday party', 'fiesta de cumpleaños'], ['toothbrush', 'cepillo de dientes'], ['campfire', 'fogata'], ['scarecrow', 'espantapájaros'],
    ['skyscraper', 'rascacielos'], ['treasure map', 'mapa del tesoro'], ['fireworks', 'fuegos artificiales'], ['picnic', 'picnic'], ['spaceship', 'nave espacial'],
  ],
  B2: [
    ['earthquake', 'terremoto'], ['shipwreck', 'naufragio'], ['job interview', 'entrevista de trabajo'], ['power cut', 'apagón'], ['heatwave', 'ola de calor'],
    ['rush hour', 'hora punta'], ['sleepwalking', 'sonambulismo'], ['stage fright', 'miedo escénico'], ['deadline', 'fecha límite'], ['jealousy', 'celos'],
    ['crossroads', 'encrucijada'], ['time travel', 'viaje en el tiempo'], ['brainstorm', 'lluvia de ideas'], ['greenhouse', 'invernadero'], ['hitchhiking', 'hacer autostop'],
  ],
  C1: [
    ['a piece of cake', 'pan comido'], ['break the ice', 'romper el hielo'], ['under the weather', 'estar pachucho'], ['cost an arm and a leg', 'costar un ojo de la cara'], ['the elephant in the room', 'el tema que nadie menciona'],
    ['hit the books', 'ponerse a estudiar'], ['once in a blue moon', 'muy de vez en cuando'], ['spill the beans', 'irse de la lengua'], ['on cloud nine', 'en el séptimo cielo'], ['let the cat out of the bag', 'revelar el secreto'],
    ['a storm in a teacup', 'una tormenta en un vaso de agua'], ['burn the midnight oil', 'quemarse las pestañas'], ['the tip of the iceberg', 'la punta del iceberg'], ['a fish out of water', 'como pez fuera del agua'], ['raining cats and dogs', 'llover a cántaros'],
  ],
  C2: [
    ['nostalgia', 'nostalgia'], ['serendipity', 'serendipia'], ['procrastination', 'procrastinación'], ['bureaucracy', 'burocracia'], ['wanderlust', 'ansias de viajar'],
    ['hindsight', 'visión retrospectiva'], ['red tape', 'papeleo'], ['a double-edged sword', 'un arma de doble filo'], ['the last straw', 'la gota que colma el vaso'], ['a white elephant', 'un elefante blanco'],
    ['groupthink', 'pensamiento de grupo'], ['echo chamber', 'cámara de eco'], ['a wild goose chase', 'una búsqueda inútil'], ['gentrification', 'gentrificación'], ['writer’s block', 'bloqueo del escritor'],
  ],
};

const LEVELS = Object.keys(WORDS) as CefrLevel[];
const ROUND = 60;

function pick(level: CefrLevel, not?: string) {
  const list = WORDS[level].filter(([w]) => w !== not);
  return list[Math.floor(Math.random() * list.length)];
}

function Challenge() {
  const [level, setLevel] = useState<CefrLevel>('A1');
  const [word, setWord] = useState(() => pick('A1'));
  const [showEs, setShowEs] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const color = levelMeta(level)?.color ?? 'var(--blue)';

  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = setTimeout(() => setLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const shuffle = (lv = level) => {
    setWord((w) => pick(lv, w[0]));
    setShowEs(false);
    setLeft(null);
  };

  const timeUp = left === 0;

  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-center gap-2.5 px-4 pt-4"
        style={{ color: ink(color) }}
      >
        <span className="grid h-8 w-8 place-items-center rounded-[10px]" style={{ background: tint(color, 18) }}>
          <Sparkles size={17} strokeWidth={2.4} />
        </span>
        <div className="text-headline text-label">Reto · ¿Qué dibujo?</div>
      </div>

      <div className="mt-3 grid grid-cols-6 gap-1 px-4" role="tablist" aria-label="Nivel">
        {LEVELS.map((lv) => {
          const c = levelMeta(lv)?.color ?? 'var(--blue)';
          const active = lv === level;
          return (
            <button
              key={lv}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setLevel(lv);
                shuffle(lv);
              }}
              className="h-8 rounded-full text-[13px] font-bold tracking-wide transition-colors"
              style={
                active
                  ? { background: `color-mix(in srgb, ${c} 70%, #000)`, color: '#fff' }
                  : { background: tint(c, 14), color: ink(c) }
              }
            >
              {lv}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 px-4 pt-3 pb-4 lg:flex-col lg:gap-3 lg:pt-4">
        <div
          className="relative grid min-h-[96px] min-w-0 flex-1 place-items-center rounded-[16px] px-3 py-3 text-center lg:min-h-[112px]"
          style={{ background: tint(color, 12) }}
        >
          <div>
            <div className="font-rounded text-[26px] leading-tight font-bold text-balance lg:text-[30px]" style={{ color: ink(color, 70) }} lang="en">
              {word[0]}
            </div>
            <button
              type="button"
              onClick={() => setShowEs((v) => !v)}
              className="text-subhead text-label-2 mt-1.5 inline-flex items-center gap-1.5 hover:opacity-70"
              aria-label={showEs ? 'Ocultar traducción' : 'Ver en español'}
            >
              {showEs ? <EyeOff size={15} /> : <Eye size={15} />}
              {showEs ? word[1] : 'Ver en español'}
            </button>
          </div>
          {left !== null && (
            <div className="absolute inset-x-3 bottom-2 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div
                className="h-full rounded-full transition-[width] duration-1000 ease-linear"
                style={{ width: `${(left / ROUND) * 100}%`, background: timeUp ? 'var(--red)' : color }}
              />
            </div>
          )}
        </div>

        <div className="flex w-[104px] shrink-0 flex-col gap-2 lg:grid lg:w-auto lg:grid-cols-2">
          <button
            type="button"
            onClick={() => shuffle()}
            className="bg-fill-2 text-label flex h-11 items-center justify-center gap-2 rounded-[12px] text-[15px] font-semibold transition-transform active:scale-[0.97]"
          >
            <Shuffle size={18} strokeWidth={2.3} /> Otra
          </button>
          <button
            type="button"
            onClick={() => setLeft(left === null || timeUp ? ROUND : null)}
            className={cn(
              'flex h-11 items-center justify-center gap-2 rounded-[12px] text-[15px] font-semibold tabular-nums transition-transform active:scale-[0.97]',
              timeUp ? 'bg-ios-red text-white' : left !== null ? 'bg-label text-bg' : 'bg-fill-2 text-label',
            )}
            aria-label={left === null ? 'Empezar 60 segundos' : 'Parar el tiempo'}
          >
            {timeUp ? <RotateCcw size={18} strokeWidth={2.3} /> : <Timer size={18} strokeWidth={2.3} />}
            {timeUp ? '¡Tiempo!' : left !== null ? `${left} s` : '60 s'}
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function DrawPage() {
  return (
    <Page title="Pizarra" subtitle="Dibuja, escribe y descarga tu obra." wide>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <DrawingBoard className="min-w-0" maxHeight="max(380px, calc(100dvh - 290px))" />
        <div className="order-first lg:sticky lg:top-4 lg:order-none">
          <Challenge />
        </div>
      </div>
    </Page>
  );
}
