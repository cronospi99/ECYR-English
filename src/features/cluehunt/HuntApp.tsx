import { Navigate, Route, Routes } from 'react-router-dom';
import { packSlugs } from '@/lib/clueHunt/packs';
import { HuntJoin, HuntLocal, HuntPlay } from './Client';
import HuntHub, { HuntBingo } from './Hub';
import HostRoute from './Host';
import Posters from './Posters';
import { TeacherOnly } from './TeacherOnly';

/* Clue hunts (generic engine; each event is a JSON pack in src/content/clue-hunts):
   /hunt/:pack            hub (teacher): Treasure & Clue Hunt (QR) or the Bingo, support links, pending items
   /hunt/:pack/host       projector (teacher)         /hunt/:pack/print   printable posters (teacher)
   /hunt/:pack/bingo      the Bingo full screen (teacher)
   /hunt/join[/:code]     public: join with a code    /hunt/play/:code    the phone's game
   /hunt/local/:pack      public: play on this device (no room) */
export default function HuntApp() {
  return (
    <Routes>
      <Route index element={<Navigate to={`/hunt/${packSlugs()[0] ?? 'diwali'}`} replace />} />
      <Route path="join" element={<HuntJoin />} />
      <Route path="join/:code" element={<HuntJoin />} />
      <Route path="play/:code" element={<HuntPlay />} />
      <Route path="local/:pack" element={<HuntLocal />} />
      <Route path=":pack" element={<TeacherOnly><HuntHub /></TeacherOnly>} />
      <Route path=":pack/host" element={<TeacherOnly><HostRoute /></TeacherOnly>} />
      <Route path=":pack/print" element={<TeacherOnly><Posters /></TeacherOnly>} />
      <Route path=":pack/bingo" element={<TeacherOnly><HuntBingo /></TeacherOnly>} />
      <Route path="*" element={<Navigate to="/hunt" replace />} />
    </Routes>
  );
}
