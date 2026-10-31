/** 0 = AI (top row), 1 = human (bottom row). A player's index is also their row on the board. */
export type Player = 0 | 1;

export const AI: Player = 0;
export const HUMAN: Player = 1;

export const PITS_PER_ROW = 7;
export const INITIAL_SHELLS = 6;
export const TOTAL_SHELLS = 2 * PITS_PER_ROW * INITIAL_SHELLS; // 84
/** Capturing more than half of all shells guarantees the win. */
export const WIN_THRESHOLD = TOTAL_SHELLS / 2; // 42

/** pits[row][col]; row 0 is the AI's side, row 1 is the human's. */
export type Pits = number[][];

export interface GameState {
  pits: Pits;
  /** Captured shells, indexed by Player: wallets[AI], wallets[HUMAN]. */
  wallets: [number, number];
  turn: Player;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

/** One frame of a move, recorded so the UI can animate the sowing. */
export interface Step {
  kind: 'pickup' | 'sow' | 'stop' | 'capture';
  row: number;
  col: number;
  /** Shells still in hand after this step. */
  hand: number;
  pits: Pits;
  wallets: [number, number];
}
