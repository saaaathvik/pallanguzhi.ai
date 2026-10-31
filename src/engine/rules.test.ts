import { describe, expect, it } from 'vitest';
import { applyMove, finalize, initialState, isGameOver, legalMoves, nextPit, winner } from './rules';
import { seededRandom } from './testing';
import { AI, HUMAN, TOTAL_SHELLS, type GameState } from './types';

const total = (state: GameState) => state.pits.flat().reduce((a, b) => a + b, 0) + state.wallets[0] + state.wallets[1];

describe('nextPit', () => {
  it('visits all 14 pits once before returning to the start', () => {
    const seen = new Set<string>();
    let pos: [number, number] = [1, 0];
    for (let i = 0; i < 14; i++) {
      seen.add(pos.join(','));
      pos = nextPit(...pos);
    }
    expect(seen.size).toBe(14);
    expect(pos).toEqual([1, 0]);
  });

  it('runs left to right on the human row and right to left on the AI row', () => {
    expect(nextPit(1, 2)).toEqual([1, 3]);
    expect(nextPit(1, 6)).toEqual([0, 6]);
    expect(nextPit(0, 3)).toEqual([0, 2]);
    expect(nextPit(0, 0)).toEqual([1, 0]);
  });
});

describe('applyMove', () => {
  it('sows, continues from non-empty pits, and captures after the empty pit', () => {
    const state: GameState = {
      pits: [
        [0, 0, 0, 0, 0, 0, 0],
        [2, 0, 0, 5, 0, 0, 0],
      ],
      wallets: [0, 0],
      turn: HUMAN,
    };
    // Pit 0 sows into pits 1 and 2; pit 3 has shells, so they are picked up and sown into 4, 5, 6 and the
    // AI's pits 6 and 5. The pit after that (AI pit 4) is empty, so the move stops and AI pit 3 is captured (0).
    const { state: after, captured } = applyMove(state, 0);
    expect(after.pits).toEqual([
      [0, 0, 0, 0, 0, 1, 1],
      [0, 1, 1, 0, 1, 1, 1],
    ]);
    expect(captured).toBe(0);
    expect(after.turn).toBe(AI);
  });

  it('captures the shells in the pit after the empty one', () => {
    const state: GameState = {
      pits: [
        [0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 7, 0, 0, 0],
      ],
      wallets: [0, 0],
      turn: HUMAN,
    };
    // Pit 0 sows one shell into pit 1. Pit 2 is empty, so the human captures pit 3 (7 shells).
    const { state: after, captured } = applyMove(state, 0);
    expect(captured).toBe(7);
    expect(after.wallets).toEqual([0, 7]);
    expect(after.pits[HUMAN]).toEqual([0, 1, 0, 0, 0, 0, 0]);
  });

  it('rejects empty pits and out-of-range holes', () => {
    const state = initialState();
    expect(() => applyMove(state, 7)).toThrow();
    expect(() => applyMove({ ...state, pits: [state.pits[0], [0, 6, 6, 6, 6, 6, 6]] }, 0)).toThrow();
  });

  it('does not mutate the input state', () => {
    const state = initialState();
    const copy = JSON.parse(JSON.stringify(state));
    applyMove(state, 3);
    expect(state).toEqual(copy);
  });

  it('records animation steps that end with the final position', () => {
    const { state, steps } = applyMove(initialState(), 2, true);
    expect(steps[0]).toMatchObject({ kind: 'pickup', row: HUMAN, col: 2, hand: 6 });
    expect(steps.at(-1)!.kind).toBe('capture');
    expect(steps.at(-1)!.pits).toEqual(state.pits);
    expect(steps.at(-1)!.wallets).toEqual(state.wallets);
  });

  it('conserves all 84 shells across thousands of random moves', () => {
    const random = seededRandom(7);
    for (let game = 0; game < 300; game++) {
      let state = initialState();
      while (!isGameOver(state)) {
        const moves = legalMoves(state);
        const mover = state.turn;
        state = applyMove(state, moves[Math.floor(random() * moves.length)]).state;
        expect(total(state)).toBe(TOTAL_SHELLS);
        expect(state.turn).toBe(1 - mover);
      }
      expect(total(finalize(state))).toBe(TOTAL_SHELLS);
    }
  });
});

describe('game end', () => {
  it('ends when the player to move has no shells, and each side keeps its own shells', () => {
    const state: GameState = {
      pits: [
        [0, 0, 0, 0, 0, 0, 0],
        [3, 0, 0, 0, 0, 0, 2],
      ],
      wallets: [40, 39],
      turn: AI,
    };
    expect(isGameOver(state)).toBe(true);
    const final = finalize(state);
    expect(final.wallets).toEqual([40, 44]);
    expect(winner(final)).toBe(HUMAN);
  });

  it('ends as soon as someone has more than 42', () => {
    const state: GameState = { ...initialState(), wallets: [43, 0] };
    expect(isGameOver(state)).toBe(true);
    expect(isGameOver({ ...initialState(), wallets: [42, 0] })).toBe(false);
  });

  it('reports a draw on equal scores', () => {
    expect(winner({ ...initialState(), wallets: [42, 42] })).toBe('draw');
  });
});
