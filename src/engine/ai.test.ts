import { describe, expect, it } from 'vitest';
import { alphaBeta, chooseMove, DIFFICULTIES } from './ai';
import { alphaBetaTree, buildTree, countNodes } from './eager';
import { isGameOver, legalMoves } from './rules';
import { randomPosition, seededRandom } from './testing';
import { AI, HUMAN, type GameState } from './types';

function positions(count: number, seed: number): GameState[] {
  const random = seededRandom(seed);
  const result: GameState[] = [];
  while (result.length < count) {
    const state = randomPosition(random, Math.floor(random() * 40));
    if (!isGameOver(state)) result.push(state);
  }
  return result;
}

describe('lazy alpha-beta', () => {
  it('returns the same score and move as building the full tree first', () => {
    for (const depth of [1, 2, 3, 4, 5]) {
      for (const state of positions(40, depth)) {
        const lazy = alphaBeta(state, depth, -Infinity, Infinity);
        const eager = alphaBetaTree(buildTree(state, depth), -Infinity, Infinity);
        expect(lazy).toEqual(eager);
      }
    }
  });

  it('generates fewer positions than the full tree at depth 6', () => {
    for (const state of positions(5, 99)) {
      const stats = { nodes: 0 };
      alphaBeta(state, 6, -Infinity, Infinity, stats);
      expect(stats.nodes).toBeLessThan(countNodes(buildTree(state, 6)));
    }
  });

  it('takes an immediate capture when it is clearly best', () => {
    const state: GameState = {
      pits: [
        [8, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1],
      ],
      wallets: [0, 0],
      turn: AI,
    };
    // AI pit 3 sows into pit 2; pit 1 is empty, so the AI captures the 8 shells in pit 0.
    // Pit 0 instead spreads its shells around the board and captures nothing.
    expect(alphaBeta(state, 1, -Infinity, Infinity)).toEqual([8, 3]);
  });

  it('scores a finished position by giving each side its remaining shells', () => {
    const state: GameState = {
      pits: [
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 10],
      ],
      wallets: [40, 34],
      turn: AI,
    };
    expect(alphaBeta(state, 6, -Infinity, Infinity)).toEqual([40 - 44, -1]);
  });

  it('works for the human (minimising) side too', () => {
    for (const state of positions(20, 5).filter((s) => s.turn === HUMAN)) {
      const [, move] = alphaBeta(state, 3, -Infinity, Infinity);
      expect(legalMoves(state)).toContain(move);
    }
  });
});

describe('chooseMove', () => {
  it('always returns a legal move at every difficulty', () => {
    for (const difficulty of Object.keys(DIFFICULTIES) as (keyof typeof DIFFICULTIES)[]) {
      for (const state of positions(10, 3).map((s) => ({ ...s, turn: AI }))) {
        if (legalMoves(state).length === 0) continue;
        const decision = chooseMove(state, difficulty, seededRandom(1));
        expect(legalMoves(state)).toContain(decision.move);
        expect(decision.nodes).toBeGreaterThan(0);
      }
    }
  });

  it('plays the best move on hard', () => {
    for (const state of positions(10, 11).map((s) => ({ ...s, turn: AI }))) {
      if (legalMoves(state).length === 0) continue;
      const [, best] = alphaBeta(state, DIFFICULTIES.hard.depth, -Infinity, Infinity);
      expect(chooseMove(state, 'hard').move).toBe(best);
    }
  });
});
