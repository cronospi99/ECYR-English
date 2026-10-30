// CONTRACT (implemented by the cards/Impostor work): card ranks and game points.
// Every player can use all characters; each character card ranks up with the
// points its player earns in Class Wars or Impostor.
export type CardRank = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface Award {
  /** ECYR account of the student (null = guest: shown on the podium, not saved). */
  userId: string | null;
  /** Character played (TEACHERS[].id). */
  cardId: string;
  points: number;
}

/** Point thresholds per rank (bronze from 0). */
export const RANK_AT: Record<CardRank, number> = { bronze: 0, silver: 20, gold: 60, diamond: 150 };

export function rankOf(points: number): CardRank {
  return points >= RANK_AT.diamond ? 'diamond' : points >= RANK_AT.gold ? 'gold' : points >= RANK_AT.silver ? 'silver' : 'bronze';
}

/** Called once by the host (teacher) when a match ends. Stub until implemented. */
export async function awardGamePoints(_game: 'classwars' | 'impostor', _matchId: string, _awards: Award[]): Promise<void> {}
