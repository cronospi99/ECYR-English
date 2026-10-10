import { memo, useId, type ReactNode } from 'react';
import { mix, shade, luminance } from './color';
import {
  CLOTH_COLORS,
  EYE_COLORS,
  HAIR_COLORS,
  SKINS,
  colorOf,
  type BuilderParams,
  type FaceId,
  type HairId,
} from './options';

/**
 * Parametric, Memoji-flavoured bust drawn on a 200×200 canvas with a
 * transparent background (the frame paints the background). Layer order:
 * back hair → neck → clothes → ears → head → face details → front hair →
 * headwear → glasses → earrings.
 */

const INK = '#2A1B15';

// ------------------------------------------------------------------ face --

const FACE_PATH: Record<FaceId, string> = {
  round: 'M100,42 C127,42 144,61 144,91 C144,121 125,143 100,143 C75,143 56,121 56,91 C56,61 73,42 100,42Z',
  oval: 'M100,42 C126,42 142,61 142,90 C142,122 122,147 100,147 C78,147 58,122 58,90 C58,61 74,42 100,42Z',
  square:
    'M100,42 C128,42 144,59 144,88 C144,113 138,129 126,138 C118,144 109,146 100,146 C91,146 82,144 74,138 C62,129 56,113 56,88 C56,59 72,42 100,42Z',
};

// ------------------------------------------------------------------ hair --

/** Circles along an elliptical arc (angles in degrees, 0 = right, 90 = up). */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number, r: number | ((i: number) => number)) {
  const out: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / Math.max(1, n - 1)) * Math.PI) / 180;
    out.push([cx + rx * Math.cos(a), cy - ry * Math.sin(a), typeof r === 'number' ? r : r(i)]);
  }
  return out;
}
const Circles = ({ list, fill }: { list: [number, number, number][]; fill: string }) => (
  <>
    {list.map(([x, y, r], i) => (
      <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={r} fill={fill} />
    ))}
  </>
);

const LONG_BACK = 'M46,96 C42,54 66,24 100,24 C134,24 158,54 154,96 L158,176 C150,186 134,188 120,184 L80,184 C66,188 50,186 42,176Z';
const LONG_FRONT =
  'M88,38 C74,42 66,54 63,68 C60,82 57,96 56,110 C55,128 58,148 66,166 C68,172 72,178 76,182 C62,184 50,180 42,172 C44,150 40,126 41,104 C42,62 62,28 100,28 C138,28 158,62 159,104 C160,126 156,150 158,172 C150,180 138,184 124,182 C128,178 132,172 134,166 C142,148 145,128 144,110 C143,96 141,84 138,74 C132,60 116,52 100,50 C95,46 91,42 88,38Z';
const WAVY_FRONT =
  'M88,38 C74,42 66,54 63,68 C60,82 57,96 56,110 C55,122 60,130 58,142 C56,154 66,160 66,170 C66,176 72,180 76,184 C62,188 48,184 40,174 C34,166 44,158 38,148 C32,136 42,126 38,114 C34,100 40,86 42,78 C48,48 68,28 100,28 C132,28 152,48 158,78 C160,86 166,100 162,114 C158,126 168,136 162,148 C156,158 166,166 160,174 C152,184 138,188 124,184 C128,180 134,176 134,170 C134,160 144,154 142,142 C140,130 145,122 144,110 C143,96 141,84 138,74 C132,60 116,52 100,50 C95,46 91,42 88,38Z';
const WAVY_BACK =
  'M44,96 C40,54 66,22 100,22 C134,22 160,54 156,96 C162,112 154,124 162,140 C168,154 158,166 164,180 C150,190 132,188 120,184 L80,184 C68,188 50,190 36,180 C42,166 32,154 38,140 C46,124 38,112 44,96Z';

function HairBack({ hair, c, g }: { hair: HairId; c: string; g: string }) {
  const dark = shade(c, -0.25);
  switch (hair) {
    case 'long':
      return <path d={LONG_BACK} fill={dark} />;
    case 'wavy':
      return <path d={WAVY_BACK} fill={dark} />;
    case 'bob':
      return <path d="M48,96 C44,54 68,28 100,28 C132,28 156,54 152,96 C154,116 154,134 150,146 C140,152 128,150 122,146 L78,146 C72,150 60,152 50,146 C46,134 46,116 48,96Z" fill={dark} />;
    case 'bun':
      return (
        <g>
          <circle cx="100" cy="27" r="19" fill={`url(#${g})`} />
          <path d="M84,22 C90,14 110,14 116,22" stroke={shade(c, 0.22)} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.7" />
          <path d="M86,33 C94,38 106,38 114,33" stroke={dark} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.6" />
        </g>
      );
    case 'ponytail':
      return (
        <path
          d="M128,46 C150,48 164,70 162,98 C161,122 166,140 158,162 C154,170 146,170 146,162 C150,142 144,124 144,104 C144,84 138,66 124,56Z"
          fill={dark}
        />
      );
    case 'curlylong': {
      const cloud: [number, number, number][] = [
        [36, 108, 13], [32, 132, 13], [36, 156, 13], [46, 176, 13], [154, 176, 13], [164, 156, 13], [168, 132, 13], [164, 108, 13],
      ];
      return (
        <g>
          <path d={WAVY_BACK} fill={dark} />
          <Circles list={cloud} fill={dark} />
        </g>
      );
    }
    case 'afro': {
      const cloud = arc(100, 78, 58, 52, -30, 210, 16, 17);
      return (
        <g>
          <ellipse cx="100" cy="78" rx="62" ry="56" fill={`url(#${g})`} />
          <Circles list={cloud} fill={`url(#${g})`} />
        </g>
      );
    }
    default:
      return null;
  }
}

function HairFront({ hair, c, g, hat }: { hair: HairId; c: string; g: string; hat: boolean }) {
  const hi = shade(c, luminance(c) > 0.5 ? 0.35 : 0.22);
  const lo = shade(c, -0.28);
  const fill = `url(#${g})`;
  const shine = (d: string, w = 3) => <path d={d} stroke={hi} strokeWidth={w} fill="none" strokeLinecap="round" opacity="0.55" />;
  const strand = (d: string, w = 1.6) => <path d={d} stroke={lo} strokeWidth={w} fill="none" strokeLinecap="round" opacity="0.55" />;
  switch (hair) {
    case 'short':
      return (
        <g>
          <path
            d="M56,102 C50,84 50,64 59,50 C70,32 88,26 105,27 C124,28 140,37 147,54 C152,68 150,86 144,102 C142,92 141,82 137,74 L133,69 L129,73 C125,67 119,65 113,65 L107,69 L104,62 C98,61 92,63 86,65 L81,70 L79,65 C71,67 66,74 63,81 C60,88 58,95 56,102Z"
            fill={fill}
          />
          {strand('M78,46 C86,40 98,38 108,40')}
          {strand('M96,34 C108,32 124,36 132,46')}
          {shine('M70,52 C78,42 92,36 104,36', 3.2)}
        </g>
      );
    case 'sidepart':
      return (
        <g>
          <path
            d="M56,102 C50,82 51,62 61,47 C72,32 90,25 109,26 C130,27 146,39 150,58 C153,73 149,89 144,102 C142,90 140,80 135,71 C124,73 110,69 98,62 C92,59 87,57 83,55 C81,64 73,70 67,74 C62,82 59,92 56,102Z"
            fill={fill}
          />
          <path d="M83,55 C81,46 82,38 86,31" stroke={lo} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
          {strand('M92,40 C108,34 128,38 140,52')}
          {shine('M96,46 C110,40 126,44 136,56', 3.2)}
        </g>
      );
    case 'curly': {
      const bumps = arc(100, 66, 44, 34, 165, 15, 9, (i) => (i % 2 ? 11 : 12.5));
      return (
        <g>
          <path d="M56,100 C50,80 52,56 66,44 C78,34 90,32 100,32 C112,32 124,34 134,44 C148,56 150,80 144,100 C140,88 138,78 132,72 C122,70 112,66 100,66 C88,66 78,70 68,72 C62,78 60,88 56,100Z" fill={fill} />
          <Circles list={bumps} fill={fill} />
          {bumps.map(([x, y], i) => (
            <path key={i} d={`M${x - 5},${y - 1} q5,-6 10,0`} stroke={i % 2 ? hi : lo} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6" />
          ))}
          <Circles list={[[65, 70, 7], [79, 65, 7.5], [121, 65, 7.5], [135, 70, 7]]} fill={fill} />
        </g>
      );
    }
    case 'buzz':
      return (
        <path
          d="M57,94 C55,60 73,39 100,39 C127,39 145,60 143,94 C141,82 139,74 134,67 C124,61 112,59 100,59 C88,59 76,61 66,67 C61,74 59,82 57,94Z"
          fill={fill}
          opacity="0.88"
        />
      );
    case 'long':
      return (
        <g>
          <path d={LONG_FRONT} fill={fill} />
          {shine('M104,36 C118,36 132,42 140,54', 3)}
          {strand('M88,38 C92,44 96,48 100,50', 1.4)}
        </g>
      );
    case 'wavy':
      return (
        <g>
          <path d={WAVY_FRONT} fill={fill} />
          {shine('M104,36 C118,36 132,42 140,54', 3)}
          {strand('M52,140 C58,148 52,158 58,166')}
          {strand('M148,140 C142,148 148,158 142,166')}
        </g>
      );
    case 'bun':
    case 'ponytail':
      return (
        <g>
          <path
            d="M57,98 C53,66 72,37 100,37 C128,37 147,66 143,98 C141,86 138,76 131,69 C121,61 109,59 100,59 C89,59 78,62 70,68 C63,75 59,85 57,98Z"
            fill={fill}
          />
          {hair === 'ponytail' ? (
            <path d="M62,80 C66,62 84,52 104,54 C92,58 82,64 74,74 C70,78 66,80 62,80Z" fill={fill} />
          ) : (
            <>
              <path d="M64,74 C60,82 63,88 60,95" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <path d="M136,74 C140,82 137,88 140,95" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            </>
          )}
          {strand('M80,48 C90,42 110,42 120,48')}
          {shine('M72,54 C82,44 96,41 108,42', 3)}
        </g>
      );
    case 'bob':
      return (
        <g>
          <path
            d="M57,104 C52,66 70,35 100,35 C130,35 148,66 143,104 L142,140 C139,144 133,143 132,138 L134,98 C134,86 132,78 128,73 C112,77 88,77 72,73 C68,78 66,86 66,98 L68,138 C67,143 61,144 58,140Z"
            fill={fill}
          />
          {strand('M86,75 L86,64', 1.4)}
          {strand('M100,76 L100,62', 1.4)}
          {strand('M114,75 L114,64', 1.4)}
          {shine('M70,52 C80,42 94,39 108,40', 3)}
        </g>
      );
    case 'curlylong': {
      const curls: [number, number, number][] = [
        [42, 118, 10], [38, 138, 10.5], [44, 158, 11], [58, 176, 10.5],
        [158, 118, 10], [162, 138, 10.5], [156, 158, 11], [142, 176, 10.5],
        [46, 96, 9], [154, 96, 9],
      ];
      return (
        <g>
          <path d={WAVY_FRONT} fill={fill} />
          <Circles list={curls} fill={fill} />
          {curls.map(([x, y], i) => (
            <path key={i} d={`M${x - 5},${y + 2} q5,-7 10,0`} stroke={hi} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.5" />
          ))}
          {shine('M104,36 C118,36 132,42 140,54', 3)}
          {strand('M66,60 C62,66 64,72 60,78')}
          {strand('M134,60 C138,66 136,72 140,78')}
        </g>
      );
    }
    case 'afro': {
      const line = arc(100, 70, 40, 26, 170, 10, 9, 8);
      return (
        <g>
          <path d="M58,96 C54,70 66,48 100,46 C134,48 146,70 142,96 C138,84 132,76 124,72 L76,72 C68,76 62,84 58,96Z" fill={fill} />
          <Circles list={line} fill={fill} />
          {arc(100, 70, 52, 44, 150, 30, 5, 0).map(([x, y], i) => (
            <path key={i} d={`M${(x - 5).toFixed(1)},${(y - 14).toFixed(1)} q5,-6 10,0`} stroke={hi} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity={hat ? 0 : 0.5} />
          ))}
        </g>
      );
    }
    case 'bald':
      return <ellipse cx="86" cy="56" rx="12" ry="6" fill="#fff" opacity="0.22" transform="rotate(-20 86 56)" />;
  }
}

// --------------------------------------------------------------- clothes --

const BODY = (neck: string) =>
  `M24,206 C24,180 42,165 70,159 C78,157 84,156 88,156 ${neck} C116,156 122,157 130,159 C158,165 176,180 176,206Z`;
const CREW = 'C92,168 108,168 112,156';
const VNECK = 'L100,182 L112,156';

function Clothes({ p, c, g, skin }: { p: BuilderParams; c: string; g: string; skin: string }) {
  const lo = shade(c, -0.22);
  const hi = shade(c, luminance(c) > 0.6 ? -0.08 : 0.18);
  const fill = `url(#${g})`;
  switch (p.clothing) {
    case 'tshirt':
      return (
        <g>
          <path d={BODY(CREW)} fill={fill} />
          <path d="M88,156 C92,168 108,168 112,156" stroke={lo} strokeWidth="3.2" fill="none" />
        </g>
      );
    case 'sweater':
      return (
        <g>
          <path d={BODY(CREW)} fill={fill} />
          <path d="M86,155 C90,171 110,171 114,155" stroke={hi} strokeWidth="6" fill="none" />
          <path d="M86,155 C90,171 110,171 114,155" stroke={lo} strokeWidth="6" fill="none" strokeDasharray="1.2 2.4" opacity="0.5" />
          <path d="M58,190 L58,206 M142,190 L142,206" stroke={lo} strokeWidth="1.5" opacity="0.4" />
        </g>
      );
    case 'turtleneck':
      return (
        <g>
          <path d={BODY('L112,156')} fill={fill} />
          <path d="M84,132 C92,136 108,136 116,132 L117,160 C108,166 92,166 83,160Z" fill={hi} />
          <path d="M84,140 C94,144 106,144 116,140 M84,148 C94,152 106,152 116,148 M84,156 C94,160 106,160 116,156" stroke={lo} strokeWidth="1.4" fill="none" opacity="0.55" />
        </g>
      );
    case 'hoodie':
      return (
        <g>
          <path d={BODY(CREW)} fill={fill} />
          <path d="M74,157 C76,176 124,176 126,157 C120,152 116,151 112,151 C110,166 90,166 88,151 C84,151 80,152 74,157Z" fill={hi} />
          <path d="M80,160 C86,172 114,172 120,160" stroke={lo} strokeWidth="1.4" fill="none" opacity="0.5" />
          <path d="M93,168 L91,190 M107,168 L109,190" stroke={shade(c, luminance(c) > 0.5 ? -0.3 : 0.55)} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M88,206 L88,196 Q100,192 112,196 L112,206" stroke={lo} strokeWidth="1.4" fill="none" opacity="0.5" />
        </g>
      );
    case 'shirt':
      return (
        <g>
          <path d={BODY(VNECK)} fill={fill} />
          <path d="M100,182 L100,206" stroke={lo} strokeWidth="1.4" opacity="0.6" />
          <circle cx="100" cy="190" r="1.5" fill={lo} />
          <circle cx="100" cy="200" r="1.5" fill={lo} />
          <path d="M87,152 L100,176 L88,180 L80,160Z" fill={hi} stroke={lo} strokeWidth="1" strokeLinejoin="round" />
          <path d="M113,152 L100,176 L112,180 L120,160Z" fill={hi} stroke={lo} strokeWidth="1" strokeLinejoin="round" />
        </g>
      );
    case 'blazer': {
      const shirt = '#F5F5F3';
      return (
        <g>
          <path d={BODY(VNECK)} fill={fill} />
          <path d="M86,155 L114,155 L100,194Z" fill={shirt} />
          <path d="M88,156 C92,163 108,163 112,156 L100,170Z" fill={skin} />
          <path d="M86,153 L99,170 L90,176 L82,160Z" fill={shirt} stroke={shade(shirt, -0.15)} strokeWidth="1" strokeLinejoin="round" />
          <path d="M114,153 L101,170 L110,176 L118,160Z" fill={shirt} stroke={shade(shirt, -0.15)} strokeWidth="1" strokeLinejoin="round" />
          <path d="M84,157 L100,196 L94,200 L72,170 L80,166 L74,162Z" fill={lo} />
          <path d="M116,157 L100,196 L106,200 L128,170 L120,166 L126,162Z" fill={lo} />
        </g>
      );
    }
    case 'denim': {
      const den = '#557AB0';
      const denLo = shade(den, -0.22);
      return (
        <g>
          <path d={BODY(CREW)} fill={den} />
          <path d="M80,158 L100,206 L120,158 C114,154 86,154 80,158Z" fill={fill} />
          <path d="M86,155 C90,170 110,170 114,155" stroke={hi} strokeWidth="5" fill="none" />
          <path d="M80,158 L66,164 L76,176 L70,180 L96,206 L100,206Z" fill={denLo} />
          <path d="M120,158 L134,164 L124,176 L130,180 L104,206 L100,206Z" fill={denLo} />
          <path d="M44,182 C50,178 60,178 66,182 M134,182 C140,178 150,178 156,182" stroke="#E9B567" strokeWidth="1.2" fill="none" strokeDasharray="2 2" opacity="0.8" />
        </g>
      );
    }
  }
}

// ------------------------------------------------------------- the avatar --

function eyeShape(kind: BuilderParams['eyes'], side: 'l' | 'r', skin: string, uid: string) {
  const happy = kind === 'happy' || (kind === 'wink' && side === 'r');
  if (happy) return <path d="M71,99 Q80,89 89,99" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />;
  return (
    <g>
      <ellipse cx="80" cy="96" rx="9.4" ry="9.8" fill="#fff" />
      <circle cx="80.4" cy="97" r="7.4" fill={`url(#${uid}-iris)`} />
      <circle cx="80.4" cy="97" r="3.8" fill="#120B08" />
      <circle cx="83.2" cy="93.8" r="2.3" fill="#fff" />
      <circle cx="77.6" cy="99.6" r="1" fill="#fff" opacity="0.7" />
      {kind === 'sleepy' && <path d="M70,96 C70,84 90,84 90,96 C86,92 74,92 70,96Z" fill={shade(skin, -0.06)} />}
      <path
        d={kind === 'sleepy' ? 'M70.4,96 C74,92.6 86,92.6 89.6,96' : 'M70.6,95 C72,87 88,86.6 89.8,95'}
        stroke={INK}
        strokeWidth={kind === 'lashes' ? 2.8 : 2.2}
        fill="none"
        strokeLinecap="round"
      />
      {kind === 'lashes' && <path d="M71.2,92 L67.4,89.4 M73.6,89 L70.8,85.8" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />}
    </g>
  );
}

const BROW_PATH: Record<BuilderParams['brows'], string> = {
  natural: 'M69,84 C74,77.5 84,76.5 91,79.5 C91.6,81.2 90.6,82.4 89.4,82.2 C83,80.4 76,81.2 70.6,85.6Z',
  thick: 'M68,84.5 C73,76 84,74.5 92,78.5 C93,81.6 91.4,83.6 89.6,83.2 C83,81.2 76,82 70,86.8Z',
  arched: 'M69,85 C72,77 82,74 91,78.6 C91.4,80.4 90.4,81.4 89.2,81 C83,78.6 75.4,80 70.6,86.2Z',
  straight: 'M69,82.6 C75,80 84,79.6 91.4,80.6 C91.8,82.4 91,83.6 89.6,83.6 C83,83 76,83.2 70.2,84.8Z',
};

function Mouth({ kind, skin }: { kind: BuilderParams['mouth']; skin: string }) {
  const lip = mix(shade(skin, -0.45), '#B0424A', 0.45);
  switch (kind) {
    case 'smile':
      return (
        <g>
          <path d="M88,124 Q100,134.5 112,124" stroke={lip} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M95,132.4 Q100,134 105,132.4" stroke={shade(skin, -0.14)} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6" />
        </g>
      );
    case 'grin':
      return (
        <g>
          <path d="M86,122.5 Q100,125 114,122.5 Q112.5,139 100,139.5 Q87.5,139 86,122.5Z" fill="#5B1F22" />
          <path d="M88,123.4 Q100,125.6 112,123.4 L111.4,127.4 Q100,129.4 88.6,127.4Z" fill="#fff" />
          <ellipse cx="100" cy="135.4" rx="7.4" ry="3.6" fill="#E46A78" />
          <path d="M86,122.5 Q100,125 114,122.5" stroke={lip} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'smirk':
      return <path d="M89,127 Q101,131.5 112,121.6" stroke={lip} strokeWidth="3" fill="none" strokeLinecap="round" />;
    case 'neutral':
      return <path d="M91,127.4 Q100,129.2 109,127.4" stroke={lip} strokeWidth="3" fill="none" strokeLinecap="round" />;
    case 'wow':
      return (
        <g>
          <ellipse cx="100" cy="129" rx="5.6" ry="7" fill="#5B1F22" />
          <ellipse cx="100" cy="133" rx="3.6" ry="2.4" fill="#E46A78" />
        </g>
      );
  }
}

function FacialHair({ kind, c, face }: { kind: BuilderParams['facialHair']; c: string; face: FaceId }) {
  const chin = face === 'oval' ? 152 : face === 'square' ? 150 : 148;
  const beard = `M57,94 C57,122 72,${chin} 100,${chin + 1} C128,${chin} 143,122 143,94 C141,108 136,118 127,122 C119,124 112,117 100,117 C88,117 81,124 73,122 C64,118 59,108 57,94Z`;
  const mous = 'M85.6,120.4 C89,114.6 96,114.4 100,117 C104,114.4 111,114.6 114.4,120.4 C110,121.6 104,120.8 100,119.8 C96,120.8 90,121.6 85.6,120.4Z';
  switch (kind) {
    case 'none':
      return null;
    case 'stubble':
      return (
        <g opacity="0.2" fill={c}>
          <path d={beard} />
          <path d={mous} />
        </g>
      );
    case 'beard':
      return (
        <g>
          <path d={beard} fill={c} />
          <path d={mous} fill={shade(c, -0.15)} />
          <path d="M92,140 C96,142 104,142 108,140" stroke={shade(c, 0.25)} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6" />
        </g>
      );
    case 'moustache':
      return <path d={mous} fill={c} transform="translate(100 118) scale(1.12) translate(-100 -118)" />;
  }
}

function Glasses({ kind }: { kind: BuilderParams['glasses'] }) {
  if (kind === 'none') return null;
  const frame = '#1D1D1F';
  if (kind === 'sunglasses')
    return (
      <g>
        <path d="M64,88 L136,88" stroke={frame} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M65,88 L95,88 C95,100 92,108 80,108 C68,108 65,100 65,88Z" fill="#141416" />
        <path d="M105,88 L135,88 C135,100 132,108 120,108 C108,108 105,100 105,88Z" fill="#141416" />
        <path d="M70,92 L78,92 M110,92 L118,92" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.35" />
        <path d="M65,90 L57,94 M135,90 L143,94" stroke={frame} strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  const lens =
    kind === 'round' ? (
      <>
        <circle cx="80" cy="97" r="13" />
        <circle cx="120" cy="97" r="13" />
      </>
    ) : (
      <>
        <rect x="65.5" y="86" width="29" height="22" rx="6" />
        <rect x="105.5" y="86" width="29" height="22" rx="6" />
      </>
    );
  return (
    <g>
      <g fill="#fff" fillOpacity="0.14" stroke={frame} strokeWidth="3">
        {lens}
      </g>
      <path d="M93,95 Q100,91 107,95" stroke={frame} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M67,94 L57,92 M133,94 L143,92" stroke={frame} strokeWidth="2.8" strokeLinecap="round" />
    </g>
  );
}

function Headwear({ kind, c, hairBun }: { kind: BuilderParams['headwear']; c: string; hairBun: boolean }) {
  const lo = shade(c, -0.25);
  const hi = shade(c, luminance(c) > 0.6 ? -0.06 : 0.16);
  switch (kind) {
    case 'none':
      return null;
    case 'cap':
      return (
        <g>
          <path d="M52,74 C50,42 72,22 100,22 C128,22 150,42 148,74 C134,68 118,66 100,66 C82,66 66,68 52,74Z" fill={c} />
          <path d="M100,22 L100,66 M76,28 C72,40 70,54 70,68 M124,28 C128,40 130,54 130,68" stroke={lo} strokeWidth="1.4" fill="none" opacity="0.6" />
          <circle cx="100" cy="23" r="3" fill={lo} />
          <path d="M48,76 C64,64 136,64 152,76 C150,84 144,86 138,84 C122,78 78,78 62,84 C56,86 50,84 48,76Z" fill={hi} />
          <path d="M62,84 C78,78 122,78 138,84" stroke={lo} strokeWidth="1.4" fill="none" opacity="0.7" />
        </g>
      );
    case 'beanie':
      return (
        <g>
          <path d="M54,70 C52,36 74,20 100,20 C126,20 148,36 146,70Z" fill={c} />
          {[70, 80, 90, 100, 110, 120, 130].map((x) => (
            <path key={x} d={`M${x},${x === 100 ? 22 : 26} L${x + (x - 100) * 0.12},64`} stroke={lo} strokeWidth="1.2" opacity="0.4" />
          ))}
          <rect x="50" y="58" width="100" height="18" rx="9" fill={hi} />
          {[58, 66, 74, 82, 90, 98, 106, 114, 122, 130, 138].map((x) => (
            <path key={x} d={`M${x + 2},61 L${x + 2},73`} stroke={lo} strokeWidth="1.3" opacity="0.35" strokeLinecap="round" />
          ))}
          {!hairBun && <circle cx="100" cy="18" r="9" fill={hi} />}
        </g>
      );
    case 'headband':
      return <path d="M57,74 C62,46 80,36 100,36 C120,36 138,46 143,74 C138,56 122,46 100,46 C78,46 62,56 57,74Z" fill={c} />;
  }
}

export const BuilderSvg = memo(function BuilderSvg({
  p,
  className,
  crop = 'full',
}: {
  p: BuilderParams;
  className?: string;
  /** 'face' zooms into the face — used for eye/brow/mouth/glasses thumbnails. */
  crop?: 'full' | 'face';
}) {
  const uid = 'av' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const skin = colorOf(SKINS, p.skin);
  const hair = colorOf(HAIR_COLORS, p.hairColor);
  const iris = colorOf(EYE_COLORS, p.eyeColor);
  const cloth = colorOf(CLOTH_COLORS, p.clothingColor);
  const brow = p.hairColor === 'platinum' || p.hairColor === 'gray' ? shade(hair, -0.35) : shade(hair, -0.12);
  const hatOn = p.headwear === 'cap' || p.headwear === 'beanie';
  const hairFront = p.hair === 'bun' && p.headwear === 'beanie' ? 'ponytail' : p.hair;
  const skinDark = shade(skin, -0.16);

  const defs: ReactNode = (
    <defs>
      <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={shade(skin, 0.1)} />
        <stop offset="0.6" stopColor={skin} />
        <stop offset="1" stopColor={shade(skin, -0.07)} />
      </linearGradient>
      <radialGradient id={`${uid}-glow`} cx="0.4" cy="0.32" r="0.6">
        <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${uid}-blush`}>
        <stop offset="0" stopColor="#FF6B6B" stopOpacity="0.32" />
        <stop offset="1" stopColor="#FF6B6B" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${uid}-neck`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={shade(skin, -0.22)} />
        <stop offset="0.5" stopColor={skinDark} />
        <stop offset="1" stopColor={shade(skin, -0.08)} />
      </linearGradient>
      <linearGradient id={`${uid}-hair`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={shade(hair, 0.16)} />
        <stop offset="0.55" stopColor={hair} />
        <stop offset="1" stopColor={shade(hair, -0.18)} />
      </linearGradient>
      <linearGradient id={`${uid}-cloth`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={shade(cloth, luminance(cloth) > 0.7 ? 0 : 0.14)} />
        <stop offset="1" stopColor={shade(cloth, -0.14)} />
      </linearGradient>
      <radialGradient id={`${uid}-iris`} cx="0.5" cy="0.62" r="0.6">
        <stop offset="0" stopColor={shade(iris, 0.35)} />
        <stop offset="1" stopColor={shade(iris, -0.35)} />
      </radialGradient>
      <clipPath id={`${uid}-face`}>
        <path d={FACE_PATH[p.face]} />
      </clipPath>
    </defs>
  );

  return (
    <svg viewBox={crop === 'face' ? '50 54 100 100' : '0 0 200 200'} className={className} aria-hidden focusable="false" overflow="hidden">
      {defs}
      <g transform="translate(100 112) scale(1.07) translate(-100 -112)">
      <HairBack hair={hatOn && p.hair === 'bun' ? 'bald' : p.hair} c={hair} g={`${uid}-hair`} />
      {/* neck */}
      <path d="M84,124 L84,162 C90,170 110,170 116,162 L116,124Z" fill={`url(#${uid}-neck)`} />
      <Clothes p={p} c={cloth} g={`${uid}-cloth`} skin={skinDark} />
      {/* ears */}
      <g fill={skin}>
        <ellipse cx="57" cy="99" rx="8" ry="11" />
        <ellipse cx="143" cy="99" rx="8" ry="11" />
      </g>
      <path d="M55,94 C58,96 59,102 56,106 M145,94 C142,96 141,102 144,106" stroke={skinDark} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* head */}
      <path d={FACE_PATH[p.face]} fill={`url(#${uid}-skin)`} />
      <g clipPath={`url(#${uid}-face)`}>
        <ellipse cx="100" cy="66" rx="40" ry="30" fill={`url(#${uid}-glow)`} />
        <ellipse cx="76" cy="114" rx="11" ry="7" fill={`url(#${uid}-blush)`} />
        <ellipse cx="124" cy="114" rx="11" ry="7" fill={`url(#${uid}-blush)`} />
        <path d={`M56,120 C66,140 84,150 100,150 C116,150 134,140 144,120 L150,160 L50,160Z`} fill={skinDark} opacity="0.12" />
      </g>
      <FacialHair kind={p.facialHair} c={hair} face={p.face} />
      {/* eyes */}
      {eyeShape(p.eyes, 'l', skin, uid)}
      <g transform="translate(200 0) scale(-1 1)">{eyeShape(p.eyes, 'r', skin, uid)}</g>
      {/* brows */}
      <path d={BROW_PATH[p.brows]} fill={brow} />
      <path d={BROW_PATH[p.brows]} fill={brow} transform="translate(200 0) scale(-1 1)" />
      {/* nose */}
      <path d="M95.4,111.6 C97,115.2 103,115.2 104.6,111.6" stroke={shade(skin, -0.3)} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.55" />
      <ellipse cx="100" cy="106" rx="3" ry="4.4" fill="#fff" opacity="0.2" />
      <Mouth kind={p.mouth} skin={skin} />
      <HairFront hair={hairFront} c={hair} g={`${uid}-hair`} hat={hatOn} />
      <Headwear kind={p.headwear} c={p.headwear === 'headband' && p.clothingColor === 'black' ? '#F06292' : cloth} hairBun={p.hair === 'bun'} />
      <Glasses kind={p.glasses} />
      {p.earrings !== 'none' && (
        <g fill="none" stroke="#E7B84A" strokeWidth="2.4">
          {p.earrings === 'studs' ? (
            <>
              <circle cx="56" cy="110" r="2.4" fill="#F4CF63" stroke="none" />
              <circle cx="144" cy="110" r="2.4" fill="#F4CF63" stroke="none" />
            </>
          ) : (
            <>
              <circle cx="55.5" cy="116" r="6" />
              <circle cx="144.5" cy="116" r="6" />
            </>
          )}
        </g>
      )}
      </g>
    </svg>
  );
});
