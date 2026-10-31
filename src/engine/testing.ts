import { applyMove, initialState, isGameOver, legalMoves } from './rules';
import type { GameState } from './types';

/** Small seeded PRNG (mulberry32) so test and benchmark positions are reproducible. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Plays up to `plies` random moves from the start, stopping early if the game ends. */
export function randomPosition(random: () => number, plies: number): GameState {
  let state = initialState();
  for (let i = 0; i < plies && !isGameOver(state); i++) {
    const moves = legalMoves(state);
    state = applyMove(state, moves[Math.floor(random() * moves.length)]).state;
  }
  return state;
}
